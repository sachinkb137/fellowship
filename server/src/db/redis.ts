import Redis from 'ioredis';
import { config } from 'dotenv';

config();

class RedisClient {
  private static instance: Redis | null = null;
  private static mockClient: any = null;

  static async getInstance(): Promise<Redis | any> {
    if (process.env.NODE_ENV === 'test' || process.env.REDIS_MOCK === 'true') {
      return this.getMockClient();
    }

    if (!this.instance) {
      try {
        this.instance = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          retryStrategy: (times: number) => {
            if (times > 3) {
              console.log('Redis connection failed, falling back to no cache');
              return null;
            }
            return Math.min(times * 1000, 3000);
          },
          maxRetriesPerRequest: 3,
        });

        this.instance.on('error', (err) => {
          console.log('Redis connection error:', err);
          if (this.instance) {
            this.instance.disconnect();
            this.instance = null;
          }
        });

        this.instance.on('connect', () => {
          console.log('Redis connected successfully');
        });
      } catch (error) {
        console.error('Redis connection failed:', error);
        return this.getMockClient();
      }
    }

    return this.instance || this.getMockClient();
  }

  private static getMockClient() {
    if (!this.mockClient) {
      const store = new Map();
      this.mockClient = {
        get: async (key: string) => store.get(key),
        set: async (key: string, value: string) => store.set(key, value),
        setex: async (key: string, seconds: number, value: string) => {
          store.set(key, value);
          setTimeout(() => store.delete(key), seconds * 1000);
          return 'OK';
        },
        del: async (key: string) => store.delete(key),
      };
    }
    return this.mockClient;
  }
}

export default RedisClient;