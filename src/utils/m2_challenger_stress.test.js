/**
 * src/utils/m2_challenger_stress.test.js
 * 
 * Empirical Stress Test Suite for Milestone M2:
 * 1. OPR Engine (opr.js):
 *    - Randomized 8-team 12-match tournament invariant: Mean(OPR) ≈ 1/2 Mean(Score) within 1e-3
 *    - Disconnected graph configurations (independent clusters, isolated nodes)
 *    - Extreme match scores (zero, negative, 10,000+, 1e7)
 * 2. Events Storage (eventsStorage.js):
 *    - Rapid read/write/toggle favorites (1,000 operations)
 *    - QuotaExceededError and SecurityError simulation (in-memory state resilience)
 *    - Queue alert config validation (out-of-bounds matchesAhead, invalid team numbers)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateOPR,
  calculateMeanScore,
  calculateMeanOPR,
  solveLinearSystem,
  parseMatch
} from './opr.js';

import {
  STORAGE_KEY_FAVORITES,
  STORAGE_KEY_QUEUE_ALERTS,
  DEFAULT_FAVORITES,
  DEFAULT_QUEUE_ALERT_CONFIG,
  getFavorites,
  isFavorite,
  toggleFavorite,
  addFavorite,
  removeFavorite,
  clearFavorites,
  getQueueAlertConfig,
  setQueueAlertConfig,
  resetQueueAlertConfig,
  subscribeToStorage
} from './eventsStorage.js';

// ============================================================================
// PART 1: OPR Mathematical Stress Tests
// ============================================================================
describe('Milestone M2 - OPR Engine Empirical Stress Tests', () => {

  describe('1. Randomized 8-Team 12-Match Tournament Invariant', () => {
    /**
     * Helper to generate a random 3-regular graph on 8 teams (each team plays 3 matches, total 12 matches).
     */
    function generateRandom3RegularGraph(teams) {
      const maxRetries = 200;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const points = [];
        for (const t of teams) {
          points.push(t, t, t);
        }
        // Fisher-Yates shuffle
        for (let i = points.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [points[i], points[j]] = [points[j], points[i]];
        }

        const edges = [];
        let valid = true;
        const seen = new Set();
        for (let i = 0; i < points.length; i += 2) {
          const u = points[i];
          const v = points[i + 1];
          if (u === v) {
            valid = false;
            break;
          }
          const edgeKey = u < v ? `${u}-${v}` : `${v}-${u}`;
          if (seen.has(edgeKey)) {
            valid = false;
            break;
          }
          seen.add(edgeKey);
          edges.push([u, v]);
        }
        if (valid && edges.length === 12) {
          return edges;
        }
      }

      // Deterministic 3-regular fallback (Hamiltonian cycle + antipodal diagonals)
      return [
        [teams[0], teams[1]], [teams[1], teams[2]], [teams[2], teams[3]], [teams[3], teams[4]],
        [teams[4], teams[5]], [teams[5], teams[6]], [teams[6], teams[7]], [teams[7], teams[0]],
        [teams[0], teams[4]], [teams[1], teams[5]], [teams[2], teams[6]], [teams[3], teams[7]]
      ];
    }

    it('empirically satisfies Mean(OPR) ≈ 1/2 Mean(Score) within 10^-3 across 25 randomized 8-team 12-match tournaments', () => {
      const teams = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'];
      const iterations = 25;

      for (let iter = 0; iter < iterations; iter++) {
        const pairings = generateRandom3RegularGraph(teams);
        expect(pairings.length).toBe(12);

        // Verify balanced match distribution: exactly 3 matches per team
        const counts = {};
        for (const t of teams) counts[t] = 0;
        for (const [u, v] of pairings) {
          counts[u]++;
          counts[v]++;
        }
        for (const t of teams) {
          expect(counts[t]).toBe(3);
        }

        // Random scores between 20 and 160 points (typical VIQRC Level Up score range)
        const matches = pairings.map(([t1, t2]) => ({
          teams: [t1, t2],
          score: Math.floor(Math.random() * 141) + 20,
          scored: true
        }));

        const meanScore = calculateMeanScore(matches);
        const halfMeanScore = meanScore / 2;

        // 1. Unregularized least squares (lambda = 0) satisfies invariant to machine precision (< 1e-10)
        const oprExact = calculateOPR(teams, matches, { lambda: 0, decimals: null });
        const meanOPRExact = calculateMeanOPR(oprExact);
        expect(Math.abs(meanOPRExact - halfMeanScore)).toBeLessThan(1e-10);

        // 2. Regularized (lambda = 1e-5) satisfies invariant strictly within 1e-3 (< 0.001)
        const oprReg = calculateOPR(teams, matches, { lambda: 1e-5, decimals: null });
        const meanOPRReg = calculateMeanOPR(oprReg);
        expect(Math.abs(meanOPRReg - halfMeanScore)).toBeLessThan(1e-3);
      }
    });

    it('verifies that rounding to 1 decimal place satisfies Mean(OPR) ≈ 1/2 Mean(Score) within 0.05', () => {
      const teams = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'];
      const pairings = [
        ['T1', 'T2'], ['T2', 'T3'], ['T3', 'T4'], ['T4', 'T5'],
        ['T5', 'T6'], ['T6', 'T7'], ['T7', 'T8'], ['T8', 'T1'],
        ['T1', 'T5'], ['T2', 'T6'], ['T3', 'T7'], ['T4', 'T8']
      ];
      const matches = pairings.map(([t1, t2], i) => ({
        teams: [t1, t2],
        score: 40 + i * 5,
        scored: true
      }));

      const meanScore = calculateMeanScore(matches);
      const oprDefault = calculateOPR(teams, matches); // default decimals = 1
      const meanOPR = calculateMeanOPR(oprDefault);

      // Max possible error for 1-decimal rounding of 8 numbers is 0.05
      expect(Math.abs(meanOPR - meanScore / 2)).toBeLessThan(0.05);
    });
  });

  describe('2. Disconnected Alliance Graph Configurations', () => {
    it('returns finite, non-NaN, non-Infinite numbers for two completely separate 4-team clusters', () => {
      // Cluster A: T1, T2, T3, T4
      // Cluster B: T5, T6, T7, T8
      // Zero cross-cluster matches
      const teams = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'];
      const matches = [
        { teams: ['T1', 'T2'], score: 50, scored: true },
        { teams: ['T2', 'T3'], score: 70, scored: true },
        { teams: ['T3', 'T4'], score: 60, scored: true },
        { teams: ['T4', 'T1'], score: 40, scored: true },
        { teams: ['T5', 'T6'], score: 90, scored: true },
        { teams: ['T6', 'T7'], score: 110, scored: true },
        { teams: ['T7', 'T8'], score: 130, scored: true },
        { teams: ['T8', 'T5'], score: 100, scored: true }
      ];

      const opr = calculateOPR(teams, matches);

      expect(Object.keys(opr).length).toBe(8);
      for (const t of teams) {
        expect(opr).toHaveProperty(t);
        const val = opr[t];
        expect(typeof val).toBe('number');
        expect(Number.isNaN(val)).toBe(false);
        expect(Number.isFinite(val)).toBe(true);
      }

      // Verify cluster A values sum to half of cluster A match total
      // Cluster A matches: 50 + 70 + 60 + 40 = 220 -> each played 2 matches -> sum of OPRs = 110
      const sumClusterA = opr['T1'] + opr['T2'] + opr['T3'] + opr['T4'];
      expect(sumClusterA).toBeCloseTo(110, 0);

      // Cluster B matches: 90 + 110 + 130 + 100 = 430 -> each played 2 matches -> sum of OPRs = 215
      const sumClusterB = opr['T5'] + opr['T6'] + opr['T7'] + opr['T8'];
      expect(sumClusterB).toBeCloseTo(215, 0);
    });

    it('handles multiple collinear isolated pairs without crashing', () => {
      // 4 disjoint pairs
      const teams = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const matches = [
        { teams: ['A', 'B'], score: 60, scored: true },
        { teams: ['C', 'D'], score: 80, scored: true },
        { teams: ['E', 'F'], score: 100, scored: true },
        { teams: ['G', 'H'], score: 120, scored: true }
      ];

      const opr = calculateOPR(teams, matches);

      for (const t of teams) {
        expect(Number.isFinite(opr[t])).toBe(true);
        expect(Number.isNaN(opr[t])).toBe(false);
      }

      // Ridge regression splits pair scores equally between collinear partners
      expect(opr['A']).toBeCloseTo(30, 0);
      expect(opr['B']).toBeCloseTo(30, 0);
      expect(opr['C']).toBeCloseTo(40, 0);
      expect(opr['D']).toBeCloseTo(40, 0);
      expect(opr['E']).toBeCloseTo(50, 0);
      expect(opr['F']).toBeCloseTo(50, 0);
      expect(opr['G']).toBeCloseTo(60, 0);
      expect(opr['H']).toBeCloseTo(60, 0);
    });

    it('handles mixed active clusters and completely unplayed teams', () => {
      const teams = ['ACTIVE_1', 'ACTIVE_2', 'IDLE_1', 'IDLE_2'];
      const matches = [
        { teams: ['ACTIVE_1', 'ACTIVE_2'], score: 88, scored: true }
      ];

      const opr = calculateOPR(teams, matches);

      expect(opr['ACTIVE_1']).toBeCloseTo(44, 0);
      expect(opr['ACTIVE_2']).toBeCloseTo(44, 0);
      expect(opr['IDLE_1']).toBe(0);
      expect(opr['IDLE_2']).toBe(0);
    });
  });

  describe('3. Extreme Score Stress Tests', () => {
    it('handles all-zero scores without producing NaN or negative zeroes', () => {
      const teams = ['T1', 'T2', 'T3'];
      const matches = [
        { teams: ['T1', 'T2'], score: 0, scored: true },
        { teams: ['T2', 'T3'], score: 0, scored: true },
        { teams: ['T3', 'T1'], score: 0, scored: true }
      ];

      const opr = calculateOPR(teams, matches);

      expect(opr).toEqual({ T1: 0, T2: 0, T3: 0 });
      for (const val of Object.values(opr)) {
        expect(Object.is(val, -0)).toBe(false); // strictly +0
      }
    });

    it('solves negative match scores correctly and proportionally', () => {
      // Symmetrical negative system:
      // T1 + T2 = -60
      // T2 + T3 = -80
      // T1 + T3 = -100
      // Expected: T1 = -40, T2 = -20, T3 = -60
      const teams = ['T1', 'T2', 'T3'];
      const matches = [
        { teams: ['T1', 'T2'], score: -60, scored: true },
        { teams: ['T2', 'T3'], score: -80, scored: true },
        { teams: ['T3', 'T1'], score: -100, scored: true }
      ];

      const opr = calculateOPR(teams, matches);

      expect(opr['T1']).toBe(-40);
      expect(opr['T2']).toBe(-20);
      expect(opr['T3']).toBe(-60);
    });

    it('solves very large scores (10,000+ to 10,000,000+) without numerical breakdown', () => {
      const teams = ['T1', 'T2', 'T3'];
      const largeMatches = [
        { teams: ['T1', 'T2'], score: 60000, scored: true },
        { teams: ['T2', 'T3'], score: 80000, scored: true },
        { teams: ['T3', 'T1'], score: 100000, scored: true }
      ];

      // Exact unregularized least-squares
      const oprLargeExact = calculateOPR(teams, largeMatches, { lambda: 0 });
      expect(oprLargeExact['T1']).toBe(40000);
      expect(oprLargeExact['T2']).toBe(20000);
      expect(oprLargeExact['T3']).toBe(60000);

      // Default regularized (lambda: 1e-4) relative precision test (< 0.01% shrinkage)
      const oprLargeReg = calculateOPR(teams, largeMatches);
      expect(Math.abs(oprLargeReg['T1'] - 40000) / 40000).toBeLessThan(1e-4);
      expect(Math.abs(oprLargeReg['T2'] - 20000) / 20000).toBeLessThan(1e-4);
      expect(Math.abs(oprLargeReg['T3'] - 60000) / 60000).toBeLessThan(1e-4);

      // Mega scores: 1e7
      const megaMatches = [
        { teams: ['T1', 'T2'], score: 60000000, scored: true },
        { teams: ['T2', 'T3'], score: 80000000, scored: true },
        { teams: ['T3', 'T1'], score: 100000000, scored: true }
      ];

      const oprMega = calculateOPR(teams, megaMatches, { lambda: 0 });
      expect(oprMega['T1']).toBe(40000000);
      expect(oprMega['T2']).toBe(20000000);
      expect(oprMega['T3']).toBe(60000000);
    });

    it('preserves scale linearity across 6 orders of magnitude', () => {
      const baseMatches = [
        { teams: ['A', 'B'], score: 60, scored: true },
        { teams: ['B', 'C'], score: 80, scored: true },
        { teams: ['A', 'C'], score: 100, scored: true }
      ];

      const scales = [0.001, 1, 10, 100, 10000, 100000];
      for (const scale of scales) {
        const scaledMatches = baseMatches.map(m => ({ ...m, score: m.score * scale }));
        const opr = calculateOPR(['A', 'B', 'C'], scaledMatches, { lambda: 0, decimals: null });

        // Relative precision within 1e-6
        expect(Math.abs(opr['A'] - 40 * scale) / (40 * scale)).toBeLessThan(1e-6);
        expect(Math.abs(opr['B'] - 20 * scale) / (20 * scale)).toBeLessThan(1e-6);
        expect(Math.abs(opr['C'] - 60 * scale) / (60 * scale)).toBeLessThan(1e-6);
      }
    });
  });
});

