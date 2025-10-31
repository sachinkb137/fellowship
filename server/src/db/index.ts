import { Pool } from 'pg';
import { config } from 'dotenv';

config();

class Database {
  private static instance: Pool | null = null;

  static async getInstance(): Promise<Pool> {
    if (!this.instance) {
      this.instance = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false // Required for Neon DB
        },
      });

      // Test the connection
      try {
        const client = await this.instance.connect();
        console.log('Database connected successfully');
        client.release();
      } catch (error) {
        console.error('Database connection error:', error);
        this.instance = null;
        throw error;
      }

      this.instance.on('error', (err) => {
        console.error('Unexpected database error:', err);
        this.instance = null;
      });
    }

    return this.instance;
  }

  static async query(text: string, params?: any[]) {
    const pool = await this.getInstance();
    try {
      return await pool.query(text, params);
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  }
}

export default Database;