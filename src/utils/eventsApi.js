/**
 * eventsApi.js - RobotEvents API v2 Client Service
 * 
 * Provides authenticated, cached, rate-limit resilient access to RobotEvents API v2
 * via local Vite dev proxy and Vercel Serverless Function (production).
 * 
 * Features:
 * - Base URL: /api/robotevents
 * - In-memory caching with configurable TTL (default 30s)
 * - Inflight request coalescing (prevents duplicate parallel fetches)
 * - Exponential backoff retry on HTTP 429, 5xx, timeouts, and network glitches
 * - Abort timeout (default 10s) with external AbortSignal integration
 * - Specialized methods for VIQRC Level Up (Season 203, Program 41)
 */

export const ROBOTEVENTS_BASE_URL = '/api/robotevents';
export const DEFAULT_PROGRAM_ID = 41; // VIQRC
export const DEFAULT_SEASON_ID = 203;  // Level Up (2026-2027)

/**
 * Custom error class wrapping API and network failures
 */
export class ApiError extends Error {
  constructor(message, status = 0, data = null, endpoint = '') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.endpoint = endpoint;
  }

  isRateLimited() {
    return this.status === 429;
  }

  isNotFound() {
    return this.status === 404;
  }

  isTimeout() {
    return this.status === 408;
  }

  isNetworkError() {
    return this.status === 0;
  }
}

// In-memory cache store: Map<cacheKey, { data, timestamp, ttl }>
export const apiCache = new Map();

// Inflight requests store: Map<cacheKey, Promise<any>>
export const inflightRequests = new Map();

/**
 * Clear the entire in-memory cache and inflight requests
 */
export function clearCache() {
  apiCache.clear();
  inflightRequests.clear();
}

/**
 * Invalidate cached entries matching a prefix or pattern
 * @param {string} [pattern] - Substring to match in cache keys (omitted clears all)
 */
export function invalidateCache(pattern) {
  if (!pattern) {
    clearCache();
    return;
  }
  for (const key of apiCache.keys()) {
    if (key.includes(pattern)) {
      apiCache.delete(key);
    }
  }
}

/**
 * Get internal cache and inflight statistics (useful for diagnostics and testing)
 */
export function getCacheStats() {
  return {
    cacheSize: apiCache.size,
    inflightCount: inflightRequests.size,
    keys: Array.from(apiCache.keys())
  };
}

/**
 * Known array parameters that must use bracket notation in RobotEvents API
 */
const ARRAY_PARAMS = new Set(['program', 'season', 'level', 'sku', 'country', 'number', 'id']);

/**
 * Serialize query parameters with array bracket support and deterministic key sorting
 * @param {Object} params 
 * @returns {string} Encoded query string without leading '?'
 */
export function serializeParams(params) {
  if (!params || typeof params !== 'object') return '';
  const searchParams = new URLSearchParams();
  const sortedKeys = Object.keys(params).sort();

  for (const key of sortedKeys) {
    const value = params[key];
    if (value === undefined || value === null || value === '') continue;

    if (Array.isArray(value)) {
      const paramKey = key.endsWith('[]') ? key : `${key}[]`;
      value.forEach(item => {
        if (item !== undefined && item !== null && item !== '') {
          searchParams.append(paramKey, String(item));
        }
      });
    } else if (ARRAY_PARAMS.has(key) && !key.endsWith('[]')) {
      searchParams.append(`${key}[]`, String(value));
    } else {
      searchParams.append(key, String(value));
    }
  }

  return searchParams.toString();
}

/**
 * Sleep helper respecting AbortSignal
 * @param {number} ms 
 * @param {AbortSignal} [signal] 
 */
function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new ApiError('Request aborted by caller', 0, null, ''));
    }
    const timer = setTimeout(resolve, ms);
    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new ApiError('Request aborted by caller', 0, null, ''));
      }, { once: true });
    }
  });
}

/**
 * Execute HTTP fetch with exponential backoff retry and timeout
 */
