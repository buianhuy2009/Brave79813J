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
export const STORAGE_KEY_SCOUTING_NOTES = 'vexiq_live_scouting_notes';
export const STORAGE_KEY_MATCH_NOTES = 'vexiq_live_match_notes';
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
let inMemoryScoutingNotes = {};
let inMemoryMatchNotes = {};

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
// Match & Team Scouting Notes API (LemonVEX Parity)
// ============================================================================

/**
 * Retrieve saved scouting notes for a team
 * @param {string} teamNumber 
 * @returns {string}
 */
export function getTeamNotes(teamNumber) {
  if (!teamNumber) return '';
  const normTeam = String(teamNumber).trim().toUpperCase();
  const storage = getStorage();
  if (!storage) {
    return inMemoryScoutingNotes[normTeam] || '';
  }
  try {
    const raw = storage.getItem(STORAGE_KEY_SCOUTING_NOTES);
    if (!raw) return inMemoryScoutingNotes[normTeam] || '';
    const parsed = JSON.parse(raw);
    return typeof parsed?.[normTeam] === 'string' ? parsed[normTeam] : (inMemoryScoutingNotes[normTeam] || '');
  } catch (err) {
    return inMemoryScoutingNotes[normTeam] || '';
  }
}

/**
 * Save scouting notes for a team
 * @param {string} teamNumber 
 * @param {string} notes 
 * @returns {string}
 */
export function setTeamNotes(teamNumber, notes) {
  if (!teamNumber) return '';
  const normTeam = String(teamNumber).trim().toUpperCase();
  const cleanNotes = typeof notes === 'string' ? notes : (notes != null ? String(notes) : '');

  let allNotes = {};
  const storage = getStorage();
  if (storage) {
    try {
      const raw = storage.getItem(STORAGE_KEY_SCOUTING_NOTES);
      if (raw) allNotes = JSON.parse(raw) || {};
    } catch (e) {
      allNotes = {};
    }
  } else {
    allNotes = { ...inMemoryScoutingNotes };
  }

  if (cleanNotes.trim()) {
    allNotes[normTeam] = cleanNotes;
  } else {
    delete allNotes[normTeam];
  }

  inMemoryScoutingNotes = { ...allNotes };

  if (storage) {
    try {
      storage.setItem(STORAGE_KEY_SCOUTING_NOTES, JSON.stringify(allNotes));
    } catch (err) {
      console.warn('[eventsStorage] Failed to save scouting notes:', err);
    }
  }

  notifyChange(STORAGE_KEY_SCOUTING_NOTES, 'update', { teamNumber: normTeam, notes: cleanNotes });
  return cleanNotes;
}

/**
 * Get dictionary of all team scouting notes
 * @returns {Record<string, string>}
 */
export function getAllTeamNotes() {
  const storage = getStorage();
  if (!storage) return { ...inMemoryScoutingNotes };
  try {
    const raw = storage.getItem(STORAGE_KEY_SCOUTING_NOTES);
    return raw ? JSON.parse(raw) || {} : {};
  } catch (err) {
    return { ...inMemoryScoutingNotes };
  }
}

/**
 * Clear all scouting notes
 */
export function clearAllTeamNotes() {
  inMemoryScoutingNotes = {};
  const storage = getStorage();
  if (storage) {
    try {
      storage.removeItem(STORAGE_KEY_SCOUTING_NOTES);
    } catch (e) {}
  }
  notifyChange(STORAGE_KEY_SCOUTING_NOTES, 'clear', {});
}

// ============================================================================
// Match Scouting Notes API (Match Schedule & Alliance Strategy)
// ============================================================================

/**
 * Retrieve saved scouting notes for a match
 * @param {string|number} matchId 
 * @returns {string}
 */
export function getMatchNotes(matchId) {
  if (matchId == null || matchId === '') return '';
  const key = String(matchId).trim();
  const storage = getStorage();
  if (!storage) {
    return inMemoryMatchNotes[key] || '';
  }
  try {
    const raw = storage.getItem(STORAGE_KEY_MATCH_NOTES);
    if (!raw) return inMemoryMatchNotes[key] || '';
    const parsed = JSON.parse(raw);
    return typeof parsed?.[key] === 'string' ? parsed[key] : (inMemoryMatchNotes[key] || '');
  } catch (err) {
    return inMemoryMatchNotes[key] || '';
  }
}

/**
 * Save scouting notes for a match
 * @param {string|number} matchId 
 * @param {string} notes 
 * @returns {string}
 */
