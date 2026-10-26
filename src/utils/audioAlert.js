/**
 * src/utils/audioAlert.js
 * 
 * Web Audio API synthesizer and match queue alert evaluator for VEX IQ Live Events.
 * 
 * Features:
 * - Synthesizes audible alert tone using browser Web Audio API (zero audio file dependencies).
 * - Dual-tone chime: D5 (587.33 Hz) transitioning to A5 (880.00 Hz) with smooth exponential decay (~0.60s).
 * - AudioContext lifecycle management: user gesture unlocking, auto-resume on suspend, SSR/headless safety.
 * - Volume control and mute state toggle.
 * - Queue alert evaluator: compares division match schedule against team queue settings (teamNumber, matchesAhead).
 * - Deduplication helper: prevents repeated ringing for the same upcoming match during 30s polling loops.
 * - Simulation helper: produces mock schedule evaluation for test mode (Feature #21 & Acceptance Criteria #64).
 */

// Musical constants
export const ALERT_TONE_FREQUENCIES = Object.freeze({
  D5: 587.33, // First tone: D5 (587.33 Hz)
  A5: 880.00  // Second tone: A5 (880.00 Hz) - Perfect fifth
});

export const ALERT_TONE_DURATION = 0.60; // Total duration in seconds

// Internal singleton audio state
let sharedAudioContext = null;
let isMutedState = false;

/**
 * Checks whether the current environment supports browser Web Audio API.
 * @returns {boolean}
 */
export function isAudioSupported() {
  if (typeof window === 'undefined') return false;
  return typeof (window.AudioContext || window.webkitAudioContext) !== 'undefined';
}

/**
 * Checks if queue alert audio is currently muted.
 * @returns {boolean}
 */
export function isAudioMuted() {
  return isMutedState;
}

/**
 * Sets queue alert audio mute status.
 * @param {boolean} muted 
 * @returns {boolean}
 */
export function setAudioMuted(muted) {
  isMutedState = Boolean(muted);
  return isMutedState;
}

/**
 * Returns or creates the shared singleton AudioContext.
 * Reuses existing running context across multiple alert triggers.
 * @returns {AudioContext|null}
 */
export function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;

  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    try {
      sharedAudioContext = new AudioCtx();
    } catch (err) {
      console.warn('[audioAlert] Failed to instantiate AudioContext:', err);
      return null;
    }
  }
  return sharedAudioContext;
}

/**
 * Resets shared AudioContext (used in test teardowns).
 */
export function resetAudioContextForTesting() {
  if (sharedAudioContext && typeof sharedAudioContext.close === 'function') {
    try {
      sharedAudioContext.close();
    } catch {}
  }
  sharedAudioContext = null;
}

/**
 * Primes and unlocks AudioContext from a user interaction gesture (click/tap).
 * Call this inside UI event handlers (e.g. Save Alert, Toggle, Test Tone).
 * @returns {Promise<boolean>} Resolves to true if audio context is running.
 */
export async function unlockAudioContext() {
  const ctx = getAudioContext();
  if (!ctx) return false;

  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
      return ctx.state === 'running';
    } catch (err) {
      console.warn('[audioAlert] Failed to resume AudioContext during gesture unlock:', err);
      return false;
    }
  }
  return ctx.state === 'running';
}

/**
 * Synthesizes and plays the dual-tone queue alert chime (D5 -> A5, ~0.6s).
 * Safe against autoplay restrictions, SSR, and invalid volume parameters.
 * 
 * @param {Object} [options]
 * @param {number} [options.volume=0.3] - Gain volume between 0.0 and 1.0 (clamped safely).
 * @returns {Promise<{ success: boolean, reason?: string, error?: string }>}
 */
