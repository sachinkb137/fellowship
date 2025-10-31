require('dotenv').config({ path: './server/.env' });
const axios = require('axios');

async function testAPI() {
  try {
    // Start backend server in background (requires server to be running separately)
    console.log('Testing API endpoints...\n');

    // Test 1: Get all districts
    console.log('1️⃣ GET /api/v1/districts');
    const districtsRes = await axios.get('http://localhost:3000/api/v1/districts', { timeout: 5000 }).catch(() => null);
    
    if (!districtsRes) {
      console.log('❌ Cannot connect to backend. Make sure to run: npm run dev:server\n');
      process.exit(1);
    }

    console.log(`✓ Found ${districtsRes.data.length} districts`);
    console.log(`  Example: ${districtsRes.data[0].name_en} (ID: ${districtsRes.data[0].id})\n`);

    // Test 2: Get district summary
    const districtId = districtsRes.data[0].id;
    console.log(`2️⃣ GET /api/v1/districts/${districtId}/summary`);
    const summaryRes = await axios.get(`http://localhost:3000/api/v1/districts/${districtId}/summary`, { timeout: 5000 });
    
    const summary = summaryRes.data;
    console.log(`✓ Got summary for ${summary.district.name_en}`);
    console.log(`  currentStats: ${summary.currentStats ? '✓ Present' : '✗ Missing'}`);
    console.log(`  trends: ${summary.trends ? '✓ Present' : '✗ Missing'}`);
    console.log(`  stateComparison: ${summary.stateComparison ? '✓ Present' : '✗ Missing'}`);
    console.log(`  timeSeries: ${summary.timeSeries ? `✓ Present (${summary.timeSeries.length} months)` : '✗ Missing'}`);
    console.log(`  comparisons: ${summary.comparisons ? `✓ Present (${summary.comparisons.length} items)` : '✗ Missing'}`);

    if (summary.currentStats) {
      console.log(`\n  Current Stats:`);
      console.log(`    Workers: ${summary.currentStats.workers_count}`);
      console.log(`    Wages: ₹${summary.currentStats.total_wages}`);
      console.log(`    Jobs: ${summary.currentStats.jobs_created}`);
    } else {
      console.log('\n✗ ERROR: currentStats is null/undefined!');
    }

    console.log('\n✅ API is working correctly!\n');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

testAPI();