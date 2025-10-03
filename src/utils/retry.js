const defaultOptions = {
  retries: 3,
  factor: 2,
  minTimeout: 1000,
  maxTimeout: 10_000,
  onRetry: null,
};

export async function withRetry(operation, options = {}) {
  const { retries, factor, minTimeout, maxTimeout, onRetry } = {
    ...defaultOptions,
    ...options,
  };

  let attempt = 0;
  let lastError;

  while (attempt <= retries) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      attempt += 1;

      if (attempt > retries) {
        break;
      }

      const delay = Math.min(minTimeout * factor ** (attempt - 1), maxTimeout);
      if (typeof onRetry === 'function') {
        try {
          onRetry({ error, attempt, delay });
        } catch (hookError) {
          console.warn('[withRetry] onRetry hook failed:', hookError);
        }
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
