// Storage and Progress Tracking for VEX IQ Level Up Matches

const STORAGE_KEY = 'vexiq_levelup_saved_matches_v1';

export function getSavedMatches() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to load saved matches from localStorage', e);
    return [];
  }
}

export function saveMatch(matchData) {
  try {
    const existing = getSavedMatches();
    const newMatch = {
      id: 'match_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      timestamp: new Date().toISOString(),
      dateStr: new Date().toLocaleDateString(),
      timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ...matchData
    };
    const updated = [newMatch, ...existing];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newMatch;
  } catch (e) {
    console.error('Failed to save match', e);
    return null;
  }
}

export function updateSavedMatch(id, updatedFields) {
  try {
    const existing = getSavedMatches();
    const updated = existing.map(item => {
      if (item.id === id) {
        return { ...item, ...updatedFields, updatedAt: new Date().toISOString() };
      }
      return item;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return true;
  } catch (e) {
    console.error('Failed to update match', e);
    return false;
  }
}

export function deleteSavedMatch(id) {
  try {
    const existing = getSavedMatches();
    const filtered = existing.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (e) {
    console.error('Failed to delete match', e);
    return false;
  }
}

export function clearAllSavedMatches() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (e) {
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
