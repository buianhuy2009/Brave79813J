import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isAudioSupported,
  isAudioMuted,
  setAudioMuted,
  getAudioContext,
  unlockAudioContext,
  resetAudioContextForTesting,
  playQueueAlertChime,
  ALERT_TONE_FREQUENCIES,
  ALERT_TONE_DURATION,
  getMatchTeamNumbers,
  matchIncludesTeam,
  getCurrentOrNextMatch,
  findUpcomingTeamMatch,
  evaluateQueueAlert,
  shouldTriggerAudio,
  simulateQueueAlert
} from './audioAlert.js';

describe('audioAlert.js - Unit Tests', () => {

  describe('Audio Environment & Fallback Handling', () => {
    let originalWindow;

    beforeEach(() => {
      resetAudioContextForTesting();
      setAudioMuted(false);
      originalWindow = globalThis.window;
    });

    afterEach(() => {
      globalThis.window = originalWindow;
      resetAudioContextForTesting();
      setAudioMuted(false);
    });

    it('returns false for isAudioSupported in non-browser environment', () => {
      delete globalThis.window;
      expect(isAudioSupported()).toBe(false);
      expect(getAudioContext()).toBeNull();
    });

    it('gracefully resolves playQueueAlertChime when Web Audio is unsupported', async () => {
      delete globalThis.window;
      const res = await playQueueAlertChime();
      expect(res.success).toBe(false);
      expect(res.reason).toBe('unsupported');
    });

    it('respects mute setting and returns muted status without playing', async () => {
      setAudioMuted(true);
      expect(isAudioMuted()).toBe(true);

      const res = await playQueueAlertChime();
      expect(res.success).toBe(false);
      expect(res.reason).toBe('muted');

      setAudioMuted(false);
      expect(isAudioMuted()).toBe(false);
    });
  });

  describe('Web Audio API Tone Synthesis & Lifecycle (Mocked)', () => {
    let mockEvents;
    let originalWindow;

    beforeEach(() => {
      resetAudioContextForTesting();
      setAudioMuted(false);
      originalWindow = globalThis.window;

      mockEvents = {
        freqSets: [],
        gainRamps: [],
        gainSets: [],
        startedAt: null,
        stoppedAt: null,
        oscDisconnected: false,
        gainDisconnected: false
      };

      class MockFrequencyParam {
        constructor() { this.value = 440; }
        setValueAtTime(val, time) {
          this.value = val;
          mockEvents.freqSets.push({ val, time });
        }
      }

      class MockGainParam {
        constructor() { this.value = 1; }
        setValueAtTime(val, time) {
          this.value = val;
          mockEvents.gainSets.push({ val, time });
        }
        exponentialRampToValueAtTime(val, time) {
          this.value = val;
          mockEvents.gainRamps.push({ val, time });
        }
      }

      class MockOscillatorNode {
        constructor() {
          this.frequency = new MockFrequencyParam();
          this.type = 'sine';
          this.onended = null;
        }
        connect() {}
        disconnect() { mockEvents.oscDisconnected = true; }
        start(time) { mockEvents.startedAt = time; }
        stop(time) { mockEvents.stoppedAt = time; }
      }

      class MockGainNode {
        constructor() {
          this.gain = new MockGainParam();
        }
        connect() {}
        disconnect() { mockEvents.gainDisconnected = true; }
      }

      class MockAudioContext {
        constructor() {
          this.currentTime = 10.0;
          this.state = 'suspended';
          this.destination = {};
          this._osc = null;
          this._gain = null;
        }
        async resume() {
          this.state = 'running';
        }
        createOscillator() {
          this._osc = new MockOscillatorNode();
          return this._osc;
        }
        createGain() {
          this._gain = new MockGainNode();
          return this._gain;
        }
      }

      globalThis.window = {
        AudioContext: MockAudioContext
      };
    });

    afterEach(() => {
      globalThis.window = originalWindow;
      resetAudioContextForTesting();
    });

    it('detects Web Audio API support when AudioContext is present', () => {
      expect(isAudioSupported()).toBe(true);
    });

    it('unlockAudioContext resumes suspended AudioContext', async () => {
      const unlocked = await unlockAudioContext();
      expect(unlocked).toBe(true);
      const ctx = getAudioContext();
      expect(ctx.state).toBe('running');
    });

    it('synthesizes dual-tone chime with exact D5 (587.33) and A5 (880.00) frequencies', async () => {
      const res = await playQueueAlertChime({ volume: 0.3 });
      expect(res.success).toBe(true);

      // Verify tone frequencies
      expect(mockEvents.freqSets.length).toBeGreaterThanOrEqual(2);
      expect(mockEvents.freqSets[0].val).toBe(ALERT_TONE_FREQUENCIES.D5);
      expect(mockEvents.freqSets[1].val).toBe(ALERT_TONE_FREQUENCIES.A5);
    });

    it('schedules playback with ~0.60s total duration', async () => {
      await playQueueAlertChime();
      expect(mockEvents.startedAt).toBeDefined();
      expect(mockEvents.stoppedAt).toBeDefined();

      const duration = mockEvents.stoppedAt - mockEvents.startedAt;
      expect(duration).toBeCloseTo(ALERT_TONE_DURATION + 0.02, 1);
    });

    it('decays gain curve to safe non-zero positive floor to avoid Web Audio RangeError', async () => {
      await playQueueAlertChime({ volume: 0.4 });
      const lastRamp = mockEvents.gainRamps[mockEvents.gainRamps.length - 1];
      expect(lastRamp.val).toBe(0.0001);
      expect(lastRamp.val).toBeGreaterThan(0);
    });

    it('cleans up oscillator and gain nodes on audio end event', async () => {
      await playQueueAlertChime();
      const ctx = getAudioContext();
      expect(ctx._osc.onended).toBeDefined();
      ctx._osc.onended();
      expect(mockEvents.oscDisconnected).toBe(true);
      expect(mockEvents.gainDisconnected).toBe(true);
    });

    it('handles autoplay block rejection gracefully without crashing', async () => {
      const ctx = getAudioContext();
      ctx.state = 'suspended';
      ctx.resume = vi.fn().mockRejectedValue(new Error('Autoplay policy prevented audio'));

      const res = await playQueueAlertChime();
      expect(res.success).toBe(false);
      expect(res.reason).toBe('autoplay_blocked');
    });
  });

  describe('Match Schedule Parsing & Team Extraction', () => {
    it('extracts team numbers from RobotEvents nested alliances', () => {
      const match = {
        id: 101,
        alliances: [
          { color: 'blue', teams: [{ team: { name: '79813J' } }] },
          { color: 'red', teams: [{ team: { name: '12345A' } }] }
        ]
      };
      const teams = getMatchTeamNumbers(match);
      expect(teams).toEqual(['79813J', '12345A']);
    });

    it('handles alternative team object structures and trims whitespace', () => {
      const match = {
        alliances: [
          { teams: [{ team: { number: '  79813J ' } }, { team: { code: '8888B' } }] },
          { teams: [{ team: '9999C' }] }
        ]
      };
      const teams = getMatchTeamNumbers(match);
      expect(teams).toContain('79813J');
      expect(teams).toContain('8888B');
      expect(teams).toContain('9999C');
    });

    it('returns empty array gracefully when match or alliances are null/malformed', () => {
      expect(getMatchTeamNumbers(null)).toEqual([]);
      expect(getMatchTeamNumbers({})).toEqual([]);
      expect(getMatchTeamNumbers({ alliances: null })).toEqual([]);
      expect(getMatchTeamNumbers({ alliances: [null, { teams: null }] })).toEqual([]);
    });

    it('matchIncludesTeam performs case-insensitive comparison', () => {
      const match = {
        alliances: [{ teams: [{ team: { name: '79813J' } }] }]
      };
      expect(matchIncludesTeam(match, '79813j')).toBe(true);
      expect(matchIncludesTeam(match, ' 79813J ')).toBe(true);
      expect(matchIncludesTeam(match, '1111A')).toBe(false);
    });
  });

  describe('Queue Alert Schedule Evaluator', () => {
    const mockMatches = [
      {
        id: 1, round: 2, matchnum: 1, name: 'Quals 1', scored: true,
        alliances: [{ teams: [{ team: { name: '1111A' } }] }, { teams: [{ team: { name: '2222B' } }] }]
      },
      {
        id: 2, round: 2, matchnum: 2, name: 'Quals 2', scored: true,
        alliances: [{ teams: [{ team: { name: '3333C' } }] }, { teams: [{ team: { name: '4444D' } }] }]
      },
      {
        id: 3, round: 2, matchnum: 3, name: 'Quals 3', started: '2026-10-26T10:00:00Z', scored: false,
        alliances: [{ teams: [{ team: { name: '5555E' } }] }, { teams: [{ team: { name: '6666F' } }] }]
      },
      {
        id: 4, round: 2, matchnum: 4, name: 'Quals 4', scored: false,
        alliances: [{ teams: [{ team: { name: '7777G' } }] }, { teams: [{ team: { name: '8888H' } }] }]
      },
      {
        id: 5, round: 2, matchnum: 5, name: 'Quals 5', scored: false,
        alliances: [{ teams: [{ team: { name: '79813J' } }] }, { teams: [{ team: { name: '9999K' } }] }]
      }
    ];

    it('identifies in-progress match as current match', () => {
      const current = getCurrentOrNextMatch(mockMatches);
      expect(current.id).toBe(3);
      expect(current.matchnum).toBe(3);
    });

    it('identifies upcoming unscored match for team', () => {
      const upcoming = findUpcomingTeamMatch(mockMatches, '79813J');
      expect(upcoming.id).toBe(5);
      expect(upcoming.matchnum).toBe(5);
    });

    it('triggers alert when team match is exactly within threshold (5 - 3 = 2)', () => {
      const evalResult = evaluateQueueAlert(mockMatches, {
        teamNumber: '79813j',
        matchesAhead: 2,
        enabled: true
      });
      expect(evalResult.shouldAlert).toBe(true);
      expect(evalResult.status).toBe('ALERT_ACTIVE');
      expect(evalResult.matchesAhead).toBe(2);
      expect(evalResult.reason).toBe('WITHIN_THRESHOLD');
      expect(evalResult.teamMatch.id).toBe(5);
    });

    it('does not trigger alert when team match is beyond threshold (5 - 3 = 2 > 1)', () => {
      const evalResult = evaluateQueueAlert(mockMatches, {
        teamNumber: '79813J',
        matchesAhead: 1,
        enabled: true
      });
      expect(evalResult.shouldAlert).toBe(false);
      expect(evalResult.status).toBe('WAITING');
      expect(evalResult.matchesAhead).toBe(2);
      expect(evalResult.reason).toBe('BEYOND_THRESHOLD');
    });

    it('triggers special ON_FIELD alert when team is playing right now in current match', () => {
      const evalResult = evaluateQueueAlert(mockMatches, {
        teamNumber: '5555E',
        matchesAhead: 2,
        enabled: true
      });
      expect(evalResult.shouldAlert).toBe(true);
      expect(evalResult.status).toBe('ON_FIELD');
      expect(evalResult.matchesAhead).toBe(0);
      expect(evalResult.reason).toBe('ON_FIELD_NOW');
    });

    it('returns DISABLED when alertConfig.enabled is false', () => {
      const evalResult = evaluateQueueAlert(mockMatches, {
        teamNumber: '79813J',
        matchesAhead: 2,
        enabled: false
      });
      expect(evalResult.shouldAlert).toBe(false);
      expect(evalResult.status).toBe('DISABLED');
      expect(evalResult.reason).toBe('ALERT_DISABLED');
    });

    it('returns NO_TEAM when teamNumber is omitted', () => {
      const evalResult = evaluateQueueAlert(mockMatches, {
        teamNumber: '',
        matchesAhead: 2,
        enabled: true
      });
      expect(evalResult.shouldAlert).toBe(false);
      expect(evalResult.status).toBe('NO_TEAM');
    });

    it('returns NOT_FOUND when team is not registered in this division', () => {
      const evalResult = evaluateQueueAlert(mockMatches, {
        teamNumber: 'NONEXISTENT',
        matchesAhead: 2,
        enabled: true
      });
      expect(evalResult.shouldAlert).toBe(false);
      expect(evalResult.status).toBe('NOT_FOUND');
    });

    it('returns COMPLETED when all matches for team are already scored', () => {
      const evalResult = evaluateQueueAlert(mockMatches, {
        teamNumber: '1111A',
        matchesAhead: 2,
        enabled: true
      });
      expect(evalResult.shouldAlert).toBe(false);
      expect(evalResult.status).toBe('COMPLETED');
    });

    it('safely handles string input for matchesAhead (e.g. from select input)', () => {
      const evalResult = evaluateQueueAlert(mockMatches, {
        teamNumber: '79813J',
        matchesAhead: '2',
        enabled: true
      });
      expect(evalResult.shouldAlert).toBe(true);
      expect(evalResult.threshold).toBe(2);
    });
  });

  describe('Audio Deduplication & Simulation Mode', () => {
    it('prevents repeated audio triggers for the same match ID', () => {
      const evalResult = {
        shouldAlert: true,
        teamMatch: { id: 500, matchnum: 15 }
      };

      // First time: should play
      expect(shouldTriggerAudio(evalResult, null)).toBe(true);
      expect(shouldTriggerAudio(evalResult, 499)).toBe(true);

      // Already played for match 500: should NOT play again
      expect(shouldTriggerAudio(evalResult, 500)).toBe(false);

      // Inactive alert: should NOT play
      expect(shouldTriggerAudio({ shouldAlert: false, teamMatch: { id: 500 } }, null)).toBe(false);
    });

    it('simulateQueueAlert produces valid alert for interactive test mode', () => {
      const sim = simulateQueueAlert('79813J', 2);
      expect(sim.shouldAlert).toBe(true);
      expect(sim.status).toBe('ALERT_ACTIVE');
      expect(sim.matchesAhead).toBe(2);
      expect(sim.teamNumber).toBe('79813J');
      expect(sim.isSimulation).toBe(true);
      expect(sim.teamMatch).toBeDefined();
      expect(sim.currentMatch).toBeDefined();
    });

    it('simulateQueueAlert handles 0 matches ahead as ON_FIELD', () => {
      const sim = simulateQueueAlert('79813J', 0);
      expect(sim.shouldAlert).toBe(true);
      expect(sim.status).toBe('ON_FIELD');
      expect(sim.matchesAhead).toBe(0);
    });
  });
});
