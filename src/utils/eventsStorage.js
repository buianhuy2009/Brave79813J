/**
 * src/utils/eventsStorage.js
 * 
 * LocalStorage persistence manager for VEX IQ Live Events:
 * - Favorites: { events: string[], teams: string[] }
 * - Queue Alerts: { teamNumber: string, matchesAhead: number, enabled: boolean }
 * 
 * Features:
 * - Hardened with in-memory fallbacks for private browsing (SecurityError) & quota limits (QuotaExceededError)
 * - Safe JSON parsing with automatic data sanitization & schema validation
 * - Case normalization (team numbers uppercase) and array deduplication
 * - Cross-tab and same-tab reactive event notifications ('vexiq_events_storage_change')
 * - Safe for SSR / Node test environments
 */

export const STORAGE_KEY_FAVORITES = 'vexiq_live_favorites';
export const STORAGE_KEY_QUEUE_ALERTS = 'vexiq_live_queue_alerts';
export const STORAGE_EVENT_NAME = 'vexiq_events_storage_change';

export const DEFAULT_FAVORITES = Object.freeze({
  events: [],
  teams: []
});

export const DEFAULT_QUEUE_ALERT_CONFIG = Object.freeze({
  teamNumber: '',
  matchesAhead: 2,
  enabled: false
});

// In-memory fallback caches when localStorage is unavailable
let inMemoryFavorites = null;
let inMemoryQueueAlert = null;

/**
 * Safely test if localStorage is supported and writable
 */
function getStorage() {
  if (typeof window === 'undefined') return null;
  try {
    const storage = window.localStorage;
    if (!storage) return null;
    const testKey = '__vexiq_storage_test__';
    storage.setItem(testKey, testKey);
    storage.removeItem(testKey);
    return storage;
  } catch (e) {
    return null;
  }
}

/**
 * Dispatch same-window custom event for reactive UI updates
 */
function notifyChange(key, action, data) {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      const CustomEventClass = typeof CustomEvent !== 'undefined' 
        ? CustomEvent 
        : (typeof window.CustomEvent !== 'undefined' ? window.CustomEvent : null);
      
      if (CustomEventClass) {
        window.dispatchEvent(new CustomEventClass(STORAGE_EVENT_NAME, {
          detail: { key, action, data }
        }));
      }
    } catch (e) {
      // Ignore in non-browser envs
    }
  }
}

/**
 * Sanitize favorites object structure
 */
function sanitizeFavorites(data) {
  if (!data || typeof data !== 'object') {
    return { events: [], teams: [] };
  }

  const cleanEvents = Array.isArray(data.events)
    ? Array.from(new Set(
        data.events
          .map(e => String(e || '').trim())
          .filter(Boolean)
      ))
    : [];

  const cleanTeams = Array.isArray(data.teams)
    ? Array.from(new Set(
        data.teams
          .map(t => String(t || '').trim().toUpperCase())
          .filter(Boolean)
      ))
    : [];

  return {
    events: cleanEvents,
    teams: cleanTeams
  };
}

/**
 * Sanitize queue alert configuration structure
 */
function sanitizeQueueAlertConfig(data) {
  if (!data || typeof data !== 'object') {
    return { ...DEFAULT_QUEUE_ALERT_CONFIG };
  }

  const rawMatches = parseInt(data.matchesAhead, 10);
  const matchesAhead = (!isNaN(rawMatches) && rawMatches >= 1 && rawMatches <= 10)
    ? rawMatches
    : DEFAULT_QUEUE_ALERT_CONFIG.matchesAhead;

  return {
    teamNumber: String(data.teamNumber || '').trim().toUpperCase(),
    matchesAhead,
    enabled: Boolean(data.enabled)
  };
}

// ============================================================================
// Favorites API
// ============================================================================

/**
 * Retrieve current favorites list
 * @returns {{ events: string[], teams: string[] }}
 */
export function getFavorites() {
  const storage = getStorage();

  if (!storage) {
    if (!inMemoryFavorites) {
      inMemoryFavorites = sanitizeFavorites(null);
    }
    return { ...inMemoryFavorites, events: [...inMemoryFavorites.events], teams: [...inMemoryFavorites.teams] };
  }

  try {
    const raw = storage.getItem(STORAGE_KEY_FAVORITES);
    if (!raw) {
      const initial = sanitizeFavorites(null);
      inMemoryFavorites = initial;
      return { ...initial, events: [], teams: [] };
    }

    const parsed = JSON.parse(raw);
    const sanitized = sanitizeFavorites(parsed);
    inMemoryFavorites = sanitized;
    return sanitized;
  } catch (err) {
    console.warn('[eventsStorage] Corrupted favorites data or read error, resetting:', err);
    const fallback = inMemoryFavorites || sanitizeFavorites(null);
    return { ...fallback, events: [...fallback.events], teams: [...fallback.teams] };
  }
}

/**
 * Check if an event or team is marked as favorite
 * @param {'events' | 'teams'} type 
 * @param {string | number} id 
 * @returns {boolean}
 */
export function isFavorite(type, id) {
  if (!id || (type !== 'events' && type !== 'teams')) return false;
  const favorites = getFavorites();
  const normalizedId = (type === 'teams')
    ? String(id).trim().toUpperCase()
    : String(id).trim();

  return favorites[type].includes(normalizedId);
}