export async function playQueueAlertChime({ volume = 0.3 } = {}) {
  if (isMutedState) {
    return { success: false, reason: 'muted' };
  }

  const ctx = getAudioContext();
  if (!ctx) {
    return { success: false, reason: 'unsupported' };
  }

  // Attempt to resume if suspended
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch (err) {
      console.warn('[audioAlert] AudioContext resume failed (autoplay blocked):', err);
      return { success: false, reason: 'autoplay_blocked' };
    }
  }

  if (ctx.state !== 'running') {
    return { success: false, reason: 'context_not_running' };
  }

  try {
    const t0 = ctx.currentTime + 0.01; // Tiny lookahead to avoid boundary click
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // Pure sine waveform gives a clean, musical bell chime
    osc.type = 'sine';

    // Tone progression: D5 (587.33 Hz) transitioning to A5 (880.00 Hz)
    osc.frequency.setValueAtTime(ALERT_TONE_FREQUENCIES.D5, t0);
    osc.frequency.setValueAtTime(ALERT_TONE_FREQUENCIES.A5, t0 + 0.18);

    // Clamped volume safely above zero to satisfy exponentialRampToValueAtTime requirement
    const baseGain = Math.max(0.001, Math.min(1.0, Number(volume) || 0.3));

    // Envelope shaping:
    // Initial silent anchor
    gainNode.gain.setValueAtTime(0.0001, t0);
    // Note 1 attack
    gainNode.gain.exponentialRampToValueAtTime(baseGain * 0.90, t0 + 0.02);
    // Note 1 decay
    gainNode.gain.exponentialRampToValueAtTime(baseGain * 0.35, t0 + 0.16);
    // Note 2 strike attack
    gainNode.gain.setValueAtTime(baseGain * 0.35, t0 + 0.18);
    gainNode.gain.exponentialRampToValueAtTime(baseGain, t0 + 0.20);
    // Note 2 long exponential decay to silence at ~0.60s
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t0 + ALERT_TONE_DURATION);

    // Connect audio node pipeline
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Schedule playback lifecycle
    osc.start(t0);
    osc.stop(t0 + ALERT_TONE_DURATION + 0.02);

    // Garbage-collect audio nodes when finished
    osc.onended = () => {
      try {
        osc.disconnect();
        gainNode.disconnect();
      } catch {}
    };

    return { success: true };
  } catch (err) {
    console.warn('[audioAlert] Failed to synthesize alert tone:', err);
    return { success: false, reason: 'synthesis_error', error: err.message };
  }
}

// =========================================================================
// Match Schedule Queue Alert Evaluator
// =========================================================================

/**
 * Extracts normalized, uppercase team number strings from a match object.
 * Handles RobotEvents API v2 nested alliances, flat objects, and string numbers.
 * 
 * @param {Object} match 
 * @returns {string[]}
 */
export function getMatchTeamNumbers(match) {
  if (!match || !Array.isArray(match.alliances)) return [];
  const numbers = [];
  for (const alliance of match.alliances) {
    if (alliance && Array.isArray(alliance.teams)) {
      for (const t of alliance.teams) {
        const teamObj = t?.team;
        const num = teamObj?.name || teamObj?.number || teamObj?.code || teamObj?.team_name || (typeof teamObj === 'string' ? teamObj : '');
        if (num) numbers.push(String(num).trim().toUpperCase());
      }
    }
  }
  return numbers;
}

/**
 * Checks whether a match includes a specific team number.
 * Case-insensitive and whitespace-tolerant.
 * 
 * @param {Object} match 
 * @param {string} teamNumber 
 * @returns {boolean}
 */
export function matchIncludesTeam(match, teamNumber) {
  if (!match || !teamNumber) return false;
  const target = String(teamNumber).trim().toUpperCase();
  return getMatchTeamNumbers(match).includes(target);
}

/**
 * Determines the currently active or next upcoming match on the field.
 * Priority:
 * 1. Match currently in progress (`started && !scored`)
 * 2. Earliest unscored match (`!scored`)
 * 
 * @param {Array<Object>} matches 
 * @returns {Object|null}
 */
export function getCurrentOrNextMatch(matches) {
  if (!Array.isArray(matches) || matches.length === 0) return null;

  // 1. In-progress match
  const inProgress = matches.find(m => m.started && !m.scored);
  if (inProgress) return inProgress;

  // 2. First unscored match
  const firstUnscored = matches.find(m => !m.scored);
  if (firstUnscored) return firstUnscored;

  // All matches are scored
  return null;
}

/**
 * Finds the earliest unscored match involving the target team.
 * 
 * @param {Array<Object>} matches 
 * @param {string} teamNumber 
 * @returns {Object|null}
 */
export function findUpcomingTeamMatch(matches, teamNumber) {
  if (!Array.isArray(matches) || !teamNumber) return null;
  const target = String(teamNumber).trim().toUpperCase();
  return matches.find(m => !m.scored && matchIncludesTeam(m, target)) || null;
}

