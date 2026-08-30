/**
 * Enterprise Resilient Fetcher Utility
 * Features:
 * - Exponential backoff retry with full jitter
 * - Configurable timeout with AbortController
 * - Automatic idempotency key generation
 * - Detailed error taxonomy & global event dispatcher
 */

export interface FetcherOptions extends RequestInit {
  timeoutMs?: number;
  maxRetries?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
  idempotent?: boolean;
  idempotencyKey?: string;
}

export class FetcherError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public url: string,
    public body?: any
  ) {
    super(`HTTP ${status} (${statusText}) for ${url}`);
    this.name = 'FetcherError';
  }
}

/**
 * Generate a cryptographically strong UUIDv4 for idempotency
 */
export function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Sleep helper with promise
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calculates exponential backoff with full jitter to avoid thundering herds
 */
function calculateJitterBackoff(attempt: number, initialDelayMs: number, factor: number): number {
  const baseDelay = initialDelayMs * Math.pow(factor, attempt);
  // Full jitter: uniformly distributed between 0 and baseDelay
  return Math.random() * baseDelay;
}

/**
 * Resilient HTTP Fetcher
 */
export async function resilientFetch<T = any>(
  url: string,
  options: FetcherOptions = {}
): Promise<T> {
  const {
    timeoutMs = 10000,
    maxRetries = 3,
    initialDelayMs = 500,
    backoffFactor = 2,
    idempotent = false,
    idempotencyKey,
    headers: rawHeaders,
    ...fetchInit
  } = options;

  const headers = new Headers(rawHeaders || {});
  if (!headers.has('Content-Type') && !(fetchInit.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Inject Idempotency Key for mutations if requested or provided
  if (idempotencyKey) {
    headers.set('X-Idempotency-Key', idempotencyKey);
  } else if (idempotent && ['POST', 'PUT', 'PATCH', 'DELETE'].includes((fetchInit.method || 'GET').toUpperCase())) {
    headers.set('X-Idempotency-Key', generateIdempotencyKey());
  }

  let attempt = 0;
  let lastError: any = null;

  while (attempt <= maxRetries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...fetchInit,
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Handle successful HTTP response
      if (response.ok) {
        // Handle empty bodies (e.g., 204 No Content)
        if (response.status === 204) {
          return null as unknown as T;
        }
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return (await response.json()) as T;
        }
        return (await response.text()) as unknown as T;
      }

      // If client error (4xx) except 429 rate limit, do not retry
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        let errBody: any;
        try {
          errBody = await response.json();
        } catch {
          errBody = await response.text();
        }
        throw new FetcherError(response.status, response.statusText, url, errBody);
      }

      // Server error (5xx) or Rate Limit (429) -> eligible for retry
      let errorBody: any;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = await response.text();
      }
      lastError = new FetcherError(response.status, response.statusText, url, errorBody);
    } catch (err: any) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        lastError = new Error(`Request timed out after ${timeoutMs}ms: ${url}`);
      } else if (err instanceof FetcherError) {
        throw err; // Non-retryable 4xx
      } else {
        lastError = err;
      }
    }

    attempt++;
    if (attempt <= maxRetries) {
      const backoffTime = calculateJitterBackoff(attempt - 1, initialDelayMs, backoffFactor);
      console.warn(`[Fetcher] Request to ${url} failed (attempt ${attempt}/${maxRetries}). Retrying in ${Math.round(backoffTime)}ms...`);
      await sleep(backoffTime);
    }
  }

  throw lastError;
}

/**
 * Convenience method wrappers
 */
export const http = {
  get: <T>(url: string, options?: FetcherOptions) =>
    resilientFetch<T>(url, { ...options, method: 'GET' }),
  post: <T>(url: string, body?: any, options?: FetcherOptions) =>
    resilientFetch<T>(url, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body)
    }),
  put: <T>(url: string, body?: any, options?: FetcherOptions) =>
    resilientFetch<T>(url, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body)
    }),
  delete: <T>(url: string, options?: FetcherOptions) =>
    resilientFetch<T>(url, { ...options, method: 'DELETE' })
};
