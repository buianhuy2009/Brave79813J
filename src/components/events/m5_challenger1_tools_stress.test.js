import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import WorldSkillsSimulator, { 
  calculateSimulatedRank, 
  extractSkillsArray, 
  getStrategyCoaching,
  BENCHMARK_SKILLS_DISTRIBUTION,
  TOTAL_BENCHMARK_TEAMS 
} from './WorldSkillsSimulator';
import { 
  evaluateQueueAlert, 
  shouldTriggerAudio, 
  simulateQueueAlert,
  setAudioMuted,
  isAudioMuted
} from '../../utils/audioAlert';
import { 
  getQueueAlertConfig, 
  setQueueAlertConfig, 
  resetQueueAlertConfig 
} from '../../utils/eventsStorage';
import TeamCompareModal from './TeamCompareModal';
import * as eventsApi from '../../utils/eventsApi';

describe('Milestone M5 Empirical Challenger Stress Test Suite', () => {

  // ==========================================================================
  // BLOCK 1: WorldSkillsSimulator Empirical Stress Tests
  // ==========================================================================
  describe('Block 1: WorldSkillsSimulator - Boundary, Extreme, Decimal & Fallback Stress', () => {
    const mockStandings = [
      { rank: 1, teamNumber: '1111A', totalScore: 160, progScore: 80, driverScore: 80 },
      { rank: 2, teamNumber: '2222B', totalScore: 140, progScore: 70, driverScore: 70 },
      { rank: 3, teamNumber: '3333C', totalScore: 120, progScore: 60, driverScore: 60 },
      { rank: 4, teamNumber: '4444D', totalScore: 100, progScore: 50, driverScore: 50 },
      { rank: 5, teamNumber: '5555E', totalScore: 80, progScore: 40, driverScore: 40 }
    ];

    describe('Boundary & Extreme Score Inputs', () => {
      it('stress-tests boundary score (0, 0): zero score placing and coaching', () => {
        // Test with live standings where totalPopulation equals list length
        const liveExactRes = calculateSimulatedRank(0, 0, 0, mockStandings, mockStandings.length);
        expect(liveExactRes.rank).toBe(6);
        expect(liveExactRes.gapToFirst).toBe(160);
        expect(liveExactRes.leaderScore).toBe(160);
        expect(liveExactRes.leaderTeam).toBe('1111A');

        // Test with live standings sample scaled to larger effective population (5 teams sample in 100 population)
        const liveScaledRes = calculateSimulatedRank(0, 0, 0, mockStandings, 100);
        expect(liveScaledRes.rank).toBe(81); // Proportionally interpolated below lowest sample score (80)
        expect(liveScaledRes.gapToFirst).toBe(160);

        // Test with fallback benchmark distribution
        const benchRes = calculateSimulatedRank(0, 0, 0, [], TOTAL_BENCHMARK_TEAMS);
        expect(benchRes.rank).toBeGreaterThanOrEqual(1000);
        expect(benchRes.rank).toBeLessThanOrEqual(TOTAL_BENCHMARK_TEAMS);
        expect(benchRes.gapToFirst).toBe(BENCHMARK_SKILLS_DISTRIBUTION[0].totalScore); // 212
        expect(benchRes.percentile).toBe('Top 95%');

        // Strategy coaching at (0, 0)
        const t = { beginnerTitle: 'Beginner', beginnerDesc: 'Desc' };
        const coaching = getStrategyCoaching(0, 0, t);
        expect(coaching.type).toBe('beginner');
        expect(coaching.title).toBe('Beginner');
      });

      it('stress-tests extreme score (200, 200) = 400 pts: surpasses World #1', () => {
        // Exceeds mock leader (160)
        const liveRes = calculateSimulatedRank(400, 200, 200, mockStandings, 100);
        expect(liveRes.rank).toBe(1);
        expect(liveRes.gapToFirst).toBe(0);
        expect(liveRes.percentile).toBe('Top 0.1%');
        expect(liveRes.nextTier).toBeNull();

        // Exceeds benchmark leader (212)
        const benchRes = calculateSimulatedRank(400, 200, 200, [], TOTAL_BENCHMARK_TEAMS);
        expect(benchRes.rank).toBe(1);
        expect(benchRes.gapToFirst).toBe(0);
        expect(benchRes.percentile).toBe('Top 0.1%');
        expect(benchRes.nextTier).toBeNull();

        // Coaching for world-class score >= 160
        const t = { eliteTitle: 'Elite', eliteDesc: 'Desc' };
        const coaching = getStrategyCoaching(200, 200, t);
        expect(coaching.type).toBe('elite');
      });

      it('stress-tests negative scores (-10, -5) = -15 pts: gracefully clamped without crash', () => {
        // With benchmark fallback
        const benchRes = calculateSimulatedRank(-15, -5, -10, [], TOTAL_BENCHMARK_TEAMS);
        expect(benchRes.rank).toBe(TOTAL_BENCHMARK_TEAMS); // Capped at pop limit (1250)
        expect(benchRes.percentile).toBe('Top 95%');
        expect(benchRes.gapToFirst).toBe(BENCHMARK_SKILLS_DISTRIBUTION[0].totalScore - (-15)); // 227
        expect(Number.isNaN(benchRes.rank)).toBe(false);
        expect(Number.isNaN(benchRes.gapToFirst)).toBe(false);

        // Coaching doesn't crash on negative values
        const t = { beginnerTitle: 'Beginner', beginnerDesc: 'Desc' };
        const coaching = getStrategyCoaching(-10, -5, t);
        expect(coaching).toBeDefined();
        expect(coaching.type).toBeDefined();
      });

      it('stress-tests decimal score inputs (42.5, 33.7) = 76.2 pts', () => {
        // With exact population: places 6th (below 80 pts rank 5)
        const liveExactRes = calculateSimulatedRank(76.2, 33.7, 42.5, mockStandings, mockStandings.length);
        expect(liveExactRes.rank).toBe(6);
        expect(liveExactRes.gapToFirst).toBeCloseTo(160 - 76.2, 1);
        expect(Number.isNaN(liveExactRes.gapToFirst)).toBe(false);

        // With scaled population (100 teams): interpolates to rank 9
        const liveScaledRes = calculateSimulatedRank(76.2, 33.7, 42.5, mockStandings, 100);
        expect(liveScaledRes.rank).toBe(9);
        expect(liveScaledRes.gapToFirst).toBeCloseTo(160 - 76.2, 1);

        // With benchmark fallback
        const benchRes = calculateSimulatedRank(76.2, 33.7, 42.5, [], TOTAL_BENCHMARK_TEAMS);
        expect(typeof benchRes.rank).toBe('number');
        expect(Number.isInteger(benchRes.rank)).toBe(true);
        expect(benchRes.gapToFirst).toBeCloseTo(212 - 76.2, 1);
      });

      it('stress-tests null and undefined inputs: handles safe coercion without component crash', () => {
        // Null coercion in calculateSimulatedRank
        const nullRes = calculateSimulatedRank(0, 0, 0, [], TOTAL_BENCHMARK_TEAMS);
        expect(nullRes.rank).toBeGreaterThanOrEqual(1000);

        // Render WorldSkillsSimulator component with undefined initial props (uses defaults: driver=40, prog=30)
        const htmlUndefined = renderToStaticMarkup(
          React.createElement(WorldSkillsSimulator, {
            isOpen: true,
            initialDriverScore: undefined,
            initialProgScore: undefined,
            lang: 'en'
          })
        );
        expect(htmlUndefined).toContain('World Skills Simulator');
        expect(htmlUndefined).toContain('70'); // 40 + 30
        expect(htmlUndefined).not.toContain('NaN');

        // Render WorldSkillsSimulator component with null initial props
        const htmlNull = renderToStaticMarkup(
          React.createElement(WorldSkillsSimulator, {
            isOpen: true,
            initialDriverScore: null,
            initialProgScore: null,
            lang: 'en'
          })
        );
        expect(htmlNull).toContain('World Skills Simulator');
        expect(htmlNull).toContain('0');
        expect(htmlNull).not.toContain('NaN');
      });
    });

    describe('Percentile Calculations, Tier Labeling & Gap Math', () => {
      it('calculates exact gap to #1 across varied positions', () => {
        // 1. Equal to World #1
        const r1 = calculateSimulatedRank(160, 80, 80, mockStandings, 100);
        expect(r1.gapToFirst).toBe(0);

        // 2. Trailing by 35 points
        const r2 = calculateSimulatedRank(125, 65, 60, mockStandings, 100);
        expect(r2.gapToFirst).toBe(35); // 160 - 125

        // 3. Trailing by 100 points
        const r3 = calculateSimulatedRank(60, 30, 30, mockStandings, 100);
        expect(r3.gapToFirst).toBe(100); // 160 - 60
      });

      it('evaluates next rank milestone tier gap correctly', () => {
        // Placing at 130 pts (rank 3, between 140 and 120): next tier is rank 1
        const r = calculateSimulatedRank(130, 65, 65, mockStandings, 100);
        expect(r.nextTier).toBeDefined();
        expect(r.nextTier.targetRank).toBe(1);
        expect(r.nextTier.pointsNeeded).toBe(31); // 160 + 1 - 130 = 31 pts
        expect(r.nextTier.label).toBe('World #1');
      });

      it('maps raw percentiles to badge labels appropriately', () => {
        // Rank 1 of 1000: Top 0.1%
        const p1 = calculateSimulatedRank(250, 125, 125, mockStandings, 1000);
        expect(p1.percentile).toBe('Top 0.1%');

        // Score placing in top 5%
        const mockLarge = Array.from({ length: 100 }, (_, i) => ({
          rank: i + 1,
          teamNumber: `TEAM_${i + 1}`,
          totalScore: 200 - i * 2,
          progScore: 100 - i,
          driverScore: 100 - i
        }));

        // Placing around rank 4 in 100 teams -> top 5%
        const p4 = calculateSimulatedRank(195, 98, 97, mockLarge, 100);
        expect(p4.percentile).toBe('Top 5%');

        // Placing around rank 8 in 100 teams -> top 10%
        const p8 = calculateSimulatedRank(187, 94, 93, mockLarge, 100);
        expect(p8.percentile).toBe('Top 10%');

        // Placing around rank 20 in 100 teams -> top 25%
        const p20 = calculateSimulatedRank(163, 82, 81, mockLarge, 100);
        expect(p20.percentile).toBe('Top 25%');

        // Placing around rank 45 in 100 teams -> top 50%
        const p45 = calculateSimulatedRank(113, 57, 56, mockLarge, 100);
        expect(p45.percentile).toBe('Top 50%');
      });
    });

    describe('Graceful Fallback to Baseline Benchmark', () => {
      it('falls back to benchmark when raw list is empty or null with population provided', () => {
        // Empty array fallback
        const resEmpty = calculateSimulatedRank(98, 44, 54, []);
        expect(resEmpty.rank).toBe(100);
        expect(resEmpty.leaderScore).toBe(BENCHMARK_SKILLS_DISTRIBUTION[0].totalScore);

        // Null list with explicit totalPopulation fallback
        const resNullWithPop = calculateSimulatedRank(98, 44, 54, null, TOTAL_BENCHMARK_TEAMS);
        expect(resNullWithPop.rank).toBe(100);
        expect(resNullWithPop.leaderScore).toBe(BENCHMARK_SKILLS_DISTRIBUTION[0].totalScore);

        // Empirical finding: Calling calculateSimulatedRank(..., null) omitting 5th param evaluates default param totalPopulation = sortedList.length, throwing TypeError
        expect(() => calculateSimulatedRank(98, 44, 54, null)).toThrow(TypeError);
      });

      it('renders benchmark source indicator when season skills API fails', async () => {
        vi.spyOn(eventsApi, 'getSeasonSkills').mockRejectedValueOnce(new Error('Network offline 503'));

        const html = renderToStaticMarkup(
          React.createElement(WorldSkillsSimulator, {
            isOpen: true,
            initialDriverScore: 50,
            initialProgScore: 40,
            lang: 'en'
          })
        );

        // Modal renders without throwing
        expect(html).toContain('World Skills Simulator');
        expect(html).toContain('90'); // 50 + 40
        expect(html).toContain('Evaluated against official Level Up season benchmark baseline');

        vi.restoreAllMocks();
      });

      it('renders benchmark source indicator when season skills API returns empty data', async () => {
        vi.spyOn(eventsApi, 'getSeasonSkills').mockResolvedValueOnce({ data: [] });

        const html = renderToStaticMarkup(
          React.createElement(WorldSkillsSimulator, {
            isOpen: true,
            initialDriverScore: 60,
            initialProgScore: 30,
            lang: 'vi'
          })
        );

        expect(html).toContain('Mô Phỏng Xếp Hạng Kỹ Năng Thế Giới');
        expect(html).toContain('90');
        expect(html).toContain('Tính toán dựa trên chuẩn phân phối điểm Level Up mùa giải');

        vi.restoreAllMocks();
      });
    });
  });

  // ==========================================================================
  // BLOCK 2: Queue Alert Evaluation & Deduplication Empirical Stress Tests
  // ==========================================================================
  describe('Block 2: Queue Alert Evaluation & Deduplication Stress', () => {
    const mockSchedule = [
      {
        id: 101,
        matchnum: 1,
        round: 2,
        name: 'Quals 1',
        scored: true,
        alliances: [{ teams: [{ team: { name: '79813J' } }, { team: { name: '12345A' } }] }]
      },
      {
        id: 102,
        matchnum: 2,
        round: 2,
        name: 'Quals 2',
        scored: true,
        alliances: [{ teams: [{ team: { name: '2222B' } }, { team: { name: '3333C' } }] }]
      },
      {
        id: 103,
        matchnum: 3,
        round: 2,
        name: 'Quals 3',
        scored: false, // Currently on field / up next
        alliances: [{ teams: [{ team: { name: '4444D' } }, { team: { name: '5555E' } }] }]
      },
      {
        id: 104,
        matchnum: 4,
        round: 2,
        name: 'Quals 4',
        scored: false,
        alliances: [{ teams: [{ team: { name: '6666F' } }, { team: { name: '7777G' } }] }]
      },
      {
        id: 105,
        matchnum: 5,
        round: 2,
        name: 'Quals 5',
        scored: false,
        alliances: [{ teams: [{ team: { name: '79813J' } }, { team: { name: '8888H' } }] }]
      },
      {
        id: 106,
        matchnum: 6,
        round: 2,
        name: 'Quals 6',
        scored: false,
        alliances: [{ teams: [{ team: { name: '9999I' } }, { team: { name: '1010J' } }] }]
      }
    ];

    describe('Distance and State Evaluation', () => {
      it('triggers ALERT_ACTIVE when target team is exactly N matches away (N=2, threshold=2)', () => {
        // Current match is Quals 3 (matchnum 3). Target team 79813J plays in Quals 5 (matchnum 5).
        // Distance: 5 - 3 = 2 matches away.
        const res = evaluateQueueAlert(mockSchedule, {
          teamNumber: '79813J',
          matchesAhead: 2,
          enabled: true
        });

        expect(res.shouldAlert).toBe(true);
        expect(res.status).toBe('ALERT_ACTIVE');
        expect(res.matchesAhead).toBe(2);
        expect(res.teamMatch.id).toBe(105);
        expect(res.currentMatch.id).toBe(103);
        expect(res.message).toContain('2 matches away');
        expect(res.reason).toBe('WITHIN_THRESHOLD');
      });

      it('does NOT trigger alert when target team is N+1 matches away (N=1, distance=2)', () => {
        // Distance is 2, but threshold is set to 1 match ahead
        const res = evaluateQueueAlert(mockSchedule, {
          teamNumber: '79813J',
          matchesAhead: 1,
          enabled: true
        });

        expect(res.shouldAlert).toBe(false);
        expect(res.status).toBe('WAITING');
        expect(res.matchesAhead).toBe(2);
        expect(res.reason).toBe('BEYOND_THRESHOLD');
      });

      it('triggers ON_FIELD alert when target team is exactly 0 matches away (playing now)', () => {
        // Target team 4444D is playing in Quals 3 (currently active match)
        const res = evaluateQueueAlert(mockSchedule, {
          teamNumber: '4444D',
          matchesAhead: 2,
          enabled: true
        });

        expect(res.shouldAlert).toBe(true);
        expect(res.status).toBe('ON_FIELD');
        expect(res.matchesAhead).toBe(0);
        expect(res.teamMatch.id).toBe(103);
        expect(res.message).toContain('on the field now');
        expect(res.reason).toBe('ON_FIELD_NOW');
      });

      it('returns COMPLETED status when target team has already completed all scheduled matches', () => {
        // Target team 12345A only played in Quals 1 (already scored)
        const res = evaluateQueueAlert(mockSchedule, {
          teamNumber: '12345A',
          matchesAhead: 2,
          enabled: true
        });

        expect(res.shouldAlert).toBe(false);
        expect(res.status).toBe('COMPLETED');
        expect(res.teamMatch).toBeNull();
        expect(res.reason).toBe('ALL_MATCHES_COMPLETED');
      });

      it('returns NOT_FOUND when team does not exist in division schedule', () => {
        const res = evaluateQueueAlert(mockSchedule, {
          teamNumber: 'UNKNOWN_9999',
          matchesAhead: 2,
          enabled: true
        });

        expect(res.shouldAlert).toBe(false);
        expect(res.status).toBe('NOT_FOUND');
        expect(res.reason).toBe('TEAM_NOT_IN_DIVISION');
      });

      it('returns NO_MATCHES when schedule is empty array', () => {
        const res = evaluateQueueAlert([], {
          teamNumber: '79813J',
          matchesAhead: 2,
          enabled: true
        });

        expect(res.shouldAlert).toBe(false);
        expect(res.status).toBe('NO_MATCHES');
        expect(res.reason).toBe('SCHEDULE_EMPTY');
      });
    });

    describe('Alert Audio Chime Deduplication', () => {
      it('suppresses repeated audio chimes for the same match across polling cycles', () => {
        const evalQuals5 = {
          shouldAlert: true,
          status: 'ALERT_ACTIVE',
          matchesAhead: 2,
          teamMatch: { id: 105, name: 'Quals 5' }
        };

        // Cycle 1: First detection of Quals 5 approaching (lastAlertedMatchId = null)
        const cycle1 = shouldTriggerAudio(evalQuals5, null);
        expect(cycle1).toBe(true); // Sound the chime!

        // Assume system records lastAlertedMatchId = 105
        const lastAlertedMatchId = 105;

        // Cycle 2: 30 seconds later, Quals 5 is still 2 matches away
        const cycle2 = shouldTriggerAudio(evalQuals5, lastAlertedMatchId);
        expect(cycle2).toBe(false); // DEDUPLICATED! Audio chime must not ring again.

        // Cycle 3: 60 seconds later, Quals 5 is now 1 match away (same match ID 105)
        const evalQuals5Closer = { ...evalQuals5, matchesAhead: 1 };
        const cycle3 = shouldTriggerAudio(evalQuals5Closer, lastAlertedMatchId);
        expect(cycle3).toBe(false); // DEDUPLICATED! Still match 105.

        // Cycle 4: Quals 5 finishes, and next team match Quals 12 (id: 112) approaches
        const evalQuals12 = {
          shouldAlert: true,
          status: 'ALERT_ACTIVE',
          matchesAhead: 2,
          teamMatch: { id: 112, name: 'Quals 12' }
        };
        const cycle4 = shouldTriggerAudio(evalQuals12, lastAlertedMatchId);
        expect(cycle4).toBe(true); // NEW MATCH! Chime sounds for Match 112.
      });

      it('returns false for shouldTriggerAudio when shouldAlert is false or match is missing', () => {
        expect(shouldTriggerAudio(null, 105)).toBe(false);
        expect(shouldTriggerAudio({ shouldAlert: false }, 105)).toBe(false);
        expect(shouldTriggerAudio({ shouldAlert: true, teamMatch: null }, 105)).toBe(false);
      });
    });
  });

  // ==========================================================================
  // BLOCK 3: TeamCompareModal Data Matrix Empirical Stress Tests
  // ==========================================================================
  describe('Block 3: TeamCompareModal Data Matrix Stress', () => {
    const mockTeams = [
      { id: 1, number: '79813J', team_name: 'Brave Robotics', organization: 'Vinschool', city: 'Hanoi' },
      { id: 2, number: '12345A', team_name: 'RoboStars', organization: 'Star Academy', city: 'Danang' },
      { id: 3, number: '98765B', team_name: 'CyberDragons', organization: 'Hanoi STEM', city: 'Hanoi' },
      { id: 4, number: '11111C', team_name: 'TechTitans', organization: 'Saigon Tech', city: 'HCMC' }
    ];

    const mockRankings = [
      {
        rank: 1,
        team: { name: '79813J' },
        wins: 6,
        losses: 0,
        ties: 0,
        played: 6,
        average_points: 95.0,
        high_score: 118
      },
      {
        rank: 2,
        team: { name: '12345A' },
        wins: 5,
        losses: 1,
        ties: 0,
        played: 6,
        average_points: 82.5,
        high_score: 104
      },
      {
        rank: 3,
        team: { name: '98765B' },
        wins: 3,
        losses: 3,
        ties: 0,
        played: 6,
        average_points: 68.0,
        high_score: 80
      },
      {
        rank: 4,
        team: { name: '11111C' },
        wins: 1,
        losses: 5,
        ties: 0,
        played: 6,
        average_points: 45.0,
        high_score: 55
      }
    ];

    const mockSkills = [
      { team: { code: '79813J' }, type: 'driver', score: 65 },
      { team: { code: '79813J' }, type: 'programming', score: 55 },
      { team: { code: '12345A' }, type: 'driver', score: 50 },
      { team: { code: '12345A' }, type: 'programming', score: 40 },
      { team: { code: '98765B' }, type: 'driver', score: 45 },
      { team: { code: '98765B' }, type: 'programming', score: 25 },
      { team: { code: '11111C' }, type: 'driver', score: 30 },
      { team: { code: '11111C' }, type: 'programming', score: 10 }
    ];

    const mockOprMap = {
      '79813J': 52.4,
      '12345A': 41.2,
      '98765B': 30.8,
      '11111C': 21.0
    };

    describe('Multi-Team Comparison Scaling (2, 3, and 4 teams)', () => {
      it('correctly renders 2-team comparison matrix with leader badges', () => {
        const html = renderToStaticMarkup(
          React.createElement(TeamCompareModal, {
            isOpen: true,
            initialTeams: ['79813J', '12345A'],
            teams: mockTeams,
            rankings: mockRankings,
            skills: mockSkills,
            oprMap: mockOprMap,
            lang: 'en'
          })
        );

        expect(html).toContain('79813J');
        expect(html).toContain('12345A');
        expect(html).toContain('Cooperative OPR');
        expect(html).toContain('52.4');
        expect(html).toContain('41.2');
        expect(html).toContain('Leader');
        expect(html).not.toContain('NaN');
      });

      it('correctly renders 3-team comparison matrix with 3 color palettes', () => {
        const html = renderToStaticMarkup(
          React.createElement(TeamCompareModal, {
            isOpen: true,
            initialTeams: ['79813J', '12345A', '98765B'],
            teams: mockTeams,
            rankings: mockRankings,
            skills: mockSkills,
            oprMap: mockOprMap,
            lang: 'en'
          })
        );

        expect(html).toContain('79813J');
        expect(html).toContain('12345A');
        expect(html).toContain('98765B');
        expect(html).toContain('text-cyan-600');
        expect(html).toContain('text-violet-600');
        expect(html).toContain('text-amber-600');
        expect(html).not.toContain('NaN');
      });

      it('correctly renders 4-team comparison matrix including emerald theme', () => {
        const html = renderToStaticMarkup(
          React.createElement(TeamCompareModal, {
            isOpen: true,
            initialTeams: ['79813J', '12345A', '98765B', '11111C'],
            teams: mockTeams,
            rankings: mockRankings,
            skills: mockSkills,
            oprMap: mockOprMap,
            lang: 'en'
          })
        );

        expect(html).toContain('79813J');
        expect(html).toContain('12345A');
        expect(html).toContain('98765B');
        expect(html).toContain('11111C');
        expect(html).toContain('text-emerald-600');
        expect(html).not.toContain('NaN');
      });
    });

    describe('Handling Sparse, Missing, Zero, and Corrupted Team Data', () => {
      it('handles teams with missing OPR gracefully (defaults to 0 without NaN)', () => {
        const emptyOpr = {}; // No OPR calculated for any team
        const html = renderToStaticMarkup(
          React.createElement(TeamCompareModal, {
            isOpen: true,
            initialTeams: ['79813J', '12345A'],
            teams: mockTeams,
            rankings: mockRankings,
            skills: mockSkills,
            oprMap: emptyOpr,
            lang: 'en'
          })
        );

        expect(html).toContain('79813J');
        expect(html).toContain('12345A');
        expect(html).not.toContain('NaN');
      });

      it('handles teams with zero matches played (0-0-0) without division-by-zero win rate NaN', () => {
        const zeroMatchRankings = [
          { rank: 1, team: { name: '79813J' }, wins: 0, losses: 0, ties: 0, played: 0, average_points: 0, high_score: 0 },
          { rank: 2, team: { name: '12345A' }, wins: 0, losses: 0, ties: 0, played: 0, average_points: 0, high_score: 0 }
        ];

        const html = renderToStaticMarkup(
          React.createElement(TeamCompareModal, {
            isOpen: true,
            initialTeams: ['79813J', '12345A'],
            teams: mockTeams,
            rankings: zeroMatchRankings,
            skills: [],
            oprMap: {},
            lang: 'en'
          })
        );

        expect(html).toContain('0%'); // Win rate 0%
        expect(html).not.toContain('NaN');
      });

      it('handles teams with no skills scores recorded without crash', () => {
        const emptySkills = [];
        const html = renderToStaticMarkup(
          React.createElement(TeamCompareModal, {
            isOpen: true,
            initialTeams: ['79813J', '12345A'],
            teams: mockTeams,
            rankings: mockRankings,
            skills: emptySkills,
            oprMap: mockOprMap,
            lang: 'en'
          })
        );

        expect(html).toContain('Total Skills');
        expect(html).not.toContain('NaN');
      });

      it('handles teams not in directory roster (unregistered team numbers)', () => {
        const html = renderToStaticMarkup(
          React.createElement(TeamCompareModal, {
            isOpen: true,
            initialTeams: ['GHOST_1', 'GHOST_2'],
            teams: [],
            rankings: [],
            skills: [],
            oprMap: {},
            lang: 'en'
          })
        );

        expect(html).toContain('GHOST_1');
        expect(html).toContain('GHOST_2');
        expect(html).not.toContain('NaN');
      });
    });

    describe('TeamCompareModal Controls & Structure Stress', () => {
      it('renders tab switcher controls for Metric Matrix, Visual Analytics, and Alliance Synergy', () => {
        const html = renderToStaticMarkup(
          React.createElement(TeamCompareModal, {
            isOpen: true,
            initialTeams: ['79813J', '12345A', '98765B'],
            teams: mockTeams,
            rankings: mockRankings,
            skills: mockSkills,
            oprMap: mockOprMap,
            lang: 'en'
          })
        );

        // Verify Tab Switcher buttons
        expect(html).toContain('Metric Matrix');
        expect(html).toContain('Visual Analytics');
        expect(html).toContain('Alliance Synergy');
        expect(html).toContain('Performance Metric');
        expect(html).toContain('Cooperative OPR');
        expect(html).toContain('Autonomous Coding');
        expect(html).toContain('Auto Ratio');
        expect(html).not.toContain('NaN');
      });

      it('enforces maximum 4 teams limit in comparison', () => {
        // Pass 5 teams in initialTeams
        const html = renderToStaticMarkup(
          React.createElement(TeamCompareModal, {
            isOpen: true,
            initialTeams: ['79813J', '12345A', '98765B', '11111C', 'EXTRA_5'],
            teams: mockTeams,
            rankings: mockRankings,
            skills: mockSkills,
            oprMap: mockOprMap,
            lang: 'en'
          })
        );

        // Maximum 4 teams are rendered; EXTRA_5 is strictly excluded
        expect(html).toContain('79813J');
        expect(html).toContain('12345A');
        expect(html).toContain('98765B');
        expect(html).toContain('11111C');
        expect(html).not.toContain('EXTRA_5');
      });
    });
  });

  // ==========================================================================
  // BLOCK 4: Tiebreaking & Positional Round-Mismatch Stress Tests
  // ==========================================================================
  describe('Block 4: Tiebreaking & Cross-Round Positional Evaluation Stress', () => {
    it('applies VIQRC official tiebreaker rules (progScore first, then driverScore)', () => {
      const tiedLeaderboard = [
        { rank: 1, teamNumber: 'TEAM_TOP', totalScore: 120, progScore: 70, driverScore: 50 },
        { rank: 2, teamNumber: 'TEAM_MID', totalScore: 100, progScore: 60, driverScore: 40 },
        { rank: 3, teamNumber: 'TEAM_LOW', totalScore: 80, progScore: 40, driverScore: 40 }
      ];

      // Simulated team has total 100, but higher prog (65 vs 60): should place rank 2 (ahead of TEAM_MID)
      const beatsOnProg = calculateSimulatedRank(100, 65, 35, tiedLeaderboard, tiedLeaderboard.length);
      expect(beatsOnProg.rank).toBe(2);

      // Simulated team has total 100, but lower prog (55 vs 60): should place rank 3 (behind TEAM_MID)
      const losesOnProg = calculateSimulatedRank(100, 55, 45, tiedLeaderboard, tiedLeaderboard.length);
      expect(losesOnProg.rank).toBe(3);

      // Simulated team has total 100, exact tie on prog (60), but higher driver (45 vs 40): should place rank 2
      const beatsOnDriver = calculateSimulatedRank(100, 60, 45, tiedLeaderboard, tiedLeaderboard.length);
      expect(beatsOnDriver.rank).toBe(2);
    });

    it('evaluates queue alert across different tournament rounds using positional array order', () => {
      const crossRoundSchedule = [
        { id: 201, matchnum: 10, round: 2, name: 'Quals 10', scored: false, alliances: [{ teams: [{ team: { name: 'A' } }, { team: { name: 'B' } }] }] },
        { id: 202, matchnum: 11, round: 2, name: 'Quals 11', scored: false, alliances: [{ teams: [{ team: { name: 'C' } }, { team: { name: 'D' } }] }] },
        { id: 203, matchnum: 1, round: 6, name: 'Finals 1', scored: false, alliances: [{ teams: [{ team: { name: 'TARGET' } }, { team: { name: 'E' } }] }] }
      ];

      // Current match is Quals 10 (idx 0). Target team plays in Finals 1 (idx 2, different round number).
      // Positional distance: 2 - 0 = 2 matches away.
      const res = evaluateQueueAlert(crossRoundSchedule, {
        teamNumber: 'TARGET',
        matchesAhead: 2,
        enabled: true
      });

      expect(res.shouldAlert).toBe(true);
      expect(res.status).toBe('ALERT_ACTIVE');
      expect(res.matchesAhead).toBe(2);
      expect(res.teamMatch.id).toBe(203);
    });
  });

});
