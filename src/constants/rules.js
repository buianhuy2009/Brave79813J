// VEX IQ Robotics Competition "Level Up" (2026-2027) Official Game Rules & Constants

export const GAME_INFO = {
  name: "VEX IQ Level Up",
  season: "2026 - 2027",
  manualVersion: "v1.1",
  durationSeconds: 60,
  switchDriverSeconds: 35, // Switch window around 35-25 seconds remaining
  maxBags: {
    total: 38,
    red: 16,
    blue: 16,
    yellow: 6
  },
  pointValues: {
    floor: 1,
    l1: 3,
    l2: 6,
    l3: 12,
    l4: 16 // Yellow only
  }
};

export const MATCH_TYPES = [
  { id: 'teamwork', label: 'Teamwork Challenge', short: 'Teamwork', icon: 'Users' },
  { id: 'driving', label: 'Driving Skills', short: 'Driver Skills', icon: 'Gamepad2' },
  { id: 'auton', label: 'Autonomous Coding Skills', short: 'Auto Skills', icon: 'Cpu' }
];

export const SESSION_TAGS = [
  { id: 'practice', label: 'Practicing', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
  { id: 'testing', label: 'Testing', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' },
  { id: 'debugging', label: 'Fixing Bugs / Tuning', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
  { id: 'building', label: 'Robot Building', color: 'bg-purple-500/20 text-purple-400 border-purple-500/40' },
  { id: 'official', label: 'Official Competition', color: 'bg-rose-500/20 text-rose-400 border-rose-500/40' },
  { id: 'scrimmage', label: 'Scrimmage / Friendly', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' }
];

export const INITIAL_QUICK_STATE = {
  floor: 0,
  l1: 0,
  l2: 0,
  l3: 0,
  l4: 0, // Yellow only
  // Optional bag color breakdown in quick mode
  redBags: 0,
  blueBags: 0,
  yellowBags: 0
};

export const INITIAL_DETAILED_STATE = {
  // Red Pyramid & Floor
  floorRed: 0,
  l1Red: 0,
  l2Red: 0,
  l3Red: 0,

  // Blue Pyramid & Floor
  floorBlue: 0,
  l1Blue: 0,
  l2Blue: 0,
  l3Blue: 0,

  // Yellow Bags (can be in any goal, and only yellow can be in L4)
  floorYellow: 0,
  l1Yellow: 0,
  l2Yellow: 0,
  l3Yellow: 0,
  l4Yellow: 0 // Top goal
};

// Calculate score from quick state
export function calculateQuickScore(state) {
  const floorPts = (state.floor || 0) * GAME_INFO.pointValues.floor;
  const l1Pts = (state.l1 || 0) * GAME_INFO.pointValues.l1;
  const l2Pts = (state.l2 || 0) * GAME_INFO.pointValues.l2;
  const l3Pts = (state.l3 || 0) * GAME_INFO.pointValues.l3;
  const l4Pts = (state.l4 || 0) * GAME_INFO.pointValues.l4;

  const totalPoints = floorPts + l1Pts + l2Pts + l3Pts + l4Pts;
  const totalBags = (state.floor || 0) + (state.l1 || 0) + (state.l2 || 0) + (state.l3 || 0) + (state.l4 || 0);

  return {
    totalPoints,
    totalBags,
    breakdown: {
      floor: { count: state.floor || 0, points: floorPts },
      l1: { count: state.l1 || 0, points: l1Pts },
      l2: { count: state.l2 || 0, points: l2Pts },
      l3: { count: state.l3 || 0, points: l3Pts },
      l4: { count: state.l4 || 0, points: l4Pts }
    }
  };
}

// Calculate score from detailed state
export function calculateDetailedScore(state) {
  // Red
  const redBags = (state.floorRed || 0) + (state.l1Red || 0) + (state.l2Red || 0) + (state.l3Red || 0);
  const redPts = (state.floorRed || 0) * 1 + (state.l1Red || 0) * 3 + (state.l2Red || 0) * 6 + (state.l3Red || 0) * 12;

  // Blue
  const blueBags = (state.floorBlue || 0) + (state.l1Blue || 0) + (state.l2Blue || 0) + (state.l3Blue || 0);
  const bluePts = (state.floorBlue || 0) * 1 + (state.l1Blue || 0) * 3 + (state.l2Blue || 0) * 6 + (state.l3Blue || 0) * 12;

  // Yellow
  const yellowBags = (state.floorYellow || 0) + (state.l1Yellow || 0) + (state.l2Yellow || 0) + (state.l3Yellow || 0) + (state.l4Yellow || 0);
  const yellowPts = (state.floorYellow || 0) * 1 + (state.l1Yellow || 0) * 3 + (state.l2Yellow || 0) * 6 + (state.l3Yellow || 0) * 12 + (state.l4Yellow || 0) * 16;

  const totalPoints = redPts + bluePts + yellowPts;
  const totalBags = redBags + blueBags + yellowBags;

  const floorCount = (state.floorRed || 0) + (state.floorBlue || 0) + (state.floorYellow || 0);
  const l1Count = (state.l1Red || 0) + (state.l1Blue || 0) + (state.l1Yellow || 0);
  const l2Count = (state.l2Red || 0) + (state.l2Blue || 0) + (state.l2Yellow || 0);
  const l3Count = (state.l3Red || 0) + (state.l3Blue || 0) + (state.l3Yellow || 0);
  const l4Count = state.l4Yellow || 0;

  return {
    totalPoints,
    totalBags,
    redBags,
    blueBags,
    yellowBags,
    redPts,
    bluePts,
    yellowPts,
    byLevel: {
      floor: { count: floorCount, points: floorCount * 1 },
      l1: { count: l1Count, points: l1Count * 3 },
      l2: { count: l2Count, points: l2Count * 6 },
      l3: { count: l3Count, points: l3Count * 12 },
      l4: { count: l4Count, points: l4Count * 16 }
    }
  };
}
