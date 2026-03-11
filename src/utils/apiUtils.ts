
/**
 * Executes a function with exponential backoff.
 * @param fn The function to execute.
 * @param maxRetries Maximum number of retries.
 * @param initialDelay Initial delay in milliseconds.
 */
export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let retries = 0;
  
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      retries++;
      
      // Don't retry if we've reached the limit or if it's a 4xx error (except 429)
      const status = error.response?.status;
      const isRateLimit = status === 429;
      const isServerError = status >= 500;
      const isNetworkError = !status; // No status usually means network error
      
      if (retries > maxRetries || (!isRateLimit && !isServerError && !isNetworkError)) {
        throw error;
      }
      
      const delay = initialDelay * Math.pow(2, retries - 1);
      console.log(`Attempt ${retries} failed. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
