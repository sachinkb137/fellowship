const fs = require('fs');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

async function initializeDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Read schema file
    const schemaSQL = fs.readFileSync('./server/src/db/schema.sql', 'utf8');
    console.log('Creating schema...');
    await pool.query(schemaSQL);
    console.log('Schema created successfully');

    // Read and execute sample data
    const sampleDataSQL = fs.readFileSync('./server/src/db/sample-data.sql', 'utf8');
    console.log('Inserting sample data...');
    await pool.query(sampleDataSQL);
    console.log('Sample data inserted successfully');

    console.log('Database initialization complete!');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await pool.end();
  }
}

initializeDatabase();