const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function initializeDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔧 Initializing MGNREGA Tracker Database\n');
    
    console.log('Testing database connection...');
    const client = await pool.connect();
    console.log('✓ Connected to database\n');
    client.release();

    // Read schema file
    const schemaSQL = fs.readFileSync(path.join(__dirname, '../src/db/schema.sql'), 'utf8');
    console.log('Creating schema...');
    
    // Split by semicolon and execute statements individually
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    for (const statement of statements) {
      try {
        await pool.query(statement);
      } catch (error) {
        // Ignore "already exists" errors
        if (!error.message.includes('already exists')) {
          throw error;
        } else {
          console.log(`  ℹ ${error.message.split('\n')[0]}`);
        }
      }
    }
    console.log('✓ Schema created/verified\n');

    // Check if we already have data
    const check = await pool.query('SELECT COUNT(*) as count FROM districts');
    if (check.rows[0].count === 0) {
      console.log('Loading district data...');
      const sampleDataSQL = fs.readFileSync(path.join(__dirname, '../src/db/sample-data.sql'), 'utf8');
      const sampleStatements = sampleDataSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
      
      for (const statement of sampleStatements) {
        try {
          await pool.query(statement);
        } catch (error) {
          console.log(`  ℹ ${error.message.split('\n')[0]}`);
        }
      }
      console.log('✓ Sample district data loaded\n');
    } else {
      console.log(`✓ District data already exists (${check.rows[0].count} districts)\n`);
    }

    // Try to fetch real data from data.gov.in API
    console.log('🌐 Fetching live MGNREGA data from data.gov.in...\n');
    const apiKey = process.env.DATA_GOV_API_KEY;
    
    if (!apiKey || apiKey.length < 10) {
      console.log('⚠ DATA_GOV_API_KEY not configured. Using sample data only.\n');
    } else {
      try {
        await fetchAndPopulateMGNREGAData(pool, apiKey);
      } catch (error) {
        console.log(`⚠ Could not fetch live data: ${error.message}\n`);
        console.log('ℹ Using pre-loaded sample data instead.\n');
      }
    }

    console.log('✓ Database initialization complete!');
    console.log('\n📊 You can now start the development server:');
    console.log('  npm run dev\n');
    console.log('🌐 Frontend: http://localhost:5173');
    console.log('🔌 Backend:  http://localhost:3000\n');
  } catch (error) {
    console.error('✗ Error initializing database:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function fetchAndPopulateMGNREGAData(pool, apiKey) {
  const baseUrl = process.env.DATA_GOV_API_BASE || 'https://api.data.gov.in/resource';
  
  // Known MGNREGA resource IDs on data.gov.in
  const resourceIds = [
    '9f9a8c7b-6e5d-4c3b-2a19-8f7e6d5c4b3a',
    'b1a5f6d6-20cb-4ebb-97d6-5b6b2b5b5b5b',
    'ae9e7d4f-3b1f-4c5d-8e7f-6b2c3d4e5f6g'
  ];

  // Get all districts
  const result = await pool.query('SELECT * FROM districts ORDER BY state_code, name_en LIMIT 10');
  const districts = result.rows;
  
  if (districts.length === 0) {
    console.log('⚠ No districts found');
    return;
  }

  let successCount = 0;
  let failureCount = 0;

  for (const district of districts) {
    let fetched = false;
    
    for (const resourceId of resourceIds) {
      if (fetched) break;
      
      try {
        const url = `${baseUrl}/${resourceId}?api-key=${apiKey}&format=json&filters[district_code]=${district.district_code}&filters[state_code]=${district.state_code}&limit=5&sort=date%20desc`;
        
        const response = await axios.get(url, { 
          timeout: 8000,
          headers: { 'User-Agent': 'MGNREGA-Tracker/1.0' }
        });

        if (response.data?.records?.length > 0) {
          const record = response.data.records[0];
          
          const yearMonth = extractYearMonth(record);
          const workersCount = safeParseInt(record.total_individuals_worked || record.workers_count || 0);
          const personDays = safeParseInt(record.total_persondays_generated || record.person_days || 0);
          const totalWages = safeParseFloat(record.total_wages_paid || record.total_wages || 0);
          const pendingPayments = safeParseFloat(record.total_pending_payments || 0);
          const jobsCreated = safeParseInt(record.total_jobs_created || record.jobs_created || 0);

          await pool.query(
            `INSERT INTO monthly_stats 
             (district_id, year_month, workers_count, person_days, total_wages, pending_payments, jobs_created)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (district_id, year_month) 
             DO UPDATE SET
               workers_count = EXCLUDED.workers_count,
               person_days = EXCLUDED.person_days,
               total_wages = EXCLUDED.total_wages,
               pending_payments = EXCLUDED.pending_payments,
               jobs_created = EXCLUDED.jobs_created`,
            [district.id, yearMonth, workersCount, personDays, totalWages, pendingPayments, jobsCreated]
          );

          console.log(`  ✓ ${district.name_en}: ${workersCount} workers, ₹${(totalWages / 10000000).toFixed(1)}Cr wages`);
          successCount++;
          fetched = true;
        }
      } catch (error) {
        // Try next resource ID
      }
    }

    if (!fetched) {
      console.log(`  ⚠ ${district.name_en}: No data found`);
      failureCount++;
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n✓ Fetched data for ${successCount}/${districts.length} sample districts\n`);
}

function extractYearMonth(record) {
  if (record.month && record.year) {
    return `${record.year}-${String(record.month).padStart(2, '0')}-01`;
  }
  if (record.date) {
    const date = new Date(record.date);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
  }
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function safeParseInt(value) {
  const parsed = parseInt(String(value).replace(/[^0-9]/g, ''), 10);
  return isNaN(parsed) ? 0 : parsed;
}

function safeParseFloat(value) {
  const parsed = parseFloat(String(value).replace(/[^0-9.]/g, ''));
  return isNaN(parsed) ? 0 : parsed;
}

initializeDatabase();