/**
 * Toggle favorite status of an event or team
 * @param {'events' | 'teams'} type 
 * @param {string | number} id 
 * @returns {boolean} New favorite state (true if added, false if removed)
 */
export function toggleFavorite(type, id) {
  if (!id || (type !== 'events' && type !== 'teams')) return false;

  const current = getFavorites();
  const normalizedId = (type === 'teams')
    ? String(id).trim().toUpperCase()
    : String(id).trim();

  const list = current[type];
  const exists = list.includes(normalizedId);
  const updatedList = exists
    ? list.filter(item => item !== normalizedId)
    : [...list, normalizedId];

  const updatedFavorites = {
    ...current,
    [type]: updatedList
  };

  inMemoryFavorites = updatedFavorites;

  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(updatedFavorites));
    } catch (err) {
      console.warn('[eventsStorage] LocalStorage write failed (quota or disabled):', err);
    }
  }

  const newState = !exists;
  notifyChange(STORAGE_KEY_FAVORITES, 'toggle', {
    type,
    id: normalizedId,
    isFavorite: newState,
    favorites: updatedFavorites
  });

  return newState;
}

/**
 * Add an event or team to favorites (idempotent)
 * @param {'events' | 'teams'} type 
 * @param {string | number} id 
 * @returns {boolean}
 */
export function addFavorite(type, id) {
  if (isFavorite(type, id)) return true;
  return toggleFavorite(type, id);
}

/**
 * Remove an event or team from favorites (idempotent)
 * @param {'events' | 'teams'} type 
 * @param {string | number} id 
 * @returns {boolean}
 */
export function removeFavorite(type, id) {
  if (!isFavorite(type, id)) return true;
  return !toggleFavorite(type, id);
}

/**
 * Clear all favorites
 * @returns {boolean}
 */
export function clearFavorites() {
  const empty = { events: [], teams: [] };
  inMemoryFavorites = empty;

  const storage = getStorage();
  if (storage) {
    try {
      storage.removeItem(STORAGE_KEY_FAVORITES);
    } catch (err) {
      console.warn('[eventsStorage] Failed to remove favorites from storage:', err);
    }
  }

  notifyChange(STORAGE_KEY_FAVORITES, 'clear', { favorites: empty });
  return true;
}

// ============================================================================
// Queue Alert Configuration API
// ============================================================================

/**
 * Retrieve queue alert configuration
 * @returns {{ teamNumber: string, matchesAhead: number, enabled: boolean }}
 */
export function getQueueAlertConfig() {
  const storage = getStorage();

  if (!storage) {
    if (!inMemoryQueueAlert) {
      inMemoryQueueAlert = { ...DEFAULT_QUEUE_ALERT_CONFIG };
    }
    return { ...inMemoryQueueAlert };
  }

  try {
    const raw = storage.getItem(STORAGE_KEY_QUEUE_ALERTS);
    if (!raw) {
      const initial = { ...DEFAULT_QUEUE_ALERT_CONFIG };
      inMemoryQueueAlert = initial;
      return initial;
    }

    const parsed = JSON.parse(raw);
    const sanitized = sanitizeQueueAlertConfig(parsed);
    inMemoryQueueAlert = sanitized;
    return sanitized;
  } catch (err) {
    console.warn('[eventsStorage] Corrupted queue alert config or read error:', err);
    return inMemoryQueueAlert ? { ...inMemoryQueueAlert } : { ...DEFAULT_QUEUE_ALERT_CONFIG };
  }
}

/**
 * Update queue alert configuration
 * @param {Partial<{ teamNumber: string, matchesAhead: number, enabled: boolean }>} config 
 * @returns {{ teamNumber: string, matchesAhead: number, enabled: boolean }}
 */
export function setQueueAlertConfig(config) {
  const current = getQueueAlertConfig();
  const merged = sanitizeQueueAlertConfig({
    ...current,
    ...config
  });

  inMemoryQueueAlert = merged;

  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(STORAGE_KEY_QUEUE_ALERTS, JSON.stringify(merged));
    } catch (err) {
      console.warn('[eventsStorage] LocalStorage queue alert write failed:', err);
    }
  }

  notifyChange(STORAGE_KEY_QUEUE_ALERTS, 'update', { config: merged });
  return merged;
}

/**
 * Reset queue alert configuration to defaults
 * @returns {{ teamNumber: string, matchesAhead: number, enabled: boolean }}
 */
export function resetQueueAlertConfig() {
  return setQueueAlertConfig(DEFAULT_QUEUE_ALERT_CONFIG);
}

// ============================================================================
// Cross-Tab & Same-Tab React Hook Helper
// ============================================================================

/**
 * Subscribe to storage updates (both within this window and across tabs)
 * @param {Function} callback 
 * @returns {() => void} Unsubscribe cleanup function
 */
export function subscribeToStorage(callback) {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (event) => {
    callback(event?.detail || {});
  };

  const handleStorageEvent = (event) => {
    if (event.key === STORAGE_KEY_FAVORITES) {
      callback({ key: STORAGE_KEY_FAVORITES, action: 'storage_sync', data: getFavorites() });
    } else if (event.key === STORAGE_KEY_QUEUE_ALERTS) {
      callback({ key: STORAGE_KEY_QUEUE_ALERTS, action: 'storage_sync', data: getQueueAlertConfig() });
    }
  };

  window.addEventListener(STORAGE_EVENT_NAME, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(STORAGE_EVENT_NAME, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}