/**
 * Evaluates the match schedule against the user's team queue alert configuration.
 * 
 * @param {Array<Object>} matches - Division matches schedule array.
 * @param {Object} alertConfig - User queue alert configuration.
 * @param {string} alertConfig.teamNumber - Alphanumeric team identifier (e.g. '79813J').
 * @param {number|string} [alertConfig.matchesAhead=2] - Trigger threshold (matches away).
 * @param {boolean} [alertConfig.enabled=true] - Whether queue alerts are active.
 * @param {Object} [options]
 * @param {Object} [options.currentMatch] - Explicit current match override (optional).
 * @returns {{
 *   shouldAlert: boolean,
 *   status: 'ALERT_ACTIVE'|'ON_FIELD'|'WAITING'|'DISABLED'|'COMPLETED'|'NOT_FOUND'|'NO_TEAM'|'NO_MATCHES',
 *   matchesAhead: number|null,
 *   teamMatch: Object|null,
 *   currentMatch: Object|null,
 *   teamNumber: string,
 *   threshold: number,
 *   message: string,
 *   reason: string
 * }}
 */
export function evaluateQueueAlert(matches, alertConfig, options = {}) {
  const config = alertConfig || {};
  const teamNumber = String(config.teamNumber || '').trim().toUpperCase();
  const parsedAhead = parseInt(config.matchesAhead, 10);
  const matchesAheadThreshold = !isNaN(parsedAhead) && parsedAhead >= 0 ? parsedAhead : 2;
  const enabled = config.enabled !== false;

  // 1. Alert Disabled
  if (!enabled) {
    return {
      shouldAlert: false,
      status: 'DISABLED',
      matchesAhead: null,
      teamMatch: null,
      currentMatch: null,
      teamNumber,
      threshold: matchesAheadThreshold,
      message: 'Queue alerts are disabled.',
      reason: 'ALERT_DISABLED'
    };
  }

  // 2. Missing Team Number
  if (!teamNumber) {
    return {
      shouldAlert: false,
      status: 'NO_TEAM',
      matchesAhead: null,
      teamMatch: null,
      currentMatch: null,
      teamNumber: '',
      threshold: matchesAheadThreshold,
      message: 'No team specified for queue alerts.',
      reason: 'NO_TEAM_SPECIFIED'
    };
  }

  // 3. Empty Schedule
  if (!Array.isArray(matches) || matches.length === 0) {
    return {
      shouldAlert: false,
      status: 'NO_MATCHES',
      matchesAhead: null,
      teamMatch: null,
      currentMatch: null,
      teamNumber,
      threshold: matchesAheadThreshold,
      message: 'No matches found in event schedule.',
      reason: 'SCHEDULE_EMPTY'
    };
  }

  // 4. Team Not in Division
  const teamMatchesInSchedule = matches.filter(m => matchIncludesTeam(m, teamNumber));
  if (teamMatchesInSchedule.length === 0) {
    return {
      shouldAlert: false,
      status: 'NOT_FOUND',
      matchesAhead: null,
      teamMatch: null,
      currentMatch: null,
      teamNumber,
      threshold: matchesAheadThreshold,
      message: `Team ${teamNumber} is not scheduled in this division.`,
      reason: 'TEAM_NOT_IN_DIVISION'
    };
  }

  // 5. Team Finished All Matches
  const teamMatch = findUpcomingTeamMatch(matches, teamNumber);
  if (!teamMatch) {
    return {
      shouldAlert: false,
      status: 'COMPLETED',
      matchesAhead: null,
      teamMatch: null,
      currentMatch: null,
      teamNumber,
      threshold: matchesAheadThreshold,
      message: `All matches for team ${teamNumber} have been completed.`,
      reason: 'ALL_MATCHES_COMPLETED'
    };
  }

  // 6. Current/Next Match Identification
  const currentMatch = options.currentMatch || getCurrentOrNextMatch(matches);
  if (!currentMatch) {
    return {
      shouldAlert: false,
      status: 'COMPLETED',
      matchesAhead: null,
      teamMatch,
      currentMatch: null,
      teamNumber,
      threshold: matchesAheadThreshold,
      message: 'Tournament matches have finished.',
      reason: 'NO_CURRENT_MATCH'
    };
  }

  // 7. Calculate Distance (matches ahead)
  let matchesAhead;
  if (
    typeof teamMatch.matchnum === 'number' &&
    typeof currentMatch.matchnum === 'number' &&
    teamMatch.round === currentMatch.round
  ) {
    matchesAhead = teamMatch.matchnum - currentMatch.matchnum;
  } else {
    // Positional difference in scheduled matches list
    const currentIdx = matches.findIndex(m => m.id === currentMatch.id);
    const teamIdx = matches.findIndex(m => m.id === teamMatch.id);
    matchesAhead = (currentIdx >= 0 && teamIdx >= 0) ? (teamIdx - currentIdx) : 0;
  }

  const matchLabel = teamMatch.name || `Match #${teamMatch.matchnum}`;

  // 8. Match is playing now
  if (matchesAhead === 0) {
    return {
      shouldAlert: true,
      status: 'ON_FIELD',
      matchesAhead: 0,
      teamMatch,
      currentMatch,
      teamNumber,
      threshold: matchesAheadThreshold,
      message: `Team ${teamNumber} is on the field now for ${matchLabel}!`,
      reason: 'ON_FIELD_NOW'
    };
  }

  // 9. Match within alert threshold
  if (matchesAhead > 0 && matchesAhead <= matchesAheadThreshold) {
    return {
      shouldAlert: true,
      status: 'ALERT_ACTIVE',
      matchesAhead,
      teamMatch,
      currentMatch,
      teamNumber,
      threshold: matchesAheadThreshold,
      message: `Queue Alert: Team ${teamNumber} is ${matchesAhead} match${matchesAhead === 1 ? '' : 'es'} away (${matchLabel})! Proceed to queueing area.`,
      reason: 'WITHIN_THRESHOLD'
    };
  }

  // 10. Match further away
  return {
    shouldAlert: false,
    status: 'WAITING',
    matchesAhead,
    teamMatch,
    currentMatch,
    teamNumber,
    threshold: matchesAheadThreshold,
    message: `Team ${teamNumber} is scheduled for ${matchLabel} (${matchesAhead} matches away).`,
    reason: 'BEYOND_THRESHOLD'
  };
}

