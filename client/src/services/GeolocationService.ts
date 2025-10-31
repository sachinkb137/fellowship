import { District } from '../types';
import { fetchWithRetry } from '../lib/fetchWithRetry';

export class GeolocationService {
  private static instance: GeolocationService;
  private permissionStatus: PermissionStatus | null = null;
  private lastLocation: GeolocationCoordinates | null = null;

  static getInstance(): GeolocationService {
    if (!GeolocationService.instance) {
      GeolocationService.instance = new GeolocationService();
    }
    return GeolocationService.instance;
  }

  /**
   * Check if geolocation is supported
   */
  isSupported(): boolean {
    return !!navigator.geolocation;
  }

  /**
   * Check current permission status
   */
  async checkPermission(): Promise<'granted' | 'denied' | 'prompt' | 'unavailable'> {
    if (!this.isSupported()) return 'unavailable';

    try {
      const permissions = await navigator.permissions?.query({ name: 'geolocation' });
      if (permissions) {
        this.permissionStatus = permissions;
        return permissions.state as 'granted' | 'denied' | 'prompt';
      }
    } catch (err) {
      console.warn('Permission API not available');
    }

    return 'prompt';
  }

  /**
   * Get current position with timeout
   */
  async getCurrentPosition(timeoutMs: number = 10000): Promise<GeolocationCoordinates> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Geolocation timeout'));
      }, timeoutMs);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeout);
          this.lastLocation = position.coords;
          resolve(position.coords);
        },
        (error) => {
          clearTimeout(timeout);
          reject(error);
        },
        {
          enableHighAccuracy: false, // Don't drain battery
          timeout: timeoutMs - 1000,
          maximumAge: 5 * 60 * 1000 // Accept cached position up to 5 minutes old
        }
      );
    });
  }

  /**
   * Detect district based on user's location
   */
  async detectDistrict(): Promise<District | null> {
    try {
      const coords = await this.getCurrentPosition();
      const response = await fetchWithRetry(
        `/api/v1/districts/nearby?lat=${coords.latitude}&lon=${coords.longitude}`,
        {},
        3,
        300
      );

      if (!response.ok) return null;

      const district = await response.json();
      return district && district.id ? district : null;
    } catch (err) {
      console.warn('District detection failed:', err);
      return null;
    }
  }

  /**
   * Detect multiple nearby districts
   */
  async detectNearbyDistricts(radiusKm: number = 50): Promise<District[]> {
    try {
      const coords = await this.getCurrentPosition();
      const response = await fetchWithRetry(
        `/api/v1/districts/nearby-multiple?lat=${coords.latitude}&lon=${coords.longitude}&radius=${radiusKm}`,
        {},
        3,
        300
      );

      if (!response.ok) return [];
      return await response.json();
    } catch (err) {
      console.warn('Nearby districts detection failed:', err);
      return [];
    }
  }

  /**
   * Get last detected location
   */
  getLastLocation(): GeolocationCoordinates | null {
    return this.lastLocation;
  }

  /**
   * Watch user's position (for real-time tracking if needed)
   */
  watchPosition(
    onSuccess: (coords: GeolocationCoordinates) => void,
    onError: (error: GeolocationPositionError) => void
  ): number {
    if (!this.isSupported()) {
      // Create a custom error object with GeolocationPositionError interface
      const error = {
        code: 1,
        message: 'Geolocation not supported',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      } as GeolocationPositionError;
      onError(error);
      return 0;
    }

    return navigator.geolocation.watchPosition(
      (position) => {
        this.lastLocation = position.coords;
        onSuccess(position.coords);
      },
      onError,
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  }

  /**
   * Stop watching position
   */
  clearWatch(watchId: number): void {
    navigator.geolocation.clearWatch(watchId);
  }
}

export const geolocationService = GeolocationService.getInstance();