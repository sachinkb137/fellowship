import Redis from 'ioredis';
import { config } from 'dotenv';

config();

class RedisClient {
  private static instance: Redis | null = null;
  private static mockClient: any = null;

  static async getInstance(): Promise<Redis | any> {
    // 🧪 Local dev or test mode → use in-memory mock
    if (process.env.NODE_ENV === 'test' || process.env.REDIS_MOCK === 'true') {
      console.log('⚙️ Using mock Redis (in-memory)');
      return this.getMockClient();
    }

    // 🟢 Already connected
    if (this.instance) return this.instance;

    try {
      const redisUrl = process.env.REDIS_URL;

      if (!redisUrl) {
        console.warn('⚠️ REDIS_URL not found — using mock Redis');
        return this.getMockClient();
      }

      console.log(`🔗 Connecting to Redis: ${redisUrl}`);

      // ✅ Create Redis connection directly from the URL
      this.instance = new Redis(redisUrl, {
        // Enable TLS if using rediss://
        tls: redisUrl.startsWith('rediss://') ? {} : undefined,
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => {
          if (times > 3) {
            console.log('⚠️ Redis connection failed — fallback to mock cache');
            return null;
          }
          return Math.min(times * 1000, 3000);
        },
      });

      this.instance.on('connect', () => {
        console.log('✅ Connected to Redis (Upstash)');
      });

      this.instance.on('error', (err) => {
        console.error('❌ Redis connection error:', err);
      });

      return this.instance;
    } catch (error) {
      console.error('❌ Redis connection failed — using mock instead:', error);
      return this.getMockClient();
    }
  }

  // Simple mock for dev/testing
  private static getMockClient() {
    if (!this.mockClient) {
      console.log('⚙️ Initialized in-memory Redis mock');
      const store = new Map<string, string>();
      this.mockClient = {
        get: async (key: string) => store.get(key),
        set: async (key: string, value: string) => {
          store.set(key, value);
          return 'OK';
        },
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