export function setMatchNotes(matchId, notes) {
  if (matchId == null || matchId === '') return '';
  const key = String(matchId).trim();
  const cleanNotes = typeof notes === 'string' ? notes : (notes != null ? String(notes) : '');

  let allNotes = {};
  const storage = getStorage();
  if (storage) {
    try {
      const raw = storage.getItem(STORAGE_KEY_MATCH_NOTES);
      if (raw) allNotes = JSON.parse(raw) || {};
    } catch (e) {
      allNotes = {};
    }
  } else {
    allNotes = { ...inMemoryMatchNotes };
  }

  if (cleanNotes.trim()) {
    allNotes[key] = cleanNotes;
  } else {
    delete allNotes[key];
  }

  inMemoryMatchNotes = { ...allNotes };

  if (storage) {
    try {
      storage.setItem(STORAGE_KEY_MATCH_NOTES, JSON.stringify(allNotes));
    } catch (err) {
      console.warn('[eventsStorage] Failed to save match notes:', err);
    }
  }

  notifyChange(STORAGE_KEY_MATCH_NOTES, 'update', { matchId: key, notes: cleanNotes });
  return cleanNotes;
}

/**
 * Get dictionary of all match scouting notes
 * @returns {Record<string, string>}
 */
export function getAllMatchNotes() {
  const storage = getStorage();
  if (!storage) return { ...inMemoryMatchNotes };
  try {
    const raw = storage.getItem(STORAGE_KEY_MATCH_NOTES);
    return raw ? JSON.parse(raw) || {} : {};
  } catch (err) {
    return { ...inMemoryMatchNotes };
  }
}

/**
 * Clear all match scouting notes
 */
export function clearAllMatchNotes() {
  inMemoryMatchNotes = {};
  const storage = getStorage();
  if (storage) {
    try {
      storage.removeItem(STORAGE_KEY_MATCH_NOTES);
    } catch (e) {}
  }
  notifyChange(STORAGE_KEY_MATCH_NOTES, 'clear', {});
}

/**
 * Safely toggles a quick tactical tag on/off in scouting notes
 * without corrupting multi-line formatting or leaving duplicate bullet delimiters.
 * 
 * @param {string} currentNotes 
 * @param {string} tag 
 * @returns {string} Updated notes
 */
export function toggleScoutingTag(currentNotes, tag) {
  const notes = typeof currentNotes === 'string' ? currentNotes : '';
  if (!tag) return notes;

  const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Check if tag is currently active
  if (notes.includes(tag)) {
    // Toggle OFF:
    // Remove tag with surrounding bullets and spaces, without altering untouched newlines
    let updated = notes
      // Case A: preceded by bullet (e.g. " • Tag")
      .replace(new RegExp(`[ \\t]*•[ \\t]*${escapedTag}`, 'g'), '')
      // Case B: followed by bullet (e.g. "Tag • ")
      .replace(new RegExp(`${escapedTag}[ \\t]*•[ \\t]*`, 'g'), '')
      // Case C: standalone tag without bullet
      .replace(new RegExp(escapedTag, 'g'), '');

    // Clean up any double bullets on the same line (e.g. "TagA •  • TagB")
    updated = updated.replace(/[ \t]*•[ \t]*(?:•[ \t]*)+/g, ' • ');

    // Clean up empty lines or orphan bullets on a line
    updated = updated
      .split('\n')
      .map(line => {
        const trimmed = line.trim();
        if (trimmed === '•' || trimmed === '') return '';
        return line.replace(/^[ \t]*•[ \t]*/, '').replace(/[ \t]*•[ \t]*$/, '').trimEnd();
      })
      .join('\n');

    // Trim trailing empty lines
    return updated.replace(/^\n+|\n+$/g, '').trim();
  } else {
    // Toggle ON:
    const trimmed = notes.trim();
    if (!trimmed) {
      return tag;
    }
    // If notes ends with newline, append to new line, otherwise append with bullet
    if (notes.endsWith('\n')) {
      return `${notes}${tag}`;
    }
    return `${trimmed} • ${tag}`;
  }
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
    } else if (event.key === STORAGE_KEY_SCOUTING_NOTES) {
      callback({ key: STORAGE_KEY_SCOUTING_NOTES, action: 'storage_sync', data: getAllTeamNotes() });
    } else if (event.key === STORAGE_KEY_MATCH_NOTES) {
      callback({ key: STORAGE_KEY_MATCH_NOTES, action: 'storage_sync', data: getAllMatchNotes() });
    }
  };

  window.addEventListener(STORAGE_EVENT_NAME, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(STORAGE_EVENT_NAME, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}
