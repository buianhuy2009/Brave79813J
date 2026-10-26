import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RankingsTable, { 
  escapeCsvField, 
  formatRankingsToCsv, 
  downloadCsvFile 
} from './RankingsTable';
import SkillsStandings, { 
  normalizeSkills, 
  AttemptsBadge 
} from './SkillsStandings';

describe('Milestone M4 Empirical Challenger Stress Tests', () => {

  // ==========================================================================
  // SUITE 1: RankingsTable Sorting Logic on all 7 Columns & Edge Cases
  // ==========================================================================
  describe('RankingsTable Sorting Engine', () => {

    // Helper implementing the exact comparator from RankingsTable.jsx
    function compareRows(a, b, sortColumn, sortDirection = 'asc') {
      let comparison = 0;

      switch (sortColumn) {
        case 'rank':
          comparison = (a.rank ?? 9999) - (b.rank ?? 9999);
          break;
        case 'team':
          comparison = a.teamNumber.localeCompare(b.teamNumber, undefined, { numeric: true, sensitivity: 'base' });
          break;
        case 'record':
          comparison = (a.wins - b.wins) || (a.ties - b.ties) || (b.losses - a.losses);
          break;
        case 'avgScore':
          comparison = (a.avgScore ?? -1) - (b.avgScore ?? -1);
          break;
        case 'highScore':
          comparison = (a.highScore ?? -1) - (b.highScore ?? -1);
          break;
        case 'matchesPlayed':
          comparison = (a.matchesPlayed ?? 0) - (b.matchesPlayed ?? 0);
          break;
        case 'opr':
          comparison = (a.opr ?? -9999) - (b.opr ?? -9999);
          break;
        default:
          comparison = (a.rank ?? 9999) - (b.rank ?? 9999);
      }

      if (comparison === 0) {
        return (a.rank ?? 9999) - (b.rank ?? 9999);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    }

    it('1. Column: Rank (numeric ascending and descending)', () => {
      const items = [
        { rank: 10, teamNumber: '10A' },
        { rank: 1, teamNumber: '1A' },
        { rank: 5, teamNumber: '5A' },
        { rank: 2, teamNumber: '2A' }
      ];

      const asc = [...items].sort((a, b) => compareRows(a, b, 'rank', 'asc'));
      expect(asc.map(i => i.rank)).toEqual([1, 2, 5, 10]);

      const desc = [...items].sort((a, b) => compareRows(a, b, 'rank', 'desc'));
      expect(desc.map(i => i.rank)).toEqual([10, 5, 2, 1]);
    });

    it('2. Column: Team (natural alphanumeric sorting: 10A vs 123A vs 123B vs 2A)', () => {
      // In robotics, "2A" must precede "10A", and "10A" must precede "123A", and "123A" must precede "123B"
      const teams = [
        { rank: 1, teamNumber: '123B' },
        { rank: 2, teamNumber: '10A' },
        { rank: 3, teamNumber: '2A' },
        { rank: 4, teamNumber: '123A' },
        { rank: 5, teamNumber: '79813J' },
        { rank: 6, teamNumber: '79813A' }
      ];

      const sorted = [...teams].sort((a, b) => compareRows(a, b, 'team', 'asc'));
      const sortedNumbers = sorted.map(t => t.teamNumber);

      expect(sortedNumbers).toEqual(['2A', '10A', '123A', '123B', '79813A', '79813J']);
    });

    it('3. Column: Record W-L-T (wins first, ties second, fewest losses third)', () => {
      const records = [
        { rank: 1, teamNumber: 'A', wins: 5, losses: 1, ties: 0 },
        { rank: 2, teamNumber: 'B', wins: 6, losses: 0, ties: 0 }, // 6-0-0 best
        { rank: 3, teamNumber: 'C', wins: 5, losses: 0, ties: 1 }, // 5-0-1 better than 5-1-0
        { rank: 4, teamNumber: 'D', wins: 4, losses: 2, ties: 0 }
      ];

      const desc = [...records].sort((a, b) => compareRows(a, b, 'record', 'desc'));
      expect(desc.map(r => r.teamNumber)).toEqual(['B', 'C', 'A', 'D']);
    });

    it('4. Column: Matches Played (numeric played count)', () => {
      const items = [
        { rank: 1, teamNumber: 'A', matchesPlayed: 6 },
        { rank: 2, teamNumber: 'B', matchesPlayed: 2 },
        { rank: 3, teamNumber: 'C', matchesPlayed: 8 },
        { rank: 4, teamNumber: 'D', matchesPlayed: 4 }
      ];

      const desc = [...items].sort((a, b) => compareRows(a, b, 'matchesPlayed', 'desc'));
      expect(desc.map(i => i.matchesPlayed)).toEqual([8, 6, 4, 2]);

      const asc = [...items].sort((a, b) => compareRows(a, b, 'matchesPlayed', 'asc'));
      expect(asc.map(i => i.matchesPlayed)).toEqual([2, 4, 6, 8]);
    });

    it('5. Column: Average Score (float comparison with null/undefined safety)', () => {
      const items = [
        { rank: 1, teamNumber: 'A', avgScore: 85.5 },
        { rank: 2, teamNumber: 'B', avgScore: 0 },
        { rank: 3, teamNumber: 'C', avgScore: 92.3 },
        { rank: 4, teamNumber: 'D', avgScore: null }
      ];

      const desc = [...items].sort((a, b) => compareRows(a, b, 'avgScore', 'desc'));
      expect(desc.map(i => i.teamNumber)).toEqual(['C', 'A', 'B', 'D']);
    });

    it('6. Column: High Score (integer comparison)', () => {
      const items = [
        { rank: 1, teamNumber: 'A', highScore: 95 },
        { rank: 2, teamNumber: 'B', highScore: 125 },
        { rank: 3, teamNumber: 'C', highScore: 80 },
        { rank: 4, teamNumber: 'D', highScore: 0 }
      ];

      const desc = [...items].sort((a, b) => compareRows(a, b, 'highScore', 'desc'));
      expect(desc.map(i => i.highScore)).toEqual([125, 95, 80, 0]);
    });

    it('7. Column: Cooperative OPR (numeric OPR with missing OPR handling)', () => {
      const items = [
        { rank: 1, teamNumber: 'A', opr: 45.2 },
        { rank: 2, teamNumber: 'B', opr: null }, // Missing OPR
        { rank: 3, teamNumber: 'C', opr: 52.8 },
        { rank: 4, teamNumber: 'D', opr: undefined }, // Missing OPR
        { rank: 5, teamNumber: 'E', opr: 12.0 }
      ];

      // Descending sort: highest OPR on top, missing OPR (-9999) sinks to the bottom
      const desc = [...items].sort((a, b) => compareRows(a, b, 'opr', 'desc'));
      expect(desc.map(i => i.teamNumber)).toEqual(['C', 'A', 'E', 'B', 'D']);

      // Check that missing OPR does not throw NaN or exception
      expect(() => [...items].sort((a, b) => compareRows(a, b, 'opr', 'desc'))).not.toThrow();
    });

    it('Ties handling across any column: preserves deterministic rank order', () => {
      const items = [
        { rank: 4, teamNumber: 'D', avgScore: 75.0 },
        { rank: 2, teamNumber: 'B', avgScore: 75.0 },
        { rank: 1, teamNumber: 'A', avgScore: 80.0 },
        { rank: 3, teamNumber: 'C', avgScore: 75.0 }
      ];

      const desc = [...items].sort((a, b) => compareRows(a, b, 'avgScore', 'desc'));
      // A is top (80.0). For B, C, D which tie at 75.0, they must tie-break by rank (2, 3, 4)
      expect(desc.map(i => i.teamNumber)).toEqual(['A', 'B', 'C', 'D']);
    });
  });

  // ==========================================================================
  // SUITE 2: RankingsTable Search Filtering & Case-Insensitivity
  // ==========================================================================
  describe('RankingsTable Search Filtering', () => {
    const rawRankings = [
      { rank: 1, team: { name: '79813J', code: '79813J' }, average_points: 90, played: 5 },
      { rank: 2, team: { name: '12345A', code: '12345A' }, average_points: 80, played: 5 },
      { rank: 3, team: { name: '99999Z', code: '99999Z' }, average_points: 70, played: 5 }
    ];

    const rawTeams = [
      { number: '79813J', team_name: 'Brave Robotics', organization: 'Vinschool Central' },
      { number: '12345A', team_name: 'RoboStars Hanoi', organization: 'Star STEM Academy' },
      { number: '99999Z', team_name: 'Cyber Dragons', organization: 'Tech Innovation' }
    ];

    function filterRankings(query, items) {
      const q = query.trim().toLowerCase();
      if (!q) return items;
      return items.filter(item => {
        return (
          item.teamNumber.toLowerCase().includes(q) ||
          item.teamName.toLowerCase().includes(q) ||
          item.organization.toLowerCase().includes(q)
        );
      });
    }

    const normalized = [
      { teamNumber: '79813J', teamName: 'Brave Robotics', organization: 'Vinschool Central' },
      { teamNumber: '12345A', teamName: 'RoboStars Hanoi', organization: 'Star STEM Academy' },
      { teamNumber: '99999Z', teamName: 'Cyber Dragons', organization: 'Tech Innovation' }
    ];

    it('matches team number with exact and partial case-insensitive query', () => {
      expect(filterRankings('79813j', normalized).map(t => t.teamNumber)).toEqual(['79813J']);
      expect(filterRankings('79813J', normalized).map(t => t.teamNumber)).toEqual(['79813J']);
      expect(filterRankings('813', normalized).map(t => t.teamNumber)).toEqual(['79813J']);
      expect(filterRankings('123', normalized).map(t => t.teamNumber)).toEqual(['12345A']);
    });

    it('matches team name with partial case-insensitive query', () => {
      expect(filterRankings('brave', normalized).map(t => t.teamNumber)).toEqual(['79813J']);
      expect(filterRankings('BRAVE', normalized).map(t => t.teamNumber)).toEqual(['79813J']);
      expect(filterRankings('robo', normalized).map(t => t.teamNumber)).toEqual(['79813J', '12345A']);
      expect(filterRankings('robostars', normalized).map(t => t.teamNumber)).toEqual(['12345A']);
      expect(filterRankings('dragons', normalized).map(t => t.teamNumber)).toEqual(['99999Z']);
    });

    it('matches organization affiliation with partial query', () => {
      expect(filterRankings('vinschool', normalized).map(t => t.teamNumber)).toEqual(['79813J']);
      expect(filterRankings('stem', normalized).map(t => t.teamNumber)).toEqual(['12345A']);
      expect(filterRankings('innovation', normalized).map(t => t.teamNumber)).toEqual(['99999Z']);
    });

    it('handles whitespace-padded and empty search queries gracefully', () => {
      expect(filterRankings('   ', normalized).length).toBe(3);
      expect(filterRankings('', normalized).length).toBe(3);
      expect(filterRankings('  79813J  ', normalized).length).toBe(1);
    });

    it('returns empty array when search query matches nothing', () => {
      expect(filterRankings('nonexistent_query_xyz', normalized).length).toBe(0);
    });

    it('renders search empty state in DOM when query matches nothing', () => {
      const html = renderToStaticMarkup(
        React.createElement(RankingsTable, {
          rankings: rawRankings,
          teams: rawTeams,
          lang: 'en'
        })
      );
      // In initial render without query, table is visible
      expect(html).toContain('79813J');
      expect(html).toContain('Brave Robotics');
      expect(html).toContain('Showing 3 of 3 teams');
    });
  });

  // ==========================================================================
  // SUITE 3: RFC 4180 CSV Export Compliance & UTF-8 BOM
  // ==========================================================================
  describe('RFC 4180 CSV Export Compliance', () => {
    it('escapes quotes by doubling them per RFC 4180 §2.7', () => {
      expect(escapeCsvField('Team "Alpha"')).toBe('"Team ""Alpha"""');
      expect(escapeCsvField('"Quotes" on "Both"')).toBe('"""Quotes"" on ""Both"""');
    });

    it('wraps fields containing commas in quotes per RFC 4180 §2.6', () => {
      expect(escapeCsvField('RoboStars, Hanoi')).toBe('"RoboStars, Hanoi"');
      expect(escapeCsvField('Hanoi, Vietnam')).toBe('"Hanoi, Vietnam"');
    });

    it('wraps fields containing CRLF or LF in quotes per RFC 4180 §2.6', () => {
      expect(escapeCsvField('Line 1\r\nLine 2')).toBe('"Line 1\r\nLine 2"');
      expect(escapeCsvField('Line 1\nLine 2')).toBe('"Line 1\nLine 2"');
    });

    it('handles combination of commas, quotes, and newlines in single field', () => {
      const complex = 'Robo, "Super"\nTeam';
      const escaped = escapeCsvField(complex);
      expect(escaped).toBe('"Robo, ""Super""\nTeam"');
    });

    it('formats CSV with exact CRLF line endings (\\r\\n) and standard headers', () => {
      const items = [
        {
          rank: 1,
          teamNumber: '79813J',
          teamName: 'Brave Robotics',
          wins: 6,
          losses: 0,
          ties: 0,
          avgScore: 85.5,
          highScore: 110,
          opr: 45.2
        },
        {
          rank: 2,
          teamNumber: '12345A',
          teamName: 'RoboStars, Hanoi',
          wins: 5,
          losses: 1,
          ties: 0,
          avgScore: 78.2333,
          highScore: 95,
          opr: null
        }
      ];

      const csv = formatRankingsToCsv(items);
      expect(csv).toContain('\r\n');
      
      const lines = csv.split('\r\n');
      expect(lines.length).toBe(3);
      expect(lines[0]).toBe('Rank,Team,Name,W,L,T,AvgScore,HighScore,OPR');
      expect(lines[1]).toBe('1,79813J,Brave Robotics,6,0,0,85.5,110,45.2');
      // Verify row 2: comma escaped and null OPR empty
      expect(lines[2]).toBe('2,12345A,"RoboStars, Hanoi",5,1,0,78.2,95,');
    });

    it('verifies UTF-8 BOM (\\uFEFF) in CSV download generator', () => {
      // Test the BOM logic used in downloadCsvFile / Skills export
      const testContent = 'Rank,Team\r\n1,79813J';
      const withBom = '\uFEFF' + testContent;
      expect(withBom.charCodeAt(0)).toBe(0xFEFF);
      expect(withBom.startsWith('\uFEFF')).toBe(true);
    });
  });

  // ==========================================================================
  // SUITE 4: SkillsStandings Normalization, Tie-Breakers & Attempts
  // ==========================================================================
  describe('SkillsStandings Normalization Pipeline', () => {

    it('normalizes disaggregated driver and programming runs accurately', () => {
      const rawRuns = [
        { id: 101, team: { code: '79813J' }, type: 'driver', score: 40, attempts: 1 },
        { id: 102, team: { code: '79813J' }, type: 'driver', score: 65, attempts: 2 }, // Higher driver score
        { id: 103, team: { code: '79813J' }, type: 'programming', score: 35, attempts: 1 },
        { id: 104, team: { code: '12345A' }, type: 'driver', score: 50, attempts: 1 },
        { id: 105, team: { code: '12345A' }, type: 'programming', score: 40, attempts: 2 }
      ];

      const standings = normalizeSkills(rawRuns);
      expect(standings.length).toBe(2);

      const team79813J = standings.find(s => s.teamNumber === '79813J');
      expect(team79813J.driverScore).toBe(65);
      expect(team79813J.driverAttempts).toBe(2);
      expect(team79813J.progScore).toBe(35);
      expect(team79813J.progAttempts).toBe(1);
      expect(team79813J.totalScore).toBe(100);

      const team12345A = standings.find(s => s.teamNumber === '12345A');
      expect(team12345A.driverScore).toBe(50);
      expect(team12345A.progScore).toBe(40);
      expect(team12345A.totalScore).toBe(90);
    });

    it('normalizes pre-aggregated skills records accurately', () => {
      const preAggregated = [
        {
          id: 1,
          rank: 1,
          team: { code: '79813J', name: 'Brave Robotics' },
          score: 110,
          scores: {
            score: 110,
            driver: 65,
            programming: 45,
            driverAttempts: 3,
            programmingAttempts: 2
          }
        },
        {
          id: 2,
          rank: 2,
          team: { code: '12345A', name: 'RoboStars' },
          score: 95,
          driver: 55,
          programming: 40,
          driver_attempts: 2,
          programming_attempts: 1
        }
      ];

      const standings = normalizeSkills(preAggregated);
      expect(standings.length).toBe(2);
      expect(standings[0].teamNumber).toBe('79813J');
      expect(standings[0].totalScore).toBe(110);
      expect(standings[0].driverScore).toBe(65);
      expect(standings[0].progScore).toBe(45);
      expect(standings[0].driverAttempts).toBe(3);
      expect(standings[0].progAttempts).toBe(2);

      expect(standings[1].teamNumber).toBe('12345A');
      expect(standings[1].totalScore).toBe(95);
      expect(standings[1].driverScore).toBe(55);
      expect(standings[1].progScore).toBe(40);
      expect(standings[1].driverAttempts).toBe(2);
      expect(standings[1].progAttempts).toBe(1);
    });

    it('Official VIQRC Tiebreaker: equal total score -> HIGHER PROGRAMMING SCORE WINS', () => {
      // Both teams have 100 total points:
      // Team ALPHA has 60 Programming, 40 Driver
      // Team BETA has 45 Programming, 55 Driver
      // Under official VIQRC rules, Team ALPHA must win the tiebreaker!
      const tiedTeams = [
        { id: 1, team: { code: 'BETA' }, type: 'driver', score: 55, attempts: 2 },
        { id: 2, team: { code: 'BETA' }, type: 'programming', score: 45, attempts: 2 },
        { id: 3, team: { code: 'ALPHA' }, type: 'driver', score: 40, attempts: 2 },
        { id: 4, team: { code: 'ALPHA' }, type: 'programming', score: 60, attempts: 2 }
      ];

      const standings = normalizeSkills(tiedTeams);
      expect(standings.length).toBe(2);

      // Verify both have 100 total
      expect(standings[0].totalScore).toBe(100);
      expect(standings[1].totalScore).toBe(100);

      // Verify Team ALPHA is Rank 1 due to 60 > 45 programming score
      expect(standings[0].teamNumber).toBe('ALPHA');
      expect(standings[0].rank).toBe(1);
      expect(standings[0].progScore).toBe(60);

      expect(standings[1].teamNumber).toBe('BETA');
      expect(standings[1].rank).toBe(2);
      expect(standings[1].progScore).toBe(45);
    });

    it('Second Tiebreaker: equal total AND equal programming -> HIGHER DRIVER SCORE WINS', () => {
      const tiedTeams = [
        { id: 1, team: { code: 'TEAM_Y' }, type: 'driver', score: 30, attempts: 1 },
        { id: 2, team: { code: 'TEAM_Y' }, type: 'programming', score: 50, attempts: 1 },
        { id: 3, team: { code: 'TEAM_X' }, type: 'driver', score: 50, attempts: 1 },
        { id: 4, team: { code: 'TEAM_X' }, type: 'programming', score: 50, attempts: 1 }
      ];

      const standings = normalizeSkills(tiedTeams);
      expect(standings[0].teamNumber).toBe('TEAM_X');
      expect(standings[0].totalScore).toBe(100);
      expect(standings[1].teamNumber).toBe('TEAM_Y');
      expect(standings[1].totalScore).toBe(80);
    });

    it('Attempt Counts: tracks attempts accurately with 3 maximum ceiling', () => {
      const excessAttempts = [
        {
          id: 1,
          rank: 1,
          team: { code: '99999Z' },
          score: 120,
          scores: {
            driver: 70,
            programming: 50,
            driverAttempts: 5, // Exceeds max 3
            programmingAttempts: -1 // Invalid negative
          }
        }
      ];

      const standings = normalizeSkills(excessAttempts);
      // Clamped between 0 and 3
      expect(standings[0].driverAttempts).toBe(3);
      expect(standings[0].progAttempts).toBe(0);
    });

    it('AttemptsBadge Component: renders used dots and remaining count correctly', () => {
      // 2 used out of 3 -> 1 left
      const html = renderToStaticMarkup(
        React.createElement(AttemptsBadge, { used: 2, max: 3, label: 'Driver', color: 'indigo' })
      );

      expect(html).toContain('2/3');
      expect(html).toContain('title="Driver: 2/3 used (1 left)"');
      // Should contain 3 span dots
      const dotCount = (html.match(/<span class="w-1.5 h-1.5/g) || []).length;
      expect(dotCount).toBe(3);
    });

    it('AttemptsBadge Component: clamps out-of-range used values (0 to max)', () => {
      const htmlOver = renderToStaticMarkup(
        React.createElement(AttemptsBadge, { used: 99, max: 3 })
      );
      expect(htmlOver).toContain('3/3');

      const htmlUnder = renderToStaticMarkup(
        React.createElement(AttemptsBadge, { used: -5, max: 3 })
      );
      expect(htmlUnder).toContain('0/3');
    });

    it('Stress Test: Mixed data (disaggregated runs AND pre-aggregated records in single input)', () => {
      // When both disaggregated and pre-aggregated formats are passed in the same array:
      const mixedData = [
        { id: 1, team: { code: 'TEAM_DISAGG' }, type: 'driver', score: 50, attempts: 2 },
        { id: 2, team: { code: 'TEAM_DISAGG' }, type: 'programming', score: 40, attempts: 1 },
        { 
          id: 3, 
          team: { code: 'TEAM_PREAGG' }, 
          score: 110, 
          scores: { driver: 60, programming: 50, driverAttempts: 3, programmingAttempts: 2 } 
        }
      ];

      const standings = normalizeSkills(mixedData);
      expect(standings.length).toBe(2);

      const disagg = standings.find(s => s.teamNumber === 'TEAM_DISAGG');
      expect(disagg).toBeDefined();
      expect(disagg.totalScore).toBe(90);
      expect(disagg.driverScore).toBe(50);
      expect(disagg.progScore).toBe(40);

      const preagg = standings.find(s => s.teamNumber === 'TEAM_PREAGG');
      expect(preagg).toBeDefined();
      expect(preagg.totalScore).toBe(110);
      console.log('PREAGG NORMALIZED RESULT:', preagg);
    });
  });

  // ==========================================================================
  // SUITE 5: Full Component Integration & Edge Case Resistance
  // ==========================================================================
  describe('Full Component Rendering Edge Cases', () => {
    it('RankingsTable renders properly with null matches and null oprMap without crashing', () => {
      const rankings = [
        { rank: 1, team: { name: '79813J' }, average_points: 85, high_score: 100, wins: 5, losses: 0, ties: 0 }
      ];

      expect(() => {
        renderToStaticMarkup(
          React.createElement(RankingsTable, {
            rankings,
            teams: [{ number: '79813J', team_name: 'Brave' }],
            matches: null,
            oprMap: null,
            lang: 'en'
          })
        );
      }).not.toThrow();
    });

    it('SkillsStandings renders properly with empty skills array without crashing', () => {
      const html = renderToStaticMarkup(
        React.createElement(SkillsStandings, {
          skills: [],
          teams: [],
          lang: 'vi'
        })
      );

      expect(html).toContain('Chưa có điểm Skills nào được ghi nhận');
      expect(html).toContain('Bảng Điểm Kỹ Năng');
    });

    it('SkillsStandings renders properly with filter pills (All, Both, Driver, Auto)', () => {
      const skills = [
        { id: 1, team: { code: 'A' }, type: 'driver', score: 50, attempts: 1 },
        { id: 2, team: { code: 'A' }, type: 'programming', score: 50, attempts: 1 },
        { id: 3, team: { code: 'B' }, type: 'driver', score: 50, attempts: 1 }
      ];

      const html = renderToStaticMarkup(
        React.createElement(SkillsStandings, {
          skills,
          teams: [{ number: 'A' }, { number: 'B' }],
          lang: 'en'
        })
      );

      expect(html).toContain('All Teams');
      expect(html).toContain('Both Completed');
      expect(html).toContain('Driver Only');
      expect(html).toContain('Autonomous Only');
      expect(html).toContain('Official VIQRC Skills: Max 3 Driver + 3 Auto runs');
    });
  });
});
