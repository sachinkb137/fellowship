import axios, { AxiosError } from "axios";
import Database from "../db";
import { config } from "dotenv";
config();

interface ETLResult {
  success: number;
  failed: number;
  skipped: number;
  totalTime: number;
}

export class ETLService {
  private apiKey = process.env.DATA_GOV_API_KEY || "";
  private baseUrl = process.env.DATA_GOV_API_BASE || "https://api.data.gov.in/resource";
  private resourceId = process.env.DATA_GOV_MGNREGA_RESOURCE_ID || "";
  private maxRetries = 3;
  private retryDelay = 1000; // ms

  /**
   * Main ETL entry point with comprehensive error handling
   */
  async runETL(): Promise<ETLResult> {
    const startTime = Date.now();
    const result: ETLResult = { success: 0, failed: 0, skipped: 0, totalTime: 0 };

    try {
      const districts = await this.fetchDistricts();
      console.log(`[ETL] Starting ETL for ${districts.length} districts`);

      for (const district of districts) {
        try {
          // Check if data is recent (skip if updated within last 24 hours)
          const isRecent = await this.isDataRecent(district.id);
          if (isRecent) {
            result.skipped++;
            continue;
          }

          const data = await this.fetchDistrictData(district);
          if (data) {
            await this.processAndSaveStats(district, data);
            result.success++;
          } else {
            result.skipped++;
          }

          // Exponential backoff to avoid rate limiting
          await new Promise((r) => setTimeout(r, this.retryDelay));
        } catch (error: any) {
          result.failed++;
          await this.logError(`Failed processing ${district.name_en}`, error);
        }
      }

      result.totalTime = Date.now() - startTime;
      console.log(`[ETL] Completed: ${result.success} success, ${result.failed} failed, ${result.skipped} skipped in ${result.totalTime}ms`);
      return result;
    } catch (error: any) {
      result.totalTime = Date.now() - startTime;
      await this.logError("ETL job failed", error);
      throw error;
    }
  }

  private async fetchDistricts(): Promise<any[]> {
    const result = await Database.query("SELECT id, state_code, district_code, name_en FROM districts ORDER BY state_code, name_en");
    return result.rows;
  }

  /**
   * Check if district data was updated recently
   */
  private async isDataRecent(districtId: number, hoursThreshold: number = 24): Promise<boolean> {
    const result = await Database.query(
      `SELECT updated_at FROM monthly_stats 
       WHERE district_id = $1 
       ORDER BY updated_at DESC 
       LIMIT 1`,
      [districtId]
    );

    if (!result.rows.length) return false;

    const lastUpdate = new Date(result.rows[0].updated_at);
    const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);
    return hoursSinceUpdate < hoursThreshold;
  }

  /**
   * Fetch district-level data via data.gov.in API with retries
   */
  private async fetchDistrictData(district: any): Promise<any | null> {
    const url = this.buildApiUrl(district);
    let lastErr: any = null;

    for (let i = 0; i < this.maxRetries; i++) {
      try {
        const response = await axios.get(url, {
          timeout: 15000,
          headers: {
            'User-Agent': 'MGNREGA-Tracker/1.0'
          }
        });

        // Log successful fetch
        await Database.query(
          "INSERT INTO fetch_logs (source_url, status_code, response_size) VALUES ($1, $2, $3)",
          [url, response.status, JSON.stringify(response.data).length]
        );

        return response.data;
      } catch (err: any) {
        lastErr = err;
        const statusCode = err.response?.status;
        const message = err.message;

        console.warn(`[ETL] Fetch attempt ${i + 1}/${this.maxRetries} failed for ${district.name_en}: ${message}`);

        // Don't retry on 404 or 401
        if (statusCode === 404 || statusCode === 401) {
          break;
        }

        // Exponential backoff
        if (i < this.maxRetries - 1) {
          const delayMs = this.retryDelay * Math.pow(2, i);
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
    }

    // Log failure
    await this.logError(
      `Failed to fetch data for ${district.name_en} after ${this.maxRetries} attempts`,
      lastErr
    );

    return null; // Return null instead of throwing so we can continue with other districts
  }

  /**
   * Parse and insert stats into Postgres
   */
  private async processAndSaveStats(district: any, data: any): Promise<void> {
    const stats = this.transformData(data);

    const query = `
      INSERT INTO monthly_stats 
      (district_id, year_month, workers_count, person_days, total_wages, pending_payments, jobs_created)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (district_id, year_month) 
      DO UPDATE SET
        workers_count = EXCLUDED.workers_count,
        person_days = EXCLUDED.person_days,
        total_wages = EXCLUDED.total_wages,
        pending_payments = EXCLUDED.pending_payments,
        jobs_created = EXCLUDED.jobs_created,
        updated_at = CURRENT_TIMESTAMP
    `;

    await Database.query(query, [
      district.id,
      stats.yearMonth,
      stats.workersCount,
      stats.personDays,
      stats.totalWages,
      stats.pendingPayments,
      stats.jobsCreated,
    ]);
  }

  /**
   * Transform API JSON to DB schema format
   * Handles various MGNREGA API response formats
   */
  private transformData(data: any) {
    // Handle different API response structures
    const record = data?.records?.[0] || data || {};

    // Extract year and month
    const yearMonth = this.extractYearMonth(record);

    return {
      yearMonth,
      workersCount: this.safeParseInt(record.total_individuals_worked || record.workers_count || "0"),
      personDays: this.safeParseInt(record.total_persondays_generated || record.person_days || "0"),
      totalWages: this.safeParseFloat(record.total_wages_paid || record.total_wages || "0"),
      pendingPayments: this.safeParseFloat(record.total_pending_payments || record.pending_payments || "0"),
      jobsCreated: this.safeParseInt(record.total_jobs_created || record.jobs_created || "0"),
    };
  }

  private extractYearMonth(record: any): string {
    // Try to extract year and month from various possible fields
    if (record.month && record.year) {
      return `${record.year}-${String(record.month).padStart(2, "0")}-01`;
    }
    if (record.date) {
      return record.date.split('T')[0]; // ISO date format
    }
    // Fallback to current month
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  }

  private safeParseInt(value: any): number {
    const parsed = parseInt(String(value).replace(/[^0-9]/g, ''), 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  private safeParseFloat(value: any): number {
    const parsed = parseFloat(String(value).replace(/[^0-9.]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Build MGNREGA Open API URL using API key
   */
  private buildApiUrl(district: any): string {
    if (!this.apiKey || !this.resourceId) {
      throw new Error('Missing DATA_GOV_API_KEY or DATA_GOV_MGNREGA_RESOURCE_ID');
    }

    const params = new URLSearchParams({
      "api-key": this.apiKey,
      format: "json",
      limit: "10",
      filters: `district_code:${district.district_code}`,
      sort: "date DESC"
    });

    return `${this.baseUrl}/${this.resourceId}?${params.toString()}`;
  }

  /**
   * Log errors to console and DB
   */
  private async logError(message: string, error: any): Promise<void> {
    const errorMessage = error?.message || error?.response?.statusText || String(error);
    console.error(`[ETL] ${message}:`, errorMessage);

    try {
      await Database.query(
        "INSERT INTO fetch_logs (source_url, status_code, error_message) VALUES ($1, $2, $3)",
        ["ETL_SERVICE", error?.response?.status || 500, message]
      );
    } catch (logErr) {
      console.error('[ETL] Failed to log error:', logErr);
    }
  }
}