/**
 * Deduplication helper that decides whether the chime should actually sound.
 * Prevents ringing on every 30s polling cycle for the same upcoming match.
 * 
 * @param {Object} evaluation - Result of evaluateQueueAlert.
 * @param {string|number|null} lastAlertedMatchId - ID of the last match that sounded the chime.
 * @returns {boolean} True if chime should play.
 */
export function shouldTriggerAudio(evaluation, lastAlertedMatchId) {
  if (!evaluation || !evaluation.shouldAlert || !evaluation.teamMatch) {
    return false;
  }
  if (lastAlertedMatchId && evaluation.teamMatch.id === lastAlertedMatchId) {
    return false;
  }
  return true;
}

/**
 * Generates an instantaneous mock queue alert evaluation for test preview mode.
 * Satisfies Acceptance Criteria #64 and Feature #21.
 * 
 * @param {string} [teamNumber='79813J'] 
 * @param {number} [matchesAhead=2] 
 * @returns {Object} Simulated evaluateQueueAlert result.
 */
export function simulateQueueAlert(teamNumber = '79813J', matchesAhead = 2) {
  const normTeam = String(teamNumber || '79813J').trim().toUpperCase();
  const currentNum = 12;
  const targetNum = currentNum + matchesAhead;

  const currentMatch = {
    id: 9001,
    round: 2,
    matchnum: currentNum,
    name: `Quals #${currentNum}`,
    started: new Date().toISOString(),
    scored: false,
    alliances: [
      { color: 'blue', teams: [{ team: { name: '1111A' } }] },
      { color: 'red', teams: [{ team: { name: '2222B' } }] }
    ]
  };

  const teamMatch = {
    id: 9002,
    round: 2,
    matchnum: targetNum,
    name: `Quals #${targetNum}`,
    started: null,
    scored: false,
    alliances: [
      { color: 'blue', teams: [{ team: { name: normTeam } }] },
      { color: 'red', teams: [{ team: { name: '3333C' } }] }
    ]
  };

  return {
    shouldAlert: true,
    status: matchesAhead === 0 ? 'ON_FIELD' : 'ALERT_ACTIVE',
    matchesAhead,
    teamMatch,
    currentMatch,
    teamNumber: normTeam,
    threshold: matchesAhead,
    message: matchesAhead === 0
      ? `[TEST MODE] Team ${normTeam} is on the field now for Quals #${targetNum}!`
      : `[TEST MODE] Queue Alert: Team ${normTeam} is ${matchesAhead} match${matchesAhead === 1 ? '' : 'es'} away (Quals #${targetNum})! Proceed to queueing area.`,
    reason: matchesAhead === 0 ? 'ON_FIELD_NOW' : 'WITHIN_THRESHOLD',
    isSimulation: true
  };
}