async function executeWithRetry(url, endpoint, {
  timeoutMs = 10000,
  retries = 3,
  retryDelay = 1000,
  signal = null
} = {}) {
  let attempt = 0;

  while (attempt <= retries) {
    if (signal?.aborted) {
      throw new ApiError('Request aborted by caller', 0, null, endpoint);
    }

    const controller = new AbortController();
    const onParentAbort = () => controller.abort();
    if (signal) {
      signal.addEventListener('abort', onParentAbort, { once: true });
    }

    let timeoutTriggered = false;
    const timeoutId = setTimeout(() => {
      timeoutTriggered = true;
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      if (signal) {
        signal.removeEventListener('abort', onParentAbort);
      }

      if (response.ok) {
        return await response.json();
      }

      const status = response.status;
      let errorData = null;
      try {
        errorData = await response.json();
      } catch {
        try {
          errorData = await response.text();
        } catch {
          errorData = null;
        }
      }

      const errorMessage = (errorData && typeof errorData === 'object' && (errorData.message || errorData.error))
        ? (errorData.message || errorData.error)
        : `HTTP ${status}: ${response.statusText || 'Error fetching RobotEvents data'}`;

      // 429 and 500-504 are transient and retryable
      const isRetryable = status === 429 || (status >= 500 && status <= 504);
      if (!isRetryable || attempt === retries) {
        throw new ApiError(errorMessage, status, errorData, endpoint);
      }

      // Calculate retry delay with jitter and Retry-After header support
      let delay = retryDelay * Math.pow(2, attempt) + Math.random() * 300;
      if (status === 429) {
        const retryAfter = response.headers?.get?.('retry-after');
        if (retryAfter) {
          const parsedSec = parseInt(retryAfter, 10);
          if (!isNaN(parsedSec) && parsedSec > 0) {
            delay = Math.min(parsedSec * 1000, 15000);
          }
        }
      }

      attempt++;
      await sleep(delay, signal);

    } catch (err) {
      clearTimeout(timeoutId);
      if (signal) {
        signal.removeEventListener('abort', onParentAbort);
      }

      if (err instanceof ApiError) {
        throw err;
      }

      if (signal?.aborted) {
        throw new ApiError('Request aborted by caller', 0, null, endpoint);
      }

      if (timeoutTriggered) {
        if (attempt === retries) {
          throw new ApiError(`Request timeout of ${timeoutMs}ms exceeded for ${endpoint}`, 408, null, endpoint);
        }
      } else {
        if (attempt === retries) {
          throw new ApiError(err.message || 'Network error fetching RobotEvents data', 0, null, endpoint);
        }
      }

      const delay = retryDelay * Math.pow(2, attempt) + Math.random() * 300;
      attempt++;
      await sleep(delay, signal);
    }
  }
}

/**
 * Internal core fetch helper with in-memory caching and inflight coalescing
 * 
 * @param {string} endpoint - API path, e.g. '/events' or '/events/12345'
 * @param {Object} [params={}] - Query parameters
 * @param {Object|number} [options={}] - Options object or ttlMs number
 * @returns {Promise<any>}
 */
export async function fetchWithCache(endpoint, params = {}, options = {}) {
  let ttlMs = 30000;
  let timeoutMs = 10000;
  let forceRefresh = false;
  let retries = 3;
  let retryDelay = 1000;
  let signal = null;

  if (typeof options === 'number') {
    ttlMs = options;
  } else if (typeof options === 'object' && options !== null) {
    if (options.ttlMs !== undefined) ttlMs = options.ttlMs;
    if (options.timeoutMs !== undefined) timeoutMs = options.timeoutMs;
    if (options.forceRefresh !== undefined) forceRefresh = options.forceRefresh;
    if (options.retries !== undefined) retries = options.retries;
    if (options.retryDelay !== undefined) retryDelay = options.retryDelay;
    if (options.signal !== undefined) signal = options.signal;
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const queryString = serializeParams(params);
  const cacheKey = queryString ? `${cleanEndpoint}?${queryString}` : cleanEndpoint;

  // 1. Check in-memory cache
  if (!forceRefresh && ttlMs > 0) {
    const cachedEntry = apiCache.get(cacheKey);
    if (cachedEntry) {
      const isFresh = (Date.now() - cachedEntry.timestamp) < cachedEntry.ttl;
      if (isFresh) {
        return cachedEntry.data;
      }
      apiCache.delete(cacheKey);
    }
  }

  // 2. Check inflight duplicate requests
  if (inflightRequests.has(cacheKey)) {
    return inflightRequests.get(cacheKey);
  }

  // 3. Dispatch network request with coalescing
  const fullUrl = `${ROBOTEVENTS_BASE_URL}${cleanEndpoint}${queryString ? `?${queryString}` : ''}`;
  
  const requestPromise = (async () => {
    try {
      const data = await executeWithRetry(fullUrl, cleanEndpoint, {
        timeoutMs,
        retries,
        retryDelay,
        signal
      });

      if (ttlMs > 0) {
        apiCache.set(cacheKey, {
          data,
          timestamp: Date.now(),
          ttl: ttlMs
        });
      }

      return data;
    } finally {
      inflightRequests.delete(cacheKey);
    }
  })();

  inflightRequests.set(cacheKey, requestPromise);
  return requestPromise;
}

// =========================================================================
// High-Level RobotEvents Endpoints
// =========================================================================

/**
 * Fetch list of events with filters (defaults to VIQRC Level Up)
 */
export async function getEvents({
  program = [DEFAULT_PROGRAM_ID],
  season = [DEFAULT_SEASON_ID],
  country,
  region,
  start,
  end,
  page = 1,
  per_page = 25,
  sku,
  ...rest
} = {}, options = {}) {
  const queryParams = {
    program,
    season,
    page,
    per_page,
    ...rest
  };
  if (country) queryParams.country = country;
  if (region) queryParams.region = region;
  if (start) queryParams.start = start;
  if (end) queryParams.end = end;
  if (sku) queryParams.sku = sku;

  return fetchWithCache('/events', queryParams, options);
}

/**
 * Fetch metadata for a single event
 */
export async function getEvent(eventId, options = {}) {
  if (!eventId) throw new ApiError('Event ID is required', 400, null, '/events');
  return fetchWithCache(`/events/${eventId}`, {}, options);
}

/**
 * Fetch divisions for an event (extracted from event metadata and sorted by order)
 */
export async function getEventDivisions(eventId, options = {}) {
  if (!eventId) throw new ApiError('Event ID is required', 400, null, '/events');
  const event = await getEvent(eventId, options);
  const divisions = event?.divisions || event?.data?.divisions || [];
  return Array.isArray(divisions)
    ? [...divisions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [];
}

/**
 * Fetch matches schedule and results for an event division
 */
export async function getEventMatches(eventId, divisionId, { page = 1, per_page = 250, ...params } = {}, options = {}) {
  if (!eventId) throw new ApiError('Event ID is required', 400, null, '/events');
  if (!divisionId) throw new ApiError('Division ID is required', 400, null, `/events/${eventId}/divisions`);

  return fetchWithCache(`/events/${eventId}/divisions/${divisionId}/matches`, {
    page,
    per_page,
    ...params
  }, options);
}

/**
 * Fetch qualification rankings for an event division
 */
export async function getEventRankings(eventId, divisionId, { page = 1, per_page = 250, ...params } = {}, options = {}) {
  if (!eventId) throw new ApiError('Event ID is required', 400, null, '/events');
  if (!divisionId) throw new ApiError('Division ID is required', 400, null, `/events/${eventId}/divisions`);

  return fetchWithCache(`/events/${eventId}/divisions/${divisionId}/rankings`, {
    page,
    per_page,
    ...params
  }, options);
}

/**
 * Fetch skills challenge standings for an event
 */
export async function getEventSkills(eventId, { page = 1, per_page = 250, ...params } = {}, options = {}) {
  if (!eventId) throw new ApiError('Event ID is required', 400, null, '/events');

  return fetchWithCache(`/events/${eventId}/skills`, {
    page,
    per_page,
    ...params
  }, options);
}

/**
 * Fetch awards list for an event
 */
export async function getEventAwards(eventId, options = {}) {
  if (!eventId) throw new ApiError('Event ID is required', 400, null, '/events');

  return fetchWithCache(`/events/${eventId}/awards`, {}, options);
}

/**
 * Fetch registered teams list for an event
 */
export async function getEventTeams(eventId, { page = 1, per_page = 250, ...params } = {}, options = {}) {
  if (!eventId) throw new ApiError('Event ID is required', 400, null, '/events');

  return fetchWithCache(`/events/${eventId}/teams`, {
    page,
    per_page,
    ...params
  }, options);
}

/**
 * Fetch team profile by either team number (e.g. "79813J") or numeric internal ID
 */
export async function getTeam(teamNumberOrId, options = {}) {
  if (!teamNumberOrId) throw new ApiError('Team identifier is required', 400, null, '/teams');

  const strIdentifier = String(teamNumberOrId).trim();

  // If contains letters, it is definitely a team number
  if (/[a-zA-Z]/.test(strIdentifier)) {
    const res = await fetchWithCache('/teams', {
      number: strIdentifier,
      program: options.program || DEFAULT_PROGRAM_ID
    }, options);
    return res?.data?.[0] || null;
  }

  // Numeric: try by ID first, fall back to number search
  try {
    const res = await fetchWithCache(`/teams/${strIdentifier}`, {}, options);
    return res?.data || res;
  } catch (err) {
    if (err.status === 404) {
      const searchRes = await fetchWithCache('/teams', {
        number: strIdentifier,
        program: options.program || DEFAULT_PROGRAM_ID
      }, options);
      return searchRes?.data?.[0] || null;
    }
    throw err;
  }
}

/**
 * Fetch match history for a team
 */
export async function getTeamMatches(teamId, params = {}, options = {}) {
  if (!teamId) throw new ApiError('Team ID is required', 400, null, '/teams');
  return fetchWithCache(`/teams/${teamId}/matches`, params, options);
}

/**
 * Fetch skills records for a team
 */
export async function getTeamSkills(teamId, seasonId = DEFAULT_SEASON_ID, options = {}) {
  if (!teamId) throw new ApiError('Team ID is required', 400, null, '/teams');
  const params = {};
  if (seasonId) params.season = seasonId;
  return fetchWithCache(`/teams/${teamId}/skills`, params, options);
}

/**
 * Fetch rankings records for a team
 */
export async function getTeamRankings(teamId, seasonId = DEFAULT_SEASON_ID, options = {}) {
  if (!teamId) throw new ApiError('Team ID is required', 400, null, '/teams');
  const params = {};
  if (seasonId) params.season = seasonId;
  return fetchWithCache(`/teams/${teamId}/rankings`, params, options);
}

/**
 * Fetch active and upcoming events in Vietnam (convenience helper for Vietnam auto-pull)
 */
export async function getActiveVietnamEvents(options = {}) {
  try {
    const res = await getEvents({
      program: [DEFAULT_PROGRAM_ID],
      season: [DEFAULT_SEASON_ID],
      region: 'Vietnam',
      per_page: 50
    }, options);

    const now = new Date();
    const bufferMs = 12 * 60 * 60 * 1000; // 12h buffer

    const activeEvents = (res?.data || []).filter(event => {
      if (event.ongoing) return true;
      if (!event.start || !event.end) return false;
      const startDate = new Date(event.start);
      const endDate = new Date(event.end);
      return (now.getTime() >= startDate.getTime() - bufferMs) &&
             (now.getTime() <= endDate.getTime() + bufferMs);
    });

    return {
      allVietnamEvents: res?.data || [],
      activeEvents,
      meta: res?.meta || null
    };
  } catch (err) {
    console.warn('[eventsApi] Failed to fetch Vietnam events:', err.message);
    return { allVietnamEvents: [], activeEvents: [], meta: null };
  }
}

/**
 * Fetch global season skills standings (useful for World Skills Simulator)
 */
export async function getSeasonSkills(seasonId = DEFAULT_SEASON_ID, params = {}, options = {}) {
  return fetchWithCache(`/seasons/${seasonId}/skills`, params, options);
}
