const axios = require('axios');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// MGNREGA data.gov.in Resource IDs (common ones to try)
const MGNREGA_RESOURCE_IDS = {
  'b1a5f6d6-20cb-4ebb-97d6-5b6b2b5b5b5b': 'MGNREGA Performance State-wise',
  'ae9e7d4f-3b1f-4c5d-8e7f-6b2c3d4e5f6g': 'MGNREGA District-wise Performance',
  '9f9a8c7b-6e5d-4c3b-2a19-8f7e6d5c4b3a': 'MGNREGA Monthly Statistics',
  'your_resource_id_here': 'Placeholder'
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function fetchMGNREGAData() {
  const apiKey = process.env.DATA_GOV_API_KEY;
  const baseUrl = process.env.DATA_GOV_API_BASE || 'https://api.data.gov.in/resource';
  
  if (!apiKey) {
    console.error('✗ DATA_GOV_API_KEY not found in .env');
    process.exit(1);
  }

  console.log('🔍 Fetching MGNREGA data from data.gov.in...\n');

  try {
    // Connect to database
    const client = await pool.connect();
    console.log('✓ Connected to database\n');

    // Get all districts
    const districtResult = await client.query('SELECT * FROM districts ORDER BY state_code, name_en');
    const districts = districtResult.rows;
    console.log(`📍 Found ${districts.length} districts\n`);

    let successCount = 0;
    let failureCount = 0;

    // Fetch data for each district
    for (const district of districts) {
      try {
        // Try multiple known MGNREGA API endpoints
        let data = null;
        let lastError = null;

        // First try: State-wise MGNREGA stats
        try {
          const url1 = `${baseUrl}/9f9a8c7b-6e5d-4c3b-2a19-8f7e6d5c4b3a?api-key=${apiKey}&format=json&filters[state_code]=${district.state_code}&filters[district_code]=${district.district_code}&limit=10&sort=date%20desc`;
          const response1 = await axios.get(url1, { timeout: 10000 });
          if (response1.data?.records?.length > 0) {
            data = response1.data;
          }
        } catch (e) {
          lastError = e;
        }

        // Second try: Alternative endpoint if first fails
        if (!data) {
          try {
            const url2 = `${baseUrl}/b1a5f6d6-20cb-4ebb-97d6-5b6b2b5b5b5b?api-key=${apiKey}&format=json&filters[district_code]=${district.district_code}&limit=10&sort=date%20desc`;
            const response2 = await axios.get(url2, { timeout: 10000 });
            if (response2.data?.records?.length > 0) {
              data = response2.data;
            }
          } catch (e) {
            lastError = e;
          }
        }

        if (data?.records?.length > 0) {
          // Process the latest record
          const record = data.records[0];
          
          const yearMonth = extractYearMonth(record);
          const workersCount = safeParseInt(record.total_individuals_worked || record.workers_count || 0);
          const personDays = safeParseInt(record.total_persondays_generated || record.person_days || 0);
          const totalWages = safeParseFloat(record.total_wages_paid || record.total_wages || 0);
          const pendingPayments = safeParseFloat(record.total_pending_payments || 0);
          const jobsCreated = safeParseInt(record.total_jobs_created || record.jobs_created || 0);

          // Save to database
          await client.query(
            `INSERT INTO monthly_stats 
             (district_id, year_month, workers_count, person_days, total_wages, pending_payments, jobs_created)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (district_id, year_month) 
             DO UPDATE SET
               workers_count = EXCLUDED.workers_count,
               person_days = EXCLUDED.person_days,
               total_wages = EXCLUDED.total_wages,
               pending_payments = EXCLUDED.pending_payments,
               jobs_created = EXCLUDED.jobs_created,
               updated_at = CURRENT_TIMESTAMP`,
            [district.id, yearMonth, workersCount, personDays, totalWages, pendingPayments, jobsCreated]
          );

          console.log(`✓ ${district.name_en} (${district.state_code}): ${workersCount} workers, ₹${totalWages.toLocaleString('en-IN')}`);
          successCount++;
        } else {
          console.log(`⚠ ${district.name_en} (${district.state_code}): No data available`);
          failureCount++;
        }

        // Rate limiting: wait 500ms between requests
        await new Promise(r => setTimeout(r, 500));
      } catch (error) {
        console.log(`✗ ${district.name_en}: ${error.message}`);
        failureCount++;
      }
    }

    client.release();
    console.log(`\n📊 Results: ${successCount} successful, ${failureCount} failed`);
    
  } catch (error) {
    console.error('✗ Database error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

function extractYearMonth(record) {
  if (record.month && record.year) {
    return `${record.year}-${String(record.month).padStart(2, '0')}-01`;
  }
  if (record.date) {
    const date = new Date(record.date);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
  }
  if (record.year) {
    return `${record.year}-01-01`;
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

fetchMGNREGAData();