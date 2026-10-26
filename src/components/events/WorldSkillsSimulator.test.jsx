import { describe, it, expect } from 'vitest';
import { 
  extractSkillsArray, 
  calculateSimulatedRank, 
  getStrategyCoaching,
  BENCHMARK_SKILLS_DISTRIBUTION,
  TOTAL_BENCHMARK_TEAMS
} from './WorldSkillsSimulator.jsx';

describe('WorldSkillsSimulator - Logic & Calculation Unit Tests', () => {

  describe('extractSkillsArray normalization', () => {
    it('gracefully returns empty array for null/undefined/empty input', () => {
      expect(extractSkillsArray(null)).toEqual([]);
      expect(extractSkillsArray(undefined)).toEqual([]);
      expect(extractSkillsArray([])).toEqual([]);
    });

    it('normalizes RobotEvents style nested scores and calculates totalScore correctly', () => {
      const raw = [
        {
          id: 101,
          team: { code: '1111A', name: 'Alpha' },
          scores: { driver: 40, programming: 30, score: 70 },
          rank: 2
        },
        {
          id: 102,
          team: { code: '2222B', name: 'Beta' },
          scores: { driver: 50, programming: 50, score: 100 },
          rank: 1
        }
      ];

      const res = extractSkillsArray(raw);
      expect(res).toHaveLength(2);
      expect(res[0].teamNumber).toBe('2222B');
      expect(res[0].totalScore).toBe(100);
      expect(res[0].progScore).toBe(50);
      expect(res[0].driverScore).toBe(50);
      expect(res[1].teamNumber).toBe('1111A');
      expect(res[1].totalScore).toBe(70);
    });

    it('correctly sorts ties using VIQRC tiebreaker rules (higher programming first)', () => {
      const raw = [
        {
          id: 1,
          team: { code: 'TEAM_DRIVER_HEAVY' },
          driverScore: 70,
          progScore: 30,
          totalScore: 100
        },
        {
          id: 2,
          team: { code: 'TEAM_PROG_HEAVY' },
          driverScore: 40,
          progScore: 60,
          totalScore: 100
        }
      ];

      const res = extractSkillsArray(raw);
      expect(res[0].teamNumber).toBe('TEAM_PROG_HEAVY');
      expect(res[0].progScore).toBe(60);
      expect(res[1].teamNumber).toBe('TEAM_DRIVER_HEAVY');
    });
  });

  describe('calculateSimulatedRank with Live / Standings Data', () => {
    const mockStandings = [
      { rank: 1, teamNumber: '1111A', totalScore: 150, progScore: 75, driverScore: 75 },
      { rank: 2, teamNumber: '2222B', totalScore: 130, progScore: 70, driverScore: 60 },
      { rank: 3, teamNumber: '3333C', totalScore: 110, progScore: 50, driverScore: 60 },
      { rank: 4, teamNumber: '4444D', totalScore: 90, progScore: 40, driverScore: 50 },
      { rank: 5, teamNumber: '5555E', totalScore: 70, progScore: 30, driverScore: 40 }
    ];

    it('detects World #1 when simulated score exceeds current leader', () => {
      const res = calculateSimulatedRank(160, 80, 80, mockStandings, 100);
      expect(res.rank).toBe(1);
      expect(res.gapToFirst).toBe(0);
      expect(res.percentile).toBe('Top 0.1%');
      expect(res.nextTier).toBeNull();
    });

    it('detects placement between rank 2 and 3 correctly', () => {
      // 120 pts is between 130 (rank 2) and 110 (rank 3) -> should place rank 3
      const res = calculateSimulatedRank(120, 60, 60, mockStandings, 100);
      expect(res.rank).toBe(3);
      expect(res.gapToFirst).toBe(30); // 150 - 120
      expect(res.leaderScore).toBe(150);
      expect(res.leaderTeam).toBe('1111A');
    });

    it('breaks ties using programming score against real standing', () => {
      // Ties 110 with 3333C (who has prog: 50).
      // Case 1: simProg = 55 -> beats 3333C -> rank 3
      const beatsTie = calculateSimulatedRank(110, 55, 55, mockStandings, 100);
      expect(beatsTie.rank).toBe(3);

      // Case 2: simProg = 45 -> loses tiebreak to 3333C -> rank 4
      const losesTie = calculateSimulatedRank(110, 45, 65, mockStandings, 100);
      expect(losesTie.rank).toBe(4);
    });

    it('calculates next tier milestone points needed', () => {
      // Placing rank 4 (100 pts) in 100 teams -> next milestone is Top 1 (rank 1)
      const res = calculateSimulatedRank(100, 50, 50, mockStandings, 100);
      expect(res.nextTier).toBeDefined();
      expect(res.nextTier.targetRank).toBe(1);
      expect(res.nextTier.pointsNeeded).toBe(51); // 150 + 1 - 100 = 51
    });
  });

  describe('calculateSimulatedRank with Fallback Benchmark Distribution', () => {
    it('interpolates benchmark rank accurately for high scores (175 pts)', () => {
      const res = calculateSimulatedRank(175, 90, 85, [], TOTAL_BENCHMARK_TEAMS);
      expect(res.rank).toBeLessThanOrEqual(10);
      expect(res.percentile).toMatch(/Top (0\.5%|1%)/);
      expect(res.gapToFirst).toBe(BENCHMARK_SKILLS_DISTRIBUTION[0].totalScore - 175);
    });

    it('interpolates benchmark rank accurately for median score (52 pts)', () => {
      const res = calculateSimulatedRank(52, 20, 32, [], TOTAL_BENCHMARK_TEAMS);
      expect(res.rank).toBeGreaterThanOrEqual(450);
      expect(res.rank).toBeLessThanOrEqual(550);
      expect(res.percentile).toMatch(/Top 50%/);
    });

    it('handles zero or near-zero scores gracefully', () => {
      const res = calculateSimulatedRank(0, 0, 0, [], TOTAL_BENCHMARK_TEAMS);
      expect(res.rank).toBeGreaterThanOrEqual(1000);
      expect(res.gapToFirst).toBe(BENCHMARK_SKILLS_DISTRIBUTION[0].totalScore);
    });
  });

  describe('getStrategyCoaching coaching engine', () => {
    const dummyI18n = {
      beginnerTitle: 'Beginner',
      beginnerDesc: 'Desc',
      autoWarningTitle: 'Auto 0 Warning',
      autoWarningDesc: 'Desc',
      imbalanceDriverTitle: 'Driver Heavy',
      imbalanceDriverDesc: 'Desc',
      imbalanceAutoTitle: 'Auto Heavy',
      imbalanceAutoDesc: 'Desc',
      balancedTitle: 'Balanced',
      balancedDesc: 'Desc',
      eliteTitle: 'Elite',
      eliteDesc: 'Desc'
    };

    it('returns beginner coaching when total score is 0', () => {
      const c = getStrategyCoaching(0, 0, dummyI18n);
      expect(c.type).toBe('beginner');
    });

    it('returns auto_zero warning when programming score is 0 and driver > 0', () => {
      const c = getStrategyCoaching(50, 0, dummyI18n);
      expect(c.type).toBe('auto_zero');
      expect(c.title).toBe('Auto 0 Warning');
    });

    it('returns imbalance_driver when auto is less than 35% of driver', () => {
      const c = getStrategyCoaching(60, 15, dummyI18n); // 15 < 60 * 0.35 = 21
      expect(c.type).toBe('imbalance_driver');
    });

    it('returns imbalance_auto when driver is less than 35% of auto', () => {
      const c = getStrategyCoaching(10, 50, dummyI18n); // 10 < 50 * 0.35 = 17.5
      expect(c.type).toBe('imbalance_auto');
    });

    it('returns elite coaching when total score is >= 160 and balanced', () => {
      const c = getStrategyCoaching(85, 80, dummyI18n);
      expect(c.type).toBe('elite');
    });

    it('returns balanced coaching when driver and auto are well matched', () => {
      const c = getStrategyCoaching(45, 45, dummyI18n);
      expect(c.type).toBe('balanced');
    });
  });

});
