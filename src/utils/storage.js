// Storage and Progress Tracking for VEX IQ Level Up Matches
// Hardened with in-memory fallback, cross-event syncing, and data sanitization

export const STORAGE_KEY = 'vexiq_levelup_saved_matches_v1';
const LEGACY_KEYS = ['vexiq_levelup_saved_matches', 'vexiq_saved_matches', 'vexiq_matches'];

// In-memory cache to guarantee zero-data-loss even if localStorage is blocked or throws
let inMemoryMatches = null;

function notifyStorageChange(action, detail) {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new CustomEvent('vexiq_storage_change', { detail: { action, ...detail } }));
    } catch (e) {
      // Ignore event dispatch failure in non-browser envs
    }
  }
}

function sanitizeMatchItem(item) {
  if (!item || typeof item !== 'object') return null;
  const now = new Date();
  const dateStr = item.matchDate || item.dateStr || (item.timestamp ? item.timestamp.slice(0, 10) : now.toISOString().slice(0, 10));
  return {
    ...item,
    id: item.id || `match_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    timestamp: item.timestamp || now.toISOString(),
    matchDate: dateStr,
    dateStr: dateStr,
    timeStr: item.timeStr || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    score: Number(item.score) || 0,
    totalBags: Number(item.totalBags) || 0,
    minorViolations: Number(item.minorViolations) || 0,
    majorViolations: Number(item.majorViolations) || 0,
    robotType: item.robotType || '',
    matchType: item.matchType || 'teamwork',
    sessionTag: item.sessionTag || 'practice',
    skillsStopTime: Number(item.skillsStopTime) || 0
  };
}

export function getSavedMatches() {
  // If in-memory matches are already loaded and localStorage is unavailable, use cache
  if (typeof window === 'undefined') {
    return inMemoryMatches || [];
  }

  try {
    let raw = window.localStorage ? window.localStorage.getItem(STORAGE_KEY) : null;

    // Check legacy migration if primary key is empty
    if (!raw && window.localStorage) {
      for (const legacyKey of LEGACY_KEYS) {
        const legacyRaw = window.localStorage.getItem(legacyKey);
        if (legacyRaw) {
          raw = legacyRaw;
          try {
            window.localStorage.setItem(STORAGE_KEY, legacyRaw);
          } catch (err) {}
          break;
        }
      }
    }

    if (!raw) {
      return inMemoryMatches || [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return inMemoryMatches || [];
    }

    const sanitized = parsed.map(sanitizeMatchItem).filter(Boolean);
    inMemoryMatches = sanitized;
    return sanitized;
  } catch (e) {
    console.warn('Storage read warning, falling back to in-memory cache:', e);
    return inMemoryMatches || [];
  }
}

export function saveMatch(matchData) {
  try {
    const existing = getSavedMatches();
    const customDate = matchData.matchDate || new Date().toISOString().slice(0, 10);
    const now = new Date();

    const newMatch = sanitizeMatchItem({
      ...matchData,
      id: 'match_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      timestamp: now.toISOString(),
      matchDate: customDate,
      dateStr: customDate,
      timeStr: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      minorViolations: Number(matchData.minorViolations) || 0,
      majorViolations: Number(matchData.majorViolations) || 0,
      robotType: matchData.robotType || '',
      matchType: matchData.matchType || 'teamwork',
      sessionTag: matchData.sessionTag || 'practice'
    });

    const updated = [newMatch, ...existing];
    inMemoryMatches = updated;

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (storageErr) {
        console.warn('LocalStorage write failed (quota or restrictions), kept in session memory:', storageErr);
      }
    }

    notifyStorageChange('save', { match: newMatch, count: updated.length });
    return newMatch;
  } catch (e) {
    console.error('Failed to save match:', e);
    // Absolute fallback: still create and return match in memory
    const fallbackMatch = sanitizeMatchItem({ ...matchData });
    inMemoryMatches = [fallbackMatch, ...(inMemoryMatches || [])];
    notifyStorageChange('save', { match: fallbackMatch });
    return fallbackMatch;
  }
}

export function updateSavedMatch(id, updatedFields) {
  try {
    const existing = getSavedMatches();
    const updated = existing.map(item => {
      if (item.id === id) {
        return sanitizeMatchItem({ ...item, ...updatedFields, updatedAt: new Date().toISOString() });
      }
      return item;
    });

    inMemoryMatches = updated;

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (storageErr) {
        console.warn('LocalStorage update write failed, kept in session memory:', storageErr);
      }
    }

    notifyStorageChange('update', { id, count: updated.length });
    return true;
  } catch (e) {
    console.error('Failed to update match:', e);
    return false;
  }
}

export function deleteSavedMatch(id) {
  try {
    const existing = getSavedMatches();
    const filtered = existing.filter(item => item.id !== id);
    inMemoryMatches = filtered;

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      } catch (storageErr) {
        console.warn('LocalStorage delete write failed:', storageErr);
      }
    }

    notifyStorageChange('delete', { id, count: filtered.length });
    return true;
  } catch (e) {
    console.error('Failed to delete match:', e);
    return false;
  }
}

export function clearAllSavedMatches() {
  try {
    inMemoryMatches = [];
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch (storageErr) {
        console.warn('LocalStorage remove failed:', storageErr);
      }
    }
    notifyStorageChange('clear', { count: 0 });
    return true;
  } catch (e) {
    console.error('Failed to clear matches:', e);
    return false;
  }
}

export function calculateStats(matches) {
  if (!matches || matches.length === 0) {
    return {
      totalMatches: 0,
      avgScore: 0,
      highScore: 0,
      highAuton: 0,
      highDriving: 0,
      highTeamwork: 0,
      tagCounts: {},
      typeCounts: {}
    };
  }

  const totalMatches = matches.length;
  let totalScore = 0;
  let highScore = 0;
  let highAuton = 0;
  let highDriving = 0;
  let highTeamwork = 0;
  const tagCounts = {};
  const typeCounts = {};

  matches.forEach(m => {
    const score = Number(m.score) || 0;
    totalScore += score;
    if (score > highScore) highScore = score;

    if (m.matchType === 'auton' && score > highAuton) highAuton = score;
    if (m.matchType === 'driving' && score > highDriving) highDriving = score;
    if (m.matchType === 'teamwork' && score > highTeamwork) highTeamwork = score;

    if (m.sessionTag) {
      tagCounts[m.sessionTag] = (tagCounts[m.sessionTag] || 0) + 1;
    }
    if (m.matchType) {
      typeCounts[m.matchType] = (typeCounts[m.matchType] || 0) + 1;
    }
  });

  return {
    totalMatches,
    avgScore: Math.round(totalScore / totalMatches),
    highScore,
    highAuton,
    highDriving,
    highTeamwork,
    tagCounts,
    typeCounts
  };
}
