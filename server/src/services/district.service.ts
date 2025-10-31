import Database from '../db';
import RedisClient from '../db/redis';
import { District, MonthlyStat, DistrictSummary } from '../types';

const CACHE_TTL = parseInt(process.env.CACHE_TTL || '86400');
let redisClient: any = null;

// Initialize Redis client
(async () => {
  redisClient = await RedisClient.getInstance();
})();

export class DistrictService {
  async getDistricts(): Promise<District[]> {
    const cacheKey = 'districts:all';
    const cached = await redisClient?.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const result = await Database.query('SELECT * FROM districts ORDER BY state_code, name_en');
    const districts = result.rows;
    
    await redisClient?.setex(cacheKey, CACHE_TTL, JSON.stringify(districts));
    return districts;
  }

  async getDistrictSummary(districtId: number, month?: string): Promise<DistrictSummary> {
    const cacheKey = `district:${districtId}:summary:${month || 'current'}`;
    const cached = await redisClient?.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const district = await this.getDistrictById(districtId);
    const currentStats = await this.getCurrentStats(districtId, month);
    const trends = await this.calculateTrends(districtId);
    const stateComparison = await this.getStateComparison(districtId, district.state_code);
    const timeSeries = await this.getTimeSeries(districtId, 12);
    const comparisons = this.generateComparisons(currentStats, stateComparison);

    const summary: DistrictSummary = {
      district,
      currentStats,
      trends,
      stateComparison,
      timeSeries,
      comparisons
    };

    await redisClient?.setex(cacheKey, CACHE_TTL, JSON.stringify(summary));
    return summary;
  }

  private async getDistrictById(id: number): Promise<District> {
    const result = await Database.query('SELECT * FROM districts WHERE id = $1', [id]);
    return result.rows[0];
  }

  private async getCurrentStats(districtId: number, month?: string): Promise<MonthlyStat> {
    const query = `
      SELECT * FROM monthly_stats 
      WHERE district_id = $1 
      ${month ? 'AND year_month = $2' : ''} 
      ORDER BY year_month DESC 
      LIMIT 1
    `;
    
    const params = month ? [districtId, month] : [districtId];
    const result = await Database.query(query, params);
    return result.rows[0];
  }

  private async calculateTrends(districtId: number) {
    const query = `
      SELECT * FROM monthly_stats 
      WHERE district_id = $1 
      ORDER BY year_month DESC 
      LIMIT 6
    `;
    
    const result = await Database.query(query, [districtId]);
    const stats = result.rows;

    return {
      workers: this.getTrend(stats.map(s => s.workers_count)),
      wages: this.getTrend(stats.map(s => s.total_wages)),
      jobs: this.getTrend(stats.map(s => s.jobs_created))
    };
  }

  private async getStateComparison(districtId: number, stateCode: string) {
    const query = `
      WITH district_stats AS (
        SELECT * FROM monthly_stats 
        WHERE district_id = $1 
        ORDER BY year_month DESC 
        LIMIT 1
      ),
      state_averages AS (
        SELECT 
          AVG(ms.workers_count) as avg_workers,
          AVG(ms.total_wages) as avg_wages,
          AVG(ms.jobs_created) as avg_jobs
        FROM monthly_stats ms
        JOIN districts d ON d.id = ms.district_id
        WHERE d.state_code = $2
        AND ms.year_month = (
          SELECT year_month FROM district_stats
        )
      )
      SELECT 
        d.workers_count > s.avg_workers as workers_above,
        d.total_wages > s.avg_wages as wages_above,
        d.jobs_created > s.avg_jobs as jobs_above
      FROM district_stats d
      CROSS JOIN state_averages s
    `;
    
    const result = await Database.query(query, [districtId, stateCode]);
    const comparison = result.rows[0];

    if (!comparison) {
      // No comparable state averages available, return 'equal' as safe default
      return {
        workers: 'equal',
        wages: 'equal',
        jobs: 'equal'
      } as { workers: 'above' | 'below' | 'equal'; wages: 'above' | 'below' | 'equal'; jobs: 'above' | 'below' | 'equal' };
    }

    return {
      workers: (comparison.workers_above ? 'above' : 'below') as 'above' | 'below' | 'equal',
      wages: (comparison.wages_above ? 'above' : 'below') as 'above' | 'below' | 'equal',
      jobs: (comparison.jobs_above ? 'above' : 'below') as 'above' | 'below' | 'equal'
    };
  }

  async getDistrictHistory(districtId: number, months: number = 12): Promise<MonthlyStat[]> {
    const query = `
      SELECT * FROM monthly_stats
      WHERE district_id = $1
      ORDER BY year_month DESC
      LIMIT $2
    `;
    
    const result = await Database.query(query, [districtId, months]);
    return result.rows.reverse();
  }

  /**
   * Find nearest district by latitude/longitude using simple Haversine distance in JS.
   */
  async findNearestDistrict(lat: number, lon: number): Promise<District | null> {
    const result = await Database.query(`SELECT id, state_code, district_code, name_en, name_local, centroid_lat, centroid_lon FROM districts WHERE centroid_lat IS NOT NULL AND centroid_lon IS NOT NULL`);
    const rows = result.rows as Array<any>;
    if (!rows || rows.length === 0) return null;

    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371; // km
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    let best: any = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const r of rows) {
      const d = haversine(lat, lon, parseFloat(r.centroid_lat), parseFloat(r.centroid_lon));
      if (d < bestDist) {
        bestDist = d;
        best = r;
      }
    }

    if (!best) return null;
    return {
      id: best.id,
      state_code: best.state_code,
      district_code: best.district_code,
      name_en: best.name_en,
      name_local: best.name_local,
      centroid_lat: parseFloat(best.centroid_lat),
      centroid_lon: parseFloat(best.centroid_lon)
    } as District;
  }

  private getTrend(values: number[]): 'up' | 'down' | 'stable' {
    if (values.length < 2) return 'stable';
    
    const recent = values[0];
    const previous = values[1];
    const change = ((recent - previous) / previous) * 100;
    
    if (Math.abs(change) < 5) return 'stable';
    return change > 0 ? 'up' : 'down';
  }

  private async getTimeSeries(districtId: number, months: number = 12) {
    const query = `
      SELECT 
        TO_CHAR(year_month, 'YYYY-MM') as date,
        workers_count,
        total_wages,
        jobs_created
      FROM monthly_stats
      WHERE district_id = $1
      ORDER BY year_month DESC
      LIMIT $2
    `;

    const result = await Database.query(query, [districtId, months]);
    return result.rows.reverse();
  }

  private generateComparisons(
    currentStats: MonthlyStat | undefined,
    stateComparison: any
  ): Array<{ label: string; value: string | number; note?: string }> {
    if (!currentStats) return [];

    return [
      {
        label: '👥 Workers vs State Avg',
        value: stateComparison.workers === 'above' ? '↑ Above' : stateComparison.workers === 'below' ? '↓ Below' : '→ Equal',
        note: 'State Average'
      },
      {
        label: '💰 Wages vs State Avg',
        value: stateComparison.wages === 'above' ? '↑ Above' : stateComparison.wages === 'below' ? '↓ Below' : '→ Equal',
        note: 'State Average'
      },
      {
        label: '🛠 Jobs vs State Avg',
        value: stateComparison.jobs === 'above' ? '↑ Above' : stateComparison.jobs === 'below' ? '↓ Below' : '→ Equal',
        note: 'State Average'
      }
    ];
  }
}