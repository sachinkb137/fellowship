import AWS from 'aws-sdk';
import axios from 'axios';
import db from '../db';
import { config } from 'dotenv';

config();

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

export class ETLService {
  private readonly bucket = process.env.S3_BUCKET || '';

  async runETL(): Promise<void> {
    try {
      const districts = await this.fetchDistricts();
      await this.processDistricts(districts);
    } catch (error) {
      this.logError('ETL Failed', error);
      throw error;
    }
  }

  private async fetchDistricts() {
    const result = await db.query('SELECT * FROM districts');
    return result.rows;
  }

  private async processDistricts(districts: any[]) {
    for (const district of districts) {
      try {
        const data = await this.fetchDistrictData(district);
        await this.saveRawData(district, data);
        await this.processAndSaveStats(district, data);
      } catch (error) {
        this.logError(`Failed processing district ${district.id}`, error);
      }
    }
  }

  private async fetchDistrictData(district: any) {
    const url = this.buildApiUrl(district);
    const response = await axios.get(url);
    
    await db.query(
      'INSERT INTO fetch_logs (source_url, status_code, response_size) VALUES ($1, $2, $3)',
      [url, response.status, JSON.stringify(response.data).length]
    );

    return response.data;
  }

  private async saveRawData(district: any, data: any) {
    const key = `raw/${district.state_code}/${district.district_code}/${new Date().toISOString()}.json`;
    
    await s3.putObject({
      Bucket: this.bucket,
      Key: key,
      Body: JSON.stringify(data),
      ContentType: 'application/json'
    }).promise();

    return key;
  }

  private async processAndSaveStats(district: any, data: any) {
    const stats = this.transformData(data);
    
    const query = `
      INSERT INTO monthly_stats 
      (district_id, year_month, workers_count, person_days, total_wages, pending_payments, jobs_created, raw_json_path)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (district_id, year_month) 
      DO UPDATE SET
        workers_count = EXCLUDED.workers_count,
        person_days = EXCLUDED.person_days,
        total_wages = EXCLUDED.total_wages,
        pending_payments = EXCLUDED.pending_payments,
        jobs_created = EXCLUDED.jobs_created,
        raw_json_path = EXCLUDED.raw_json_path,
        updated_at = CURRENT_TIMESTAMP
    `;

    await db.query(query, [
      district.id,
      stats.yearMonth,
      stats.workersCount,
      stats.personDays,
      stats.totalWages,
      stats.pendingPayments,
      stats.jobsCreated,
      stats.rawJsonPath
    ]);
  }

  private transformData(data: any) {
    // Transform API data to our schema
    // This would need to be customized based on the actual data.gov.in API response format
    return {
      yearMonth: new Date(), // Parse from data
      workersCount: 0, // Extract from data
      personDays: 0,
      totalWages: 0,
      pendingPayments: 0,
      jobsCreated: 0,
      rawJsonPath: ''
    };
  }

  private buildApiUrl(district: any): string {
    // Build the data.gov.in API URL based on district codes
    return `https://api.data.gov.in/mgnrega/${district.state_code}/${district.district_code}`;
  }

  private logError(message: string, error: any) {
    console.error(message, error);
    db.query(
      'INSERT INTO fetch_logs (source_url, status_code, error_message) VALUES ($1, $2, $3)',
      ['ETL_ERROR', 500, `${message}: ${error.message}`]
    );
  }
}