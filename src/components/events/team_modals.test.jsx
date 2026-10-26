import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import TeamProfileModal from './TeamProfileModal';
import TeamCompareModal from './TeamCompareModal';

describe('Milestone M5 Team Profile & Team Compare Components', () => {

  // Sample Mock Fixtures
  const mockTeams = [
    {
      id: 1,
      number: '79813J',
      team_name: 'Brave Robotics',
      organization: 'Vinschool Times City',
      city: 'Hanoi',
      region: 'Hanoi',
      country: 'Vietnam',
      grade: 'Middle School'
    },
    {
      id: 2,
      number: '12345A',
      team_name: 'RoboStars',
      organization: 'Star Academy',
      city: 'Danang',
      region: 'Danang',
      country: 'Vietnam',
      grade: 'Middle School'
    },
    {
      id: 3,
      number: '98765B',
      team_name: 'CyberDragons',
      organization: 'Hanoi STEM Center',
      city: 'Hanoi',
      region: 'Hanoi',
      country: 'Vietnam',
      grade: 'Middle School'
    }
  ];

  const mockRankings = [
    {
      rank: 1,
      team: { name: '79813J', code: '79813J' },
      wins: 6,
      losses: 0,
      ties: 0,
      played: 6,
      average_points: 88.5,
      high_score: 112
    },
    {
      rank: 2,
      team: { name: '12345A', code: '12345A' },
      wins: 5,
      losses: 1,
      ties: 0,
      played: 6,
      average_points: 79.0,
      high_score: 98
    },
    {
      rank: 3,
      team: { name: '98765B', code: '98765B' },
      wins: 4,
      losses: 2,
      ties: 0,
      played: 6,
      average_points: 72.5,
      high_score: 85
    }
  ];

  const mockSkills = [
    { team: { code: '79813J' }, type: 'driver', score: 62, attempts: 2 },
    { team: { code: '79813J' }, type: 'programming', score: 48, attempts: 1 },
    { team: { code: '12345A' }, type: 'driver', score: 55, attempts: 2 },
    { team: { code: '12345A' }, type: 'programming', score: 35, attempts: 2 },
    { team: { code: '98765B' }, type: 'driver', score: 70, attempts: 3 },
    { team: { code: '98765B' }, type: 'programming', score: 20, attempts: 1 }
  ];

  const mockMatches = [
    {
      id: 101,
      name: 'Q 1',
      round: 2,
      instance: 1,
      matchnum: 1,
      scored: true,
      alliances: [
        {
          score: 84,
          teams: [
            { team: { name: '79813J', code: '79813J' } },
            { team: { name: '12345A', code: '12345A' } }
          ]
        }
      ]
    },
    {
      id: 102,
      name: 'Q 2',
      round: 2,
      instance: 1,
      matchnum: 2,
      scored: true,
      alliances: [
        {
          score: 92,
          teams: [
            { team: { name: '79813J', code: '79813J' } },
            { team: { name: '98765B', code: '98765B' } }
          ]
        }
      ]
    },
    {
      id: 103,
      name: 'Q 3',
      round: 2,
      instance: 1,
      matchnum: 3,
      scored: true,
      alliances: [
        {
          score: 75,
          teams: [
            { team: { name: '12345A', code: '12345A' } },
            { team: { name: '98765B', code: '98765B' } }
          ]
        }
      ]
    }
  ];

  const mockAwards = [
    {
      id: 1,
      title: 'Teamwork 1st Place Champions',
      teamWinners: [
        { team: { number: '79813J', name: 'Brave Robotics' } },
        { team: { number: '12345A', name: 'RoboStars' } }
      ]
    },
    {
      id: 2,
      title: 'Design Award',
      teamWinners: [
        { team: { number: '79813J', name: 'Brave Robotics' } }
      ]
    }
  ];

  const mockOprMap = {
    '79813J': 50.5,
    '12345A': 33.5,
    '98765B': 41.5
  };

  // ==========================================================================
  // 1. TeamProfileModal Tests
  // ==========================================================================
  describe('TeamProfileModal Component', () => {
    it('renders team header, school, location, and grade level', () => {
      const html = renderToStaticMarkup(
        React.createElement(TeamProfileModal, {
          isOpen: true,
          teamIdentifier: '79813J',
          teams: mockTeams,
          rankings: mockRankings,
          skills: mockSkills,
          matches: mockMatches,
          awards: mockAwards,
          oprMap: mockOprMap,
          lang: 'en'
        })
      );

      expect(html).toContain('79813J');
      expect(html).toContain('Brave Robotics');
      expect(html).toContain('Vinschool Times City');
      expect(html).toContain('Hanoi');
      expect(html).toContain('Middle School');
      expect(html).toContain('role="dialog"');
    });

    it('renders 6 core performance metrics with correct values', () => {
      const html = renderToStaticMarkup(
        React.createElement(TeamProfileModal, {
          isOpen: true,
          teamIdentifier: '79813J',
          teams: mockTeams,
          rankings: mockRankings,
          skills: mockSkills,
          matches: mockMatches,
          awards: mockAwards,
          oprMap: mockOprMap,
          lang: 'en'
        })
      );

      // Cooperative OPR
      expect(html).toContain('50.5');
      // Division Rank
      expect(html).toContain('#1');
      // Avg Score
      expect(html).toContain('88.5');
      // High Score
      expect(html).toContain('112');
      // Total Skills (62 + 48 = 110)
      expect(html).toContain('110');
      // Record & Win Rate
      expect(html).toContain('100%');
      expect(html).toContain('6W - 0L - 0T');
    });

    it('embeds RadarChart, SkillsBar, and TrendChart SVG components without NaN', () => {
      const html = renderToStaticMarkup(
        React.createElement(TeamProfileModal, {
          isOpen: true,
          teamIdentifier: '79813J',
          teams: mockTeams,
          rankings: mockRankings,
          skills: mockSkills,
          matches: mockMatches,
          awards: mockAwards,
          oprMap: mockOprMap,
          lang: 'en'
        })
      );

      // SVG elements
      expect(html).toContain('polygon');
      expect(html).toContain('path');
      expect(html).not.toContain('NaN');
      expect(html).toContain('Performance Radar');
      expect(html).toContain('Skills Split &amp; Attempts');
    });

    it('renders match history with cooperative partner details and joint score', () => {
      const html = renderToStaticMarkup(
        React.createElement(TeamProfileModal, {
          isOpen: true,
          teamIdentifier: '79813J',
          teams: mockTeams,
          rankings: mockRankings,
          skills: mockSkills,
          matches: mockMatches,
          awards: mockAwards,
          oprMap: mockOprMap,
          lang: 'en'
        })
      );

      expect(html).toContain('Q 1');
      expect(html).toContain('12345A');
      expect(html).toContain('84');
      expect(html).toContain('Q 2');
      expect(html).toContain('98765B');
      expect(html).toContain('92');
    });

    it('renders official awards won by this team', () => {
      const html = renderToStaticMarkup(
        React.createElement(TeamProfileModal, {
          isOpen: true,
          teamIdentifier: '79813J',
          teams: mockTeams,
          rankings: mockRankings,
          skills: mockSkills,
          matches: mockMatches,
          awards: mockAwards,
          oprMap: mockOprMap,
          lang: 'en'
        })
      );

      expect(html).toContain('Teamwork 1st Place Champions');
      expect(html).toContain('Design Award');
    });

    it('supports Vietnamese localization', () => {
      const html = renderToStaticMarkup(
        React.createElement(TeamProfileModal, {
          isOpen: true,
          teamIdentifier: '79813J',
          teams: mockTeams,
          rankings: mockRankings,
          skills: mockSkills,
          matches: mockMatches,
          awards: mockAwards,
          oprMap: mockOprMap,
          lang: 'vi'
        })
      );

      expect(html).toContain('Hồ Sơ Do Thám Đội Tuyển');
      expect(html).toContain('OPR Liên Minh');
      expect(html).toContain('Điểm đấu TB');
      expect(html).toContain('Lịch Sử Thi Đấu Tại Giải');
      expect(html).toContain('Giải Thưởng &amp; Danh Hiệu');
    });

    it('handles empty / fallback data gracefully without crashing', () => {
      const html = renderToStaticMarkup(
        React.createElement(TeamProfileModal, {
          isOpen: true,
          teamIdentifier: 'UNKNOWN_TEAM',
          teams: [],
          rankings: [],
          skills: [],
          matches: [],
          awards: [],
          oprMap: {},
          lang: 'en'
        })
      );

      expect(html).toContain('UNKNOWN_TEAM');
      expect(html).not.toContain('NaN');
      expect(html).toContain('No matches recorded for this team yet');
      expect(html).toContain('No official awards published');
    });
  });

  // ==========================================================================
  // 2. TeamCompareModal Tests
  // ==========================================================================
  describe('TeamCompareModal Component', () => {
    it('renders side-by-side comparison for 2 selected teams', () => {
      const html = renderToStaticMarkup(
        React.createElement(TeamCompareModal, {
          isOpen: true,
          initialTeams: ['79813J', '12345A'],
          teams: mockTeams,
          rankings: mockRankings,
          skills: mockSkills,
          matches: mockMatches,
          awards: mockAwards,
          oprMap: mockOprMap,
          lang: 'en'
        })
      );

      expect(html).toContain('79813J');
      expect(html).toContain('12345A');
      expect(html).toContain('Team Head-to-Head Comparison');
      expect(html).toContain('Cooperative OPR');
      expect(html).toContain('Total Skills');
    });

    it('renders comparative metric matrix with Leader badges on top metrics', () => {
      const html = renderToStaticMarkup(
        React.createElement(TeamCompareModal, {
          isOpen: true,
          initialTeams: ['79813J', '12345A'],
          teams: mockTeams,
          rankings: mockRankings,
          skills: mockSkills,
          matches: mockMatches,
          awards: mockAwards,
          oprMap: mockOprMap,
          lang: 'en'
        })
      );

      expect(html).toContain('Leader');
      expect(html).toContain('50.5'); // Leader in OPR
      expect(html).toContain('110');  // Leader in Skills
    });

    it('handles comparison up to 3 or 4 teams simultaneously', () => {
      const html = renderToStaticMarkup(
        React.createElement(TeamCompareModal, {
          isOpen: true,
          initialTeams: ['79813J', '12345A', '98765B'],
          teams: mockTeams,
          rankings: mockRankings,
          skills: mockSkills,
          matches: mockMatches,
          awards: mockAwards,
          oprMap: mockOprMap,
          lang: 'en'
        })
      );

      expect(html).toContain('79813J');
      expect(html).toContain('12345A');
      expect(html).toContain('98765B');
    });

    it('renders empty selection state when no teams are selected', () => {
      const html = renderToStaticMarkup(
        React.createElement(TeamCompareModal, {
          isOpen: true,
          initialTeams: [],
          teams: mockTeams,
          rankings: mockRankings,
          skills: mockSkills,
          matches: mockMatches,
          awards: mockAwards,
          oprMap: mockOprMap,
          lang: 'en'
        })
      );

      expect(html).toContain('Select at least 2 teams to view comparison');
    });

    it('supports Vietnamese localization', () => {
      const html = renderToStaticMarkup(
        React.createElement(TeamCompareModal, {
          isOpen: true,
          initialTeams: ['79813J', '12345A'],
          teams: mockTeams,
          rankings: mockRankings,
          skills: mockSkills,
          matches: mockMatches,
          awards: mockAwards,
          oprMap: mockOprMap,
          lang: 'vi'
        })
      );

      expect(html).toContain('So Sánh Đối Đầu Đội Tuyển');
      expect(html).toContain('Bảng đối chiếu');
      expect(html).toContain('Biểu đồ trực quan');
      expect(html).toContain('Tương thích liên minh');
      expect(html).toContain('Dẫn đầu');
    });
  });

});
