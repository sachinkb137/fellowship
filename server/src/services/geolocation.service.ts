import Database from '../db';
import RedisClient from '../db/redis';
import { District } from '../types';

const CACHE_TTL = 86400; // 24 hours

export class GeolocationService {
  private redisClient: any = null;

  async initialize() {
    this.redisClient = await RedisClient.getInstance();
  }

  /**
   * Find nearest district by coordinates with caching
   * Uses simple Haversine distance calculation
   */
  async findNearestDistrict(lat: number, lon: number): Promise<District | null> {
    if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
      throw new Error('Invalid coordinates');
    }

    // Validate coordinate ranges
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw new Error('Coordinates out of range');
    }

    // Try cache first
    const cacheKey = `geoloc:${Math.round(lat * 100) / 100}:${Math.round(lon * 100) / 100}`;
    const cached = await this.redisClient?.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get all districts with centroids
    const result = await Database.query(`
      SELECT 
        id, state_code, district_code, name_en, name_local, 
        centroid_lat, centroid_lon
      FROM districts 
      WHERE centroid_lat IS NOT NULL 
      AND centroid_lon IS NOT NULL
      ORDER BY 
        (centroid_lat - $1) * (centroid_lat - $1) + 
        (centroid_lon - $2) * (centroid_lon - $2)
      LIMIT 1
    `, [lat, lon]);

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    const district = this.mapRowToDistrict(result.rows[0]);

    // Cache the result
    await this.redisClient?.setex(cacheKey, CACHE_TTL, JSON.stringify(district));

    return district;
  }

  /**
   * Find nearby districts within a radius (in km)
   */
  async findNearbyDistricts(lat: number, lon: number, radiusKm: number = 50): Promise<District[]> {
    const result = await Database.query(`
      SELECT 
        id, state_code, district_code, name_en, name_local, 
        centroid_lat, centroid_lon,
        -- Haversine distance formula
        (
          6371 * 2 * ASIN(
            SQRT(
              POWER(SIN(RADIANS((centroid_lat - $1) / 2)), 2) +
              COS(RADIANS($1)) * COS(RADIANS(centroid_lat)) *
              POWER(SIN(RADIANS((centroid_lon - $2) / 2)), 2)
            )
          )
        ) as distance_km
      FROM districts 
      WHERE centroid_lat IS NOT NULL 
      AND centroid_lon IS NOT NULL
      HAVING (
        6371 * 2 * ASIN(
          SQRT(
            POWER(SIN(RADIANS((centroid_lat - $1) / 2)), 2) +
            COS(RADIANS($1)) * COS(RADIANS(centroid_lat)) *
            POWER(SIN(RADIANS((centroid_lon - $2) / 2)), 2)
          )
        )
      ) <= $3
      ORDER BY distance_km ASC
    `, [lat, lon, radiusKm]);

    return result.rows.map(row => this.mapRowToDistrict(row));
  }

  private mapRowToDistrict(row: any): District {
    return {
      id: row.id,
      state_code: row.state_code,
      district_code: row.district_code,
      name_en: row.name_en,
      name_local: row.name_local,
      centroid_lat: parseFloat(row.centroid_lat),
      centroid_lon: parseFloat(row.centroid_lon)
    };
  }
}