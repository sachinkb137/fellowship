const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function initDatabase() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            mode: 'require',
            rejectUnauthorized: true
        }
    });

    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('Connected successfully.');

        // Drop existing tables in reverse order of dependencies
        console.log('Dropping existing tables...');
        await client.query(`
            DROP TABLE IF EXISTS fetch_logs CASCADE;
            DROP TABLE IF EXISTS aggregates CASCADE;
            DROP TABLE IF EXISTS monthly_stats CASCADE;
            DROP TABLE IF EXISTS districts CASCADE;
        `);
        console.log('Existing tables dropped.');

        // Read and execute schema
        console.log('Creating tables...');
        const schemaSQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        await client.query(schemaSQL);
        console.log('Schema created successfully.');

        // Read and execute sample data
        console.log('Loading sample data...');
        const sampleDataSQL = fs.readFileSync(path.join(__dirname, 'sample-data.sql'), 'utf8');
        await client.query(sampleDataSQL);
        console.log('Sample data loaded successfully.');

    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

initDatabase();