// ============================================================================
// PART 2: Events Storage Stress Tests
// ============================================================================
describe('Milestone M2 - Events Storage Empirical Stress Tests', () => {
  let mockStorage = {};
  let originalWindow;
  let eventListeners = {};

  beforeEach(() => {
    mockStorage = {};
    eventListeners = {};
    originalWindow = globalThis.window;

    if (typeof globalThis.CustomEvent === 'undefined') {
      globalThis.CustomEvent = class CustomEvent {
        constructor(type, eventInitDict) {
          this.type = type;
          this.detail = eventInitDict?.detail;
        }
      };
    }

    const localStorageMock = {
      getItem: vi.fn((key) => mockStorage[key] || null),
      setItem: vi.fn((key, value) => {
        mockStorage[key] = String(value);
      }),
      removeItem: vi.fn((key) => {
        delete mockStorage[key];
      }),
      clear: vi.fn(() => {
        mockStorage = {};
      })
    };

    globalThis.window = {
      localStorage: localStorageMock,
      dispatchEvent: vi.fn((event) => {
        const type = event?.type;
        if (eventListeners[type]) {
          eventListeners[type].forEach(fn => fn(event));
        }
        return true;
      }),
      addEventListener: vi.fn((type, fn) => {
        if (!eventListeners[type]) eventListeners[type] = [];
        eventListeners[type].push(fn);
      }),
      removeEventListener: vi.fn((type, fn) => {
        if (eventListeners[type]) {
          eventListeners[type] = eventListeners[type].filter(cb => cb !== fn);
        }
      }),
      CustomEvent: globalThis.CustomEvent
    };

    clearFavorites();
    resetQueueAlertConfig();
  });

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  describe('1. Rapid Read/Write/Toggle Favorites Stress Test', () => {
    it('executes 1,000 rapid sequential toggles across 50 items maintaining perfect consistency', () => {
      const numTeams = 50;
      const teams = Array.from({ length: numTeams }, (_, i) => `TEAM_${i + 1}`);

      // 1000 toggles: 20 per team => each team toggled an even number of times => final state empty!
      for (let cycle = 0; cycle < 20; cycle++) {
        for (const t of teams) {
          toggleFavorite('teams', t);
        }
      }

      const favsAfterEvenToggles = getFavorites();
      expect(favsAfterEvenToggles.teams).toEqual([]);

      // 50 toggles: each team toggled once => all 50 in favorites
      for (const t of teams) {
        const added = toggleFavorite('teams', t);
        expect(added).toBe(true);
      }

      const favsAfterOddToggles = getFavorites();
      expect(favsAfterOddToggles.teams.length).toBe(numTeams);
      expect(new Set(favsAfterOddToggles.teams).size).toBe(numTeams);

      // Verify case normalization consistency under rapid toggles
      expect(isFavorite('teams', 'team_1')).toBe(true);
      expect(isFavorite('teams', 'TEAM_1')).toBe(true);
      expect(isFavorite('teams', '  team_50  ')).toBe(true);
    });

    it('handles rapid interleaved reads, writes, and event favorites without data corruption', () => {
      for (let i = 0; i < 200; i++) {
        const sku = `RE-VIQRC-26-${String(i % 10).padStart(4, '0')}`;
        addFavorite('events', sku);
        expect(isFavorite('events', sku)).toBe(true);

        const current = getFavorites();
        expect(Array.isArray(current.events)).toBe(true);
      }

      const finalFavs = getFavorites();
      // Exactly 10 unique SKUs (mod 10)
      expect(finalFavs.events.length).toBe(10);
    });
  });

  describe('2. QuotaExceededError and SecurityError Simulation', () => {
    it('seamlessly maintains in-memory state when setItem throws QuotaExceededError', () => {
      // Simulate quota exhaustion
      window.localStorage.setItem.mockImplementation(() => {
        const err = new Error('The quota has been exceeded.');
        err.name = 'QuotaExceededError';
        err.code = 22;
        throw err;
      });

      // Favorites operations should succeed in-memory
      const added1 = toggleFavorite('teams', '79813A');
      const added2 = toggleFavorite('teams', '79813B');
      expect(added1).toBe(true);
      expect(added2).toBe(true);

      const inMemoryFavs = getFavorites();
      expect(inMemoryFavs.teams).toContain('79813A');
      expect(inMemoryFavs.teams).toContain('79813B');
      expect(isFavorite('teams', '79813A')).toBe(true);

      // Toggle off one team in-memory
      const removed = toggleFavorite('teams', '79813A');
      expect(removed).toBe(false);
      expect(isFavorite('teams', '79813A')).toBe(false);
      expect(isFavorite('teams', '79813B')).toBe(true);

      // Queue alert config should also maintain in-memory state
      const updatedConfig = setQueueAlertConfig({
        teamNumber: '79813B',
        matchesAhead: 4,
        enabled: true
      });
      expect(updatedConfig.teamNumber).toBe('79813B');
      expect(updatedConfig.matchesAhead).toBe(4);
      expect(updatedConfig.enabled).toBe(true);

      const reReadConfig = getQueueAlertConfig();
      expect(reReadConfig.teamNumber).toBe('79813B');
      expect(reReadConfig.matchesAhead).toBe(4);
      expect(reReadConfig.enabled).toBe(true);
    });

    it('seamlessly maintains in-memory state when localStorage access throws SecurityError (Safari Private Browsing)', () => {
      // Completely block localStorage access via getter exception
      Object.defineProperty(window, 'localStorage', {
        get() {
          const err = new Error('SecurityError: The operation is insecure.');
          err.name = 'SecurityError';
          throw err;
        },
        configurable: true
      });

      // Verify initialization does not crash
      const initialFavs = getFavorites();
      expect(initialFavs).toEqual({ events: [], teams: [] });

      // Add favorites in memory
      toggleFavorite('teams', '99999Z');
      toggleFavorite('events', 'RE-PRIVATE-001');

      expect(isFavorite('teams', '99999Z')).toBe(true);
      expect(isFavorite('events', 'RE-PRIVATE-001')).toBe(true);

      const memFavs = getFavorites();
      expect(memFavs.teams).toEqual(['99999Z']);
      expect(memFavs.events).toEqual(['RE-PRIVATE-001']);

      // Configure queue alert in memory
      const cfg = setQueueAlertConfig({ teamNumber: '99999Z', matchesAhead: 5, enabled: true });
      expect(cfg.matchesAhead).toBe(5);

      const fetchedCfg = getQueueAlertConfig();
      expect(fetchedCfg.teamNumber).toBe('99999Z');
      expect(fetchedCfg.matchesAhead).toBe(5);
      expect(fetchedCfg.enabled).toBe(true);
    });
  });

  describe('3. Queue Alert Config Validation & Bounds Stress Test', () => {
    it('strictly clamps out-of-bounds matchesAhead to default 2', () => {
      const testCases = [
        { input: -100, expected: 2 },
        { input: -1, expected: 2 },
        { input: 0, expected: 2 },
        { input: 11, expected: 2 },
        { input: 50, expected: 2 },
        { input: 99999, expected: 2 },
        { input: NaN, expected: 2 },
        { input: 'invalid', expected: 2 },
        { input: null, expected: 2 },
        { input: undefined, expected: 2 }
      ];

      for (const { input, expected } of testCases) {
        const config = setQueueAlertConfig({ matchesAhead: input });
        expect(config.matchesAhead).toBe(expected);
      }
    });

    it('preserves valid boundary values for matchesAhead: exactly 1 and exactly 10', () => {
      const minValid = setQueueAlertConfig({ matchesAhead: 1 });
      expect(minValid.matchesAhead).toBe(1);

      const maxValid = setQueueAlertConfig({ matchesAhead: 10 });
      expect(maxValid.matchesAhead).toBe(10);

      const midValid = setQueueAlertConfig({ matchesAhead: 5 });
      expect(midValid.matchesAhead).toBe(5);
    });

    it('robustly sanitizes team numbers with whitespace, null, undefined, and lowercase', () => {
      // Lowercase + extra whitespace
      const c1 = setQueueAlertConfig({ teamNumber: '   79813j   ' });
      expect(c1.teamNumber).toBe('79813J');

      // Null teamNumber
      const c2 = setQueueAlertConfig({ teamNumber: null });
      expect(c2.teamNumber).toBe('');

      // Undefined teamNumber
      const c3 = setQueueAlertConfig({ teamNumber: undefined });
      expect(c3.teamNumber).toBe('');

      // Numeric teamNumber
      const c4 = setQueueAlertConfig({ teamNumber: 88888 });
      expect(c4.teamNumber).toBe('88888');

      // Whitespace only
      const c5 = setQueueAlertConfig({ teamNumber: '      ' });
      expect(c5.teamNumber).toBe('');
    });

    it('safely handles non-object payloads in setQueueAlertConfig without throwing', () => {
      expect(() => setQueueAlertConfig(null)).not.toThrow();
      expect(() => setQueueAlertConfig(undefined)).not.toThrow();
      expect(() => setQueueAlertConfig('corrupted string')).not.toThrow();
      expect(() => setQueueAlertConfig(12345)).not.toThrow();
      expect(() => setQueueAlertConfig([])).not.toThrow();

      const res = setQueueAlertConfig(null);
      expect(res.matchesAhead).toBe(2);
      expect(res.teamNumber).toBe('');
      expect(res.enabled).toBe(false);
    });
  });
});
