import { describe, it, expect } from 'vitest';
import {
  calculateOPR,
  solveLinearSystem,
  parseMatch,
  normalizeTeamKey,
  calculateMeanScore,
  calculateMeanOPR,
  roundTo
} from './opr.js';

describe('VIQRC Cooperative OPR Engine', () => {

  // -------------------------------------------------------------------------
  // 1. Analytical Ground Truth Tests
  // -------------------------------------------------------------------------
  describe('Analytical Ground Truth', () => {
    it('solves 3-team match system to exact integer analytical solution: A=40, B=20, C=60', () => {
      // Match 1: A + B = 60
      // Match 2: B + C = 80
      // Match 3: A + C = 100
      // Analytical derivation:
      // 2(A + B + C) = 240 => A + B + C = 120
      // C = 120 - 60 = 60; A = 120 - 80 = 40; B = 120 - 100 = 20.
      const matches = [
        { teams: ['A', 'B'], score: 60, scored: true },
        { teams: ['B', 'C'], score: 80, scored: true },
        { teams: ['A', 'C'], score: 100, scored: true }
      ];

      const opr = calculateOPR(['A', 'B', 'C'], matches);

      expect(opr['A']).toBe(40);
      expect(opr['B']).toBe(20);
      expect(opr['C']).toBe(60);
    });

    it('solves alternative permutation: A=40, B=60, C=20 with 100/80/60 scores', () => {
      // Match 1: A + B = 100
      // Match 2: B + C = 80
      // Match 3: A + C = 60
      // Analytical derivation:
      // 2(A + B + C) = 240 => A + B + C = 120
      // C = 120 - 100 = 20; A = 120 - 80 = 40; B = 120 - 60 = 60.
      const matches = [
        { teams: ['A', 'B'], score: 100, scored: true },
        { teams: ['B', 'C'], score: 80, scored: true },
        { teams: ['A', 'C'], score: 60, scored: true }
      ];

      const opr = calculateOPR(['A', 'B', 'C'], matches);

      expect(opr['A']).toBe(40);
      expect(opr['B']).toBe(60);
      expect(opr['C']).toBe(20);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Mathematical Invariants
  // -------------------------------------------------------------------------
  describe('Mathematical Invariants', () => {
    it('strictly satisfies invariant: Mean(OPR) = 1/2 * Mean(Score) for balanced schedules', () => {
      const matches = [
        { teams: ['A', 'B'], score: 60, scored: true },
        { teams: ['B', 'C'], score: 80, scored: true },
        { teams: ['A', 'C'], score: 100, scored: true }
      ];

      const meanScore = calculateMeanScore(matches);
      expect(meanScore).toBe(80);

      const opr = calculateOPR(['A', 'B', 'C'], matches);
      const meanOPR = calculateMeanOPR(opr);

      // Mean(OPR) = (40 + 20 + 60) / 3 = 40
      // 1/2 * Mean(Score) = 80 / 2 = 40
      expect(meanOPR).toBeCloseTo(meanScore / 2, 4);
    });

    it('verifies scale invariance: multiplying all match scores by k multiplies OPRs by k', () => {
      const baseMatches = [
        { teams: ['A', 'B'], score: 60, scored: true },
        { teams: ['B', 'C'], score: 80, scored: true },
        { teams: ['A', 'C'], score: 100, scored: true }
      ];

      const k = 2.5;
      const scaledMatches = baseMatches.map(m => ({ ...m, score: m.score * k }));

      const baseOpr = calculateOPR(['A', 'B', 'C'], baseMatches);
      const scaledOpr = calculateOPR(['A', 'B', 'C'], scaledMatches);

      expect(scaledOpr['A']).toBeCloseTo(baseOpr['A'] * k, 2);
      expect(scaledOpr['B']).toBeCloseTo(baseOpr['B'] * k, 2);
      expect(scaledOpr['C']).toBeCloseTo(baseOpr['C'] * k, 2);
    });

    it('verifies translation invariance: adding C to each match score adds C/2 to each team OPR in balanced schedules', () => {
      const baseMatches = [
        { teams: ['A', 'B'], score: 60, scored: true },
        { teams: ['B', 'C'], score: 80, scored: true },
        { teams: ['A', 'C'], score: 100, scored: true }
      ];

      const C = 20; // +20 match score => +10 to each team OPR
      const transMatches = baseMatches.map(m => ({ ...m, score: m.score + C }));

      const baseOpr = calculateOPR(['A', 'B', 'C'], baseMatches);
      const transOpr = calculateOPR(['A', 'B', 'C'], transMatches);

      expect(transOpr['A']).toBeCloseTo(baseOpr['A'] + C / 2, 1);
      expect(transOpr['B']).toBeCloseTo(baseOpr['B'] + C / 2, 1);
      expect(transOpr['C']).toBeCloseTo(baseOpr['C'] + C / 2, 1);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Regularization & Edge Case Robustness
  // -------------------------------------------------------------------------
  describe('Regularization & Edge Case Robustness', () => {
    it('handles disconnected alliance subgraphs without NaN or Infinity', () => {
      // Subgraph 1: {A, B} only play together
      // Subgraph 2: {C, D} only play together
      const disconnectedMatches = [
        { teams: ['A', 'B'], score: 60, scored: true },
        { teams: ['C', 'D'], score: 80, scored: true }
      ];

      const opr = calculateOPR(['A', 'B', 'C', 'D'], disconnectedMatches);

      expect(opr).toHaveProperty('A');
      expect(opr).toHaveProperty('B');
      expect(opr).toHaveProperty('C');
      expect(opr).toHaveProperty('D');

      for (const val of Object.values(opr)) {
        expect(Number.isNaN(val)).toBe(false);
        expect(Number.isFinite(val)).toBe(true);
      }

      // Ridge regression splits credit equally between collinear partners
      expect(opr['A']).toBeCloseTo(30, 0);
      expect(opr['B']).toBeCloseTo(30, 0);
      expect(opr['C']).toBeCloseTo(40, 0);
      expect(opr['D']).toBeCloseTo(40, 0);
    });

    it('assigns 0.0 OPR to unplayed registered teams without affecting active teams', () => {
      const matches = [
        { teams: ['A', 'B'], score: 60, scored: true },
        { teams: ['B', 'C'], score: 80, scored: true },
        { teams: ['A', 'C'], score: 100, scored: true }
      ];

      const opr = calculateOPR(['A', 'B', 'C', 'UNPLAYED_1', 'UNPLAYED_2'], matches);

      expect(opr['A']).toBe(40);
      expect(opr['B']).toBe(20);
      expect(opr['C']).toBe(60);
      expect(opr['UNPLAYED_1']).toBe(0);
      expect(opr['UNPLAYED_2']).toBe(0);
    });

    it('ignores unscored / upcoming matches so scheduled matches do not distort ratings', () => {
      const matches = [
        { teams: ['A', 'B'], score: 60, scored: true },
        { teams: ['B', 'C'], score: 80, scored: true },
        { teams: ['A', 'C'], score: 100, scored: true },
        { teams: ['A', 'B'], score: 0, scored: false }, // Upcoming unplayed match
        { teams: ['B', 'C'], score: 0, status: 'scheduled' }
      ];

      const opr = calculateOPR(['A', 'B', 'C'], matches);

      expect(opr['A']).toBe(40);
      expect(opr['B']).toBe(20);
      expect(opr['C']).toBe(60);
    });

    it('handles empty input gracefully', () => {
      expect(calculateOPR([], [])).toEqual({});
      expect(calculateOPR(['A', 'B'], [])).toEqual({ A: 0, B: 0 });
      expect(calculateOPR(null, null)).toEqual({});
      expect(calculateOPR(undefined, undefined)).toEqual({});
    });

    it('handles solo alliance (bye/single robot) matches', () => {
      const matches = [
        { teams: ['A'], score: 35, scored: true },
        { teams: ['A', 'B'], score: 60, scored: true }
      ];

      const opr = calculateOPR(['A', 'B'], matches);
      expect(Number.isFinite(opr['A'])).toBe(true);
      expect(Number.isFinite(opr['B'])).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Schema Compatibility & RobotEvents v2 Integration
  // -------------------------------------------------------------------------
  describe('Schema Compatibility', () => {
    it('seamlessly parses RobotEvents API v2 nested alliance objects', () => {
      const robotEventsMatches = [
        {
          round: 2,
          matchnum: 1,
          scored: true,
          alliances: [
            {
              score: 60,
              teams: [
                { team: { id: 101, name: '79813J' } },
                { team: { id: 102, name: '12345A' } }
              ]
            }
          ]
        },
        {
          round: 2,
          matchnum: 2,
          scored: true,
          alliances: [
            {
              score: 80,
              teams: [
                { team: { id: 102, name: '12345A' } },
                { team: { id: 103, name: '99999Z' } }
              ]
            }
          ]
        },
        {
          round: 2,
          matchnum: 3,
          scored: true,
          alliances: [
            {
              score: 100,
              teams: [
                { team: { id: 101, name: '79813J' } },
                { team: { id: 103, name: '99999Z' } }
              ]
            }
          ]
        }
      ];

      const opr = calculateOPR([], robotEventsMatches);

      expect(opr['79813J']).toBe(40);
      expect(opr['12345A']).toBe(20);
      expect(opr['99999Z']).toBe(60);
    });

    it('normalizes various team object formats (number, name, code, id)', () => {
      expect(normalizeTeamKey('79813J')).toBe('79813J');
      expect(normalizeTeamKey(12345)).toBe('12345');
      expect(normalizeTeamKey({ number: '79813J' })).toBe('79813J');
      expect(normalizeTeamKey({ name: '79813J' })).toBe('79813J');
      expect(normalizeTeamKey({ code: '79813J' })).toBe('79813J');
      expect(normalizeTeamKey({ id: 999 })).toBe('999');
      expect(normalizeTeamKey(null)).toBe(null);
    });
  });

  // -------------------------------------------------------------------------
  // 5. Linear Solver Core Functionality
  // -------------------------------------------------------------------------
  describe('Linear Solver Core (solveLinearSystem)', () => {
    it('solves simple 2x2 linear system', () => {
      // 2x + y = 5
      // x + 2y = 4
      // Solution: x = 2, y = 1
      const A = [
        [2, 1],
        [1, 2]
      ];
      const b = [5, 4];
      const x = solveLinearSystem(A, b);

      expect(x[0]).toBeCloseTo(2, 6);
      expect(x[1]).toBeCloseTo(1, 6);
    });

    it('returns empty array on empty system', () => {
      expect(solveLinearSystem([], [])).toEqual([]);
    });

    it('throws error on mismatched dimensions', () => {
      expect(() => solveLinearSystem([[1, 2], [3, 4]], [1])).toThrow();
    });
  });
});
