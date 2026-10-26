import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SkillsBar from './SkillsBar';
import RadarChart from './RadarChart';
import TrendChart from './TrendChart';
import RankingsTable, { 
  escapeCsvField, 
  formatRankingsToCsv 
} from '../RankingsTable';
import SkillsStandings, { 
  normalizeSkills, 
  AttemptsBadge 
} from '../SkillsStandings';
import AwardsList, { 
  getAwardCategory 
} from '../AwardsList';
import TeamsList from '../TeamsList';

describe('Milestone M4 Unit Tests (Zero External Libraries)', () => {

  // ==========================================================================
  // 1. SkillsBar Tests
  // ==========================================================================
  describe('SkillsBar SVG Component', () => {
    it('renders normal driver vs programming score distribution correctly', () => {
      const html = renderToStaticMarkup(
        React.createElement(SkillsBar, { driverScore: 45, programmingScore: 35 })
      );
      expect(html).toContain('Driver');
      expect(html).toContain('Programming');
      expect(html).toContain('80');
      expect(html).toContain('56%');
      expect(html).toContain('44%');
      expect(html).toContain('rect');
      expect(html).toContain('role="img"');
    });

    it('renders empty zero state without division by zero errors or NaN', () => {
      const html = renderToStaticMarkup(
        React.createElement(SkillsBar, { driverScore: 0, programmingScore: 0 })
      );
      expect(html).toContain('No skills recorded');
      expect(html).not.toContain('NaN');
    });

    it('renders compact mode for table row embedding', () => {
      const html = renderToStaticMarkup(
        React.createElement(SkillsBar, { driverScore: 60, programmingScore: 40, compact: true })
      );
      expect(html).toContain('100');
      expect(html).toContain('viewBox="0 0 400 10"');
    });

    it('supports Vietnamese localization', () => {
      const html = renderToStaticMarkup(
        React.createElement(SkillsBar, { driverScore: 50, programmingScore: 50, lang: 'vi' })
      );
      expect(html).toContain('Lái tay');
      expect(html).toContain('Lập trình');
      expect(html).toContain('Tổng');
    });
  });

  // ==========================================================================
  // 2. RadarChart Tests
  // ==========================================================================
  describe('RadarChart SVG Component', () => {
    const sampleTeam = {
      avgScore: 82,
      maxScore: 110,
      opr: 45.2,
      skillsScore: 90,
      autoRatio: 40,
      winRate: 75
    };
    const sampleMedian = {
      avgScore: 60,
      maxScore: 85,
      opr: 30,
      skillsScore: 65,
      autoRatio: 30,
      winRate: 50
    };

    it('renders 6-axis polygon, spokes, and median comparison correctly', () => {
      const html = renderToStaticMarkup(
        React.createElement(RadarChart, {
          teamMetrics: sampleTeam,
          medianMetrics: sampleMedian,
          teamNumber: '79813J'
        })
      );
      expect(html).toContain('79813J');
      expect(html).toContain('polygon');
      expect(html).toContain('Avg Score');
      expect(html).toContain('Max Score');
      expect(html).toContain('OPR');
      expect(html).toContain('Skills');
      expect(html).toContain('Auto Ratio');
      expect(html).toContain('Win Rate');
      expect(html).toContain('Division Median');
      expect(html).toContain('sr-only');
    });

    it('handles missing metrics gracefully without NaN', () => {
      const html = renderToStaticMarkup(
        React.createElement(RadarChart, { teamMetrics: {}, medianMetrics: {}, teamNumber: '1234A' })
      );
      expect(html).not.toContain('NaN');
      expect(html).toContain('1234A');
    });

    it('renders Vietnamese axis labels when lang is vi', () => {
      const html = renderToStaticMarkup(
        React.createElement(RadarChart, {
          teamMetrics: sampleTeam,
          medianMetrics: sampleMedian,
          teamNumber: '79813J',
          lang: 'vi'
        })
      );
      expect(html).toContain('Điểm TB');
      expect(html).toContain('Kỷ lục');
      expect(html).toContain('Tỉ lệ Auto');
      expect(html).toContain('Tỉ lệ Thắng');
      expect(html).toContain('Trung vị bảng');
    });
  });

  // ==========================================================================
  // 3. TrendChart Tests
  // ==========================================================================
  describe('TrendChart SVG Component', () => {
    const sampleMatches = [
      { label: 'Q1', score: 60, partner: '1234A' },
      { label: 'Q2', score: 75, partner: '2345B' },
      { label: 'Q3', score: 92, partner: '3456C' },
      { label: 'Q4', score: 85, partner: '4567D' }
    ];

    it('renders trend line, average reference, area gradient, and data points', () => {
      const html = renderToStaticMarkup(
        React.createElement(TrendChart, { data: sampleMatches, metricKey: 'score' })
      );
      expect(html).toContain('Q1');
      expect(html).toContain('Q4');
      expect(html).toContain('Avg: 78.0');
      expect(html).toContain('path');
      expect(html).toContain('circle');
      expect(html).not.toContain('NaN');
    });

    it('handles empty match array gracefully', () => {
      const html = renderToStaticMarkup(
        React.createElement(TrendChart, { data: [] })
      );
      expect(html).toContain('No match data recorded yet');
    });

    it('handles single match array gracefully', () => {
      const html = renderToStaticMarkup(
        React.createElement(TrendChart, { data: [{ label: 'Q1', score: 70 }] })
      );
      expect(html).toContain('Q1');
      expect(html).toContain('Avg: 70.0');
      expect(html).not.toContain('NaN');
    });
  });

  // ==========================================================================
  // 4. RankingsTable & CSV Export Tests
  // ==========================================================================
  describe('RankingsTable Component & RFC 4180 CSV Export', () => {
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
      }
    ];
    const mockTeams = [
      { id: 1, number: '79813J', team_name: 'Brave Robotics', organization: 'Vinschool' },
      { id: 2, number: '12345A', team_name: 'RoboStars, Hanoi', organization: 'Star School' }
    ];
    const mockOpr = { '79813J': 45.2, '12345A': 38.0 };

    it('escapes fields according to RFC 4180 rules', () => {
      expect(escapeCsvField('Standard')).toBe('Standard');
      expect(escapeCsvField('With, Comma')).toBe('"With, Comma"');
      expect(escapeCsvField('With "Quotes"')).toBe('"With ""Quotes"""');
      expect(escapeCsvField(null)).toBe('');
    });

    it('formats standings into RFC 4180 CSV with CRLF lines and required headers', () => {
      const csv = formatRankingsToCsv([
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
        }
      ]);
      const lines = csv.split('\r\n');
      expect(lines[0]).toBe('Rank,Team,Name,W,L,T,AvgScore,HighScore,OPR');
      expect(lines[1]).toBe('1,79813J,Brave Robotics,6,0,0,85.5,110,45.2');
    });

    it('renders 7 columns, team names, podium badges, and touch targets >= 44px', () => {
      const html = renderToStaticMarkup(
        React.createElement(RankingsTable, {
          rankings: mockRankings,
          teams: mockTeams,
          oprMap: mockOpr,
          lang: 'en'
        })
      );
      expect(html).toContain('Rank');
      expect(html).toContain('Team');
      expect(html).toContain('W-L-T');
      expect(html).toContain('Matches');
      expect(html).toContain('Avg Score');
      expect(html).toContain('High Score');
      expect(html).toContain('Cooperative OPR');
      expect(html).toContain('79813J');
      expect(html).toContain('Brave Robotics');
      expect(html).toContain('min-h-[44px]');
      expect(html).toContain('sticky top-0');
    });
  });

  // ==========================================================================
  // 5. SkillsStandings & Attempts Tests
  // ==========================================================================
  describe('SkillsStandings Component & Attempts Counter', () => {
    it('normalizes disaggregated skill records correctly with tiebreakers', () => {
      const raw = [
        { team: { code: '79813J' }, type: 'driver', score: 60, attempts: 2 },
        { team: { code: '79813J' }, type: 'programming', score: 40, attempts: 1 },
        { team: { code: '12345A' }, type: 'driver', score: 70, attempts: 3 },
        { team: { code: '12345A' }, type: 'programming', score: 30, attempts: 2 }
      ];
      const normalized = normalizeSkills(raw, []);
      expect(normalized.length).toBe(2);
      // Both have total 100, but 79813J has higher programming score (40 vs 30) -> rank 1
      expect(normalized[0].teamNumber).toBe('79813J');
      expect(normalized[0].totalScore).toBe(100);
      expect(normalized[0].driverScore).toBe(60);
      expect(normalized[0].progScore).toBe(40);
      expect(normalized[0].driverAttempts).toBe(2);
      expect(normalized[0].progAttempts).toBe(1);

      expect(normalized[1].teamNumber).toBe('12345A');
      expect(normalized[1].totalScore).toBe(100);
      expect(normalized[1].progScore).toBe(30);
    });

    it('renders attempts dots and counts in AttemptsBadge', () => {
      const html = renderToStaticMarkup(
        React.createElement(AttemptsBadge, { used: 2, max: 3, label: 'Auto', color: 'cyan' })
      );
      expect(html).toContain('2/3');
      expect(html).toContain('bg-cyan-500');
    });

    it('renders SkillsStandings table with integrated SkillsBar and search', () => {
      const skillsData = [
        {
          id: 1,
          rank: 1,
          team: { code: '79813J', name: 'Brave' },
          score: 95,
          scores: { driver: 55, programming: 40, driverAttempts: 2, programmingAttempts: 1 }
        }
      ];
      const html = renderToStaticMarkup(
        React.createElement(SkillsStandings, { skills: skillsData, teams: [], lang: 'en' })
      );
      expect(html).toContain('Robot Skills Standings');
      expect(html).toContain('79813J');
      expect(html).toContain('95');
      expect(html).toContain('55');
      expect(html).toContain('40');
      expect(html).toContain('role="img"'); // from integrated SkillsBar
    });
  });

  // ==========================================================================
  // 6. AwardsList Tests
  // ==========================================================================
  describe('AwardsList Component', () => {
    it('classifies award categories accurately', () => {
      expect(getAwardCategory({ title: 'Excellence Award' }).type).toBe('excellence');
      expect(getAwardCategory({ title: 'Teamwork Champions' }).type).toBe('champions');
      expect(getAwardCategory({ title: 'Robot Skills Champion' }).type).toBe('skills');
      expect(getAwardCategory({ title: 'Design Award' }).type).toBe('design');
      expect(getAwardCategory({ title: 'Judges Award' }).type).toBe('judged');
    });

    it('renders awards and collaborative alliance co-winners', () => {
      const awardsData = [
        {
          id: 1,
          title: 'Teamwork 2nd Place Champions',
          teamWinners: [
            { team: { number: '79813J', name: 'Brave' } },
            { team: { number: '12345A', name: 'RoboStars' } }
          ]
        }
      ];
      const html = renderToStaticMarkup(
        React.createElement(AwardsList, { awards: awardsData, lang: 'en' })
      );
      expect(html).toContain('Teamwork 2nd Place Champions');
      expect(html).toContain('79813J');
      expect(html).toContain('12345A');
      expect(html).toContain('Champions');
    });

    it('renders calm pending state when no awards are posted yet', () => {
      const html = renderToStaticMarkup(
        React.createElement(AwardsList, { awards: [], lang: 'en' })
      );
      expect(html).toContain('Awards Not Yet Published');
    });
  });

  // ==========================================================================
  // 7. TeamsList Tests
  // ==========================================================================
  describe('TeamsList Component', () => {
    const teamsData = [
      { id: 1, number: '79813J', team_name: 'Brave', organization: 'Vinschool', city: 'Hanoi', grade: 'Middle School' },
      { id: 2, number: '12345A', team_name: 'RoboStars', organization: 'Star School', city: 'Danang', grade: 'Elementary' }
    ];

    it('renders team list with school and location information', () => {
      const html = renderToStaticMarkup(
        React.createElement(TeamsList, { teams: teamsData, lang: 'en' })
      );
      expect(html).toContain('79813J');
      expect(html).toContain('Brave');
      expect(html).toContain('Vinschool');
      expect(html).toContain('Hanoi');
      expect(html).toContain('12345A');
      expect(html).toContain('Registered Teams');
    });

    it('renders empty state when team list is empty', () => {
      const html = renderToStaticMarkup(
        React.createElement(TeamsList, { teams: [], lang: 'en' })
      );
      expect(html).toContain('No Registered Teams Found');
    });
  });

});
