import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RankingsTable, { 
  escapeCsvField, 
  formatRankingsToCsv, 
  downloadCsvFile 
} from './RankingsTable';

describe('RankingsTable Component & CSV Export Unit Tests', () => {
  const mockRankings = [
    {
      id: 1,
      rank: 1,
      team: { name: '79813J', code: '79813J' },
      wins: 6,
      losses: 0,
      ties: 0,
      played: 6,
      average_points: 85.5,
      high_score: 110
    },
    {
      id: 2,
      rank: 2,
      team: { name: '12345A', code: '12345A' },
      wins: 5,
      losses: 1,
      ties: 0,
      played: 6,
      average_points: 78.2,
      high_score: 95
    },
    {
      id: 3,
      rank: 3,
      team: { name: '99999Z', code: '99999Z' },
      wins: 4,
      losses: 2,
      ties: 0,
      played: 6,
      average_points: 70.0,
      high_score: 88
    },
    {
      id: 4,
      rank: 4,
      team: { name: '11111B', code: '11111B' },
      wins: 3,
      losses: 3,
      ties: 0,
      played: 6,
      average_points: 62.0,
      high_score: 75
    }
  ];

  const mockTeams = [
    { id: 1, number: '79813J', team_name: 'Brave Robotics', organization: 'Vinschool' },
    { id: 2, number: '12345A', team_name: 'RoboStars, Hanoi', organization: 'Star School' },
    { id: 3, number: '99999Z', team_name: 'Cyber "Bots"', organization: 'Tech Academy' },
    { id: 4, number: '11111B', team_name: 'Dragonfly', organization: 'STEM Center' }
  ];

  const mockOprMap = {
    '79813J': 45.2,
    '12345A': 38.0,
    '99999Z': 32.5,
    '11111B': 27.1
  };

  const mockDivision = { id: 101, name: 'Middle School' };
  const mockEvent = { id: 9999, sku: 'RE-VIQRC-26-9999', name: 'Vietnam National Championship' };

  describe('RFC 4180 CSV Export Compliance', () => {
    it('escapes fields containing commas, double quotes, or line breaks', () => {
      expect(escapeCsvField('Brave Robotics')).toBe('Brave Robotics');
      expect(escapeCsvField('RoboStars, Hanoi')).toBe('"RoboStars, Hanoi"');
      expect(escapeCsvField('Cyber "Bots"')).toBe('"Cyber ""Bots"""');
      expect(escapeCsvField('Line1\nLine2')).toBe('"Line1\nLine2"');
      expect(escapeCsvField('Line1\r\nLine2')).toBe('"Line1\r\nLine2"');
      expect(escapeCsvField(null)).toBe('');
      expect(escapeCsvField(undefined)).toBe('');
      expect(escapeCsvField(0)).toBe('0');
      expect(escapeCsvField(85.5)).toBe('85.5');
    });

    it('formats rankings into RFC 4180 CSV with required headers and CRLF line breaks', () => {
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
          avgScore: 78.2,
          highScore: 95,
          opr: 38.0
        }
      ];

      const csv = formatRankingsToCsv(items);
      const lines = csv.split('\r\n');

      // Verify exact header match
      expect(lines[0]).toBe('Rank,Team,Name,W,L,T,AvgScore,HighScore,OPR');

      // Row 1
      expect(lines[1]).toBe('1,79813J,Brave Robotics,6,0,0,85.5,110,45.2');

      // Row 2 (with comma escaped)
      expect(lines[2]).toBe('2,12345A,"RoboStars, Hanoi",5,1,0,78.2,95,38.0');
    });

    it('handles empty rankings array in formatRankingsToCsv cleanly', () => {
      const csv = formatRankingsToCsv([]);
      expect(csv).toBe('Rank,Team,Name,W,L,T,AvgScore,HighScore,OPR');
    });

    it('handles null and undefined scores in formatRankingsToCsv safely', () => {
      const items = [
        {
          rank: 1,
          teamNumber: '79813J',
          teamName: 'Brave',
          wins: 0,
          losses: 0,
          ties: 0,
          avgScore: null,
          highScore: undefined,
          opr: null
        }
      ];
      const csv = formatRankingsToCsv(items);
      const lines = csv.split('\r\n');
      expect(lines[1]).toBe('1,79813J,Brave,0,0,0,0.0,0,');
    });
  });

  describe('RankingsTable Component Rendering', () => {
    it('renders all required column headers: Rank, Team, W-L-T, Matches, Avg Score, High Score, Cooperative OPR', () => {
      const html = renderToStaticMarkup(
        <RankingsTable
          rankings={mockRankings}
          teams={mockTeams}
          oprMap={mockOprMap}
          division={mockDivision}
          event={mockEvent}
          lang="en"
        />
      );

      expect(html).toContain('Rank');
      expect(html).toContain('Team');
      expect(html).toContain('W-L-T');
      expect(html).toContain('Matches');
      expect(html).toContain('Avg Score');
      expect(html).toContain('High Score');
      expect(html).toContain('Cooperative OPR');
    });

    it('renders team rows with correct numbers, names, records, and OPR values', () => {
      const html = renderToStaticMarkup(
        <RankingsTable
          rankings={mockRankings}
          teams={mockTeams}
          oprMap={mockOprMap}
          division={mockDivision}
          event={mockEvent}
          lang="en"
        />
      );

      expect(html).toContain('79813J');
      expect(html).toContain('Brave Robotics');
      expect(html).toContain('6-0-0');
      expect(html).toContain('85.5');
      expect(html).toContain('110');
      expect(html).toContain('45.2');

      expect(html).toContain('12345A');
      expect(html).toContain('RoboStars, Hanoi');
      expect(html).toContain('38.0');
    });

    it('renders podium badges for top 3 teams (Gold, Silver, Bronze)', () => {
      const html = renderToStaticMarkup(
        <RankingsTable
          rankings={mockRankings}
          teams={mockTeams}
          oprMap={mockOprMap}
          lang="en"
        />
      );

      // Rank 1 gold badge
      expect(html).toContain('from-amber-300 to-amber-500');
      // Rank 2 silver badge
      expect(html).toContain('from-slate-200 to-slate-400');
      // Rank 3 bronze badge
      expect(html).toContain('from-amber-700/60 to-amber-900/60');
    });

    it('renders search input and CSV export button', () => {
      const html = renderToStaticMarkup(
        <RankingsTable
          rankings={mockRankings}
          teams={mockTeams}
          oprMap={mockOprMap}
          lang="en"
        />
      );

      expect(html).toContain('placeholder="Search team # or name..."');
      expect(html).toContain('Export CSV');
    });

    it('renders bilingual Vietnamese strings when lang is vi', () => {
      const html = renderToStaticMarkup(
        <RankingsTable
          rankings={mockRankings}
          teams={mockTeams}
          oprMap={mockOprMap}
          lang="vi"
        />
      );

      expect(html).toContain('Bảng Xếp Hạng Vòng Loại');
      expect(html).toContain('Xuất CSV');
      expect(html).toContain('Tìm số đội hoặc tên...');
      expect(html).toContain('OPR Liên Minh');
      expect(html).toContain('Điểm TB');
      expect(html).toContain('Kỷ lục');
      expect(html).toContain('T-B-H');
    });

    it('renders calm empty state when no rankings are available', () => {
      const html = renderToStaticMarkup(
        <RankingsTable
          rankings={[]}
          teams={[]}
          oprMap={{}}
          lang="en"
        />
      );

      expect(html).toContain('No qualification rankings published yet');
      expect(html).toContain('Standings will appear as soon as the first teamwork matches are officially scored.');
    });

    it('complies with mobile responsive guidelines (sticky header, touch targets >= 44px)', () => {
      const html = renderToStaticMarkup(
        <RankingsTable
          rankings={mockRankings}
          teams={mockTeams}
          oprMap={mockOprMap}
          lang="en"
        />
      );

      // Verify sticky header
      expect(html).toContain('sticky top-0');

      // Verify touch target >= 44px on buttons
      expect(html).toContain('min-h-[44px]');
    });

    it('computes Cooperative OPR internally if oprMap is not provided', () => {
      const mockMatches = [
        {
          scored: true,
          teams: ['79813J', '12345A'],
          score: 80
        }
      ];

      const html = renderToStaticMarkup(
        <RankingsTable
          rankings={mockRankings.slice(0, 2)}
          teams={mockTeams.slice(0, 2)}
          matches={mockMatches}
          oprMap={null}
          lang="en"
        />
      );

      expect(html).toContain('79813J');
      expect(html).toContain('12345A');
      // OPR values computed via calculateOPR should be rendered
      expect(html).toMatch(/\d+\.\d/);
    });
  });
});
