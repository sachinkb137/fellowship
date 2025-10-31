/**
 * Fetch wrapper with automatic retry and exponential backoff.
 * @param url The URL to fetch
 * @param options Fetch API options
 * @param attempts Number of attempts before giving up
 * @param backoff Delay (ms) multiplier for retries
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  attempts: number = 3,
  backoff: number = 300
): Promise<Response> {
  let lastErr: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        // Force an error to trigger retry
        throw new Error(`HTTP ${res.status} - ${res.statusText}`);
      }
      return res; // ✅ success
    } catch (err) {
      lastErr = err;
      console.warn(`Fetch attempt ${i + 1} failed:`, err);

      if (i < attempts - 1) {
        // wait before next attempt (progressively longer)
        const delay = backoff * Math.pow(2, i);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // All attempts failed
  throw lastErr instanceof Error
    ? lastErr
    : new Error("Failed to fetch after retries");
}
