/**
 * src/components/events/m3_challenger_stress.test.js
 * 
 * Empirical Stress Test Suite for Milestone M3 (Event Discovery & Hub Core):
 * 1. extractMatchAlliance Normalization & Resiliency:
 *    - 1-alliance object fixtures
 *    - 2-alliance (red/blue TM export artifact) fixtures
 *    - Flat teams array fixtures
 *    - Solo team matches & zero-team placeholder matches
 *    - 3+ team exhibition / corrupted matches
 *    - Case-insensitive duplicate team deduplication
 *    - Unscored, on-field, and scheduled match states
 *    - Corrupted, null, and non-object inputs
 * 2. CooperativeMatchCard Adversarial DOM Search:
 *    - Static rendering verification across 20+ generated fixtures
 *    - STRICT ASSERTION: ZERO red vs blue competitive classes (bg-red-500, text-red-600, border-red, etc.)
 *    - STRICT ASSERTION: ZERO "vs", "VS", "Red Alliance", or "Blue Alliance" competitive labels
 *    - Unified alliance partner layout with single joint score
 * 3. ScoreBreakdownModal Score Drawer Logic:
 *    - Full Level Up breakdown (L1, L2, L3, L4 Yellow, Floor, Clearances, Parking)
 *    - Count multiplier fallback (level1*3, level2*6, level3*12, level4*16, floor*1)
 *    - Alternate key name support (l1_points vs level1_points, parking_points vs park_points)
 *    - Calm fallback banner for empty/null breakdown (English & Vietnamese)
 *    - Corrupted breakdown payloads (strings, primitives, malformed objects)
 * 4. MatchSchedule Component Resiliency:
 *    - Null / undefined / empty match collections
 *    - Corrupted match items in schedule array
 *    - Search and status filter edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import MatchSchedule, { 
  extractMatchAlliance, 
  CooperativeMatchCard, 
  ScoreBreakdownModal, 
  QuickQueueAlertModal 
} from './MatchSchedule';
import * as icsExport from '../../utils/icsExport';
import * as eventsStorage from '../../utils/eventsStorage';
import * as audioAlert from '../../utils/audioAlert';

describe('Milestone M3 Empirical Stress Test: Match Schedule & Alliance Normalization', () => {
  const mockEvent = {
    id: 9999,
    name: 'VEX IQ Vietnam National Championship 2026',
    sku: 'RE-VIQRC-26-9999',
    start: '2026-11-20T08:00:00Z',
    end: '2026-11-21T18:00:00Z',
    location: { venue: 'Hanoi Arena', city: 'Hanoi', country: 'Vietnam' }
  };

  beforeEach(() => {
    vi.spyOn(icsExport, 'exportEventCalendar').mockReturnValue(true);
    vi.spyOn(audioAlert, 'playQueueAlertChime').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. extractMatchAlliance Normalization & Adversarial Inputs
  // =========================================================================
  describe('extractMatchAlliance() Normalization & Robustness', () => {
    
    it('fixture 1: 1-alliance object with 2 partner teams (standard VIQRC format)', () => {
      const match = {
        name: 'Qual 1',
        round: 2,
        matchnum: 1,
        alliances: [
          {
            score: 115,
            teams: [
              { team: { number: '79813J', name: 'Brave' } },
              { team: { number: '12345A', name: 'RoboStars' } }
            ],
            breakdown: { level4_points: 32, clearance_points: 10 }
          }
        ]
      };

      const result = extractMatchAlliance(match);
      expect(result.teams).toHaveLength(2);
      expect(result.teams[0].number).toBe('79813J');
      expect(result.teams[1].number).toBe('12345A');
      expect(result.score).toBe(115);
      expect(result.isScored).toBe(true);
      expect(result.roundName).toBe('Quals');
      expect(result.breakdown).toEqual({ level4_points: 32, clearance_points: 10 });
    });

    it('fixture 2: 2-alliance red/blue TM export artifact normalized to single collaborative pair', () => {
      const match = {
        name: 'Qual 5',
        round: 2,
        matchnum: 5,
        alliances: [
          {
            color: 'red',
            score: 128,
            teams: [{ team: { number: '79813j', name: 'Team Red' } }]
          },
          {
            color: 'blue',
            score: 128,
            teams: [{ team: { number: '88888b', name: 'Team Blue' } }]
          }
        ]
      };

      const result = extractMatchAlliance(match);
      // Both teams must be combined into one collaborative pair
      expect(result.teams).toHaveLength(2);
      expect(result.teams[0].number).toBe('79813J'); // Uppercase normalized
      expect(result.teams[1].number).toBe('88888B');
      expect(result.score).toBe(128);
      expect(result.isScored).toBe(true);
    });

    it('fixture 2b: 2-alliance export with score mismatch takes the maximum alliance score', () => {
      const match = {
        alliances: [
          { color: 'red', score: 100, teams: [{ team: { number: 'A1' } }] },
          { color: 'blue', score: 140, teams: [{ team: { number: 'B1' } }] }
        ]
      };

      const result = extractMatchAlliance(match);
      expect(result.teams).toHaveLength(2);
      expect(result.score).toBe(140);
    });

    it('fixture 3: flat teams array schema without alliances wrapper', () => {
      const match = {
        name: 'Qual 8',
        score: 84,
        scored: true,
        teams: [
          { number: '11111X', name: 'Alpha' },
          { number: '22222Y', name: 'Beta' }
        ]
      };

      const result = extractMatchAlliance(match);
      expect(result.teams).toHaveLength(2);
      expect(result.teams[0].number).toBe('11111X');
      expect(result.teams[1].number).toBe('22222Y');
      expect(result.score).toBe(84);
      expect(result.isScored).toBe(true);
    });

    it('fixture 4: solo team match (no-show / DQ partner)', () => {
      const match = {
        name: 'Qual 12',
        scored: true,
        alliances: [
          {
            score: 42,
            teams: [{ team: { number: '79813J' } }]
          }
        ]
      };

      const result = extractMatchAlliance(match);
      expect(result.teams).toHaveLength(1);
      expect(result.teams[0].number).toBe('79813J');
      expect(result.score).toBe(42);
      expect(result.isScored).toBe(true);
    });

    it('fixture 5: zero-team unassigned match placeholder', () => {
      const match = {
        name: 'Finals 1',
        round: 6,
        alliances: [{ score: 0, teams: [] }]
      };

      const result = extractMatchAlliance(match);
      expect(result.teams).toHaveLength(0);
      expect(result.score).toBe(0);
      expect(result.roundName).toBe('Finals');
      expect(result.isScored).toBe(false);
    });

    it('fixture 6: 3+ teams exhibition match does not throw and extracts all unique members', () => {
      const match = {
        alliances: [
          {
            score: 150,
            teams: [
              { team: { number: '1111A' } },
              { team: { number: '2222B' } },
              { team: { number: '3333C' } }
            ]
          }
        ]
      };

      const result = extractMatchAlliance(match);
      expect(result.teams).toHaveLength(3);
      expect(result.teams.map(t => t.number)).toEqual(['1111A', '2222B', '3333C']);
    });

    it('fixture 7: duplicate team numbers with mixed casing and spacing are deduplicated', () => {
      const match = {
        alliances: [
          {
            score: 70,
            teams: [
              { team: { number: '79813J' } },
              { team: { number: ' 79813j ' } },
              { team: { number: '79813J' } }
            ]
          }
        ]
      };

      const result = extractMatchAlliance(match);
      expect(result.teams).toHaveLength(1);
      expect(result.teams[0].number).toBe('79813J');
    });

    it('fixture 8: unscored, on-field, and scheduled states', () => {
      // 8a: upcoming scheduled
      const scheduledMatch = {
        name: 'Qual 20',
        round: 2,
        scored: false,
        started: false,
        scheduled: '2026-11-20T14:30:00Z',
        alliances: [{ score: 0, teams: [{ team: { number: 'A1' } }, { team: { number: 'A2' } }] }]
      };
      const r1 = extractMatchAlliance(scheduledMatch);
      expect(r1.isScored).toBe(false);
      expect(r1.isOnField).toBe(false);
      expect(r1.isStarted).toBe(false);
      expect(r1.scheduledTime).toBe('2026-11-20T14:30:00Z');

      // 8b: live on-field match (started but unscored)
      const onFieldMatch = {
        name: 'Qual 21',
        scored: false,
        started: true,
        alliances: [{ score: 0, teams: [{ team: { number: 'B1' } }, { team: { number: 'B2' } }] }]
      };
      const r2 = extractMatchAlliance(onFieldMatch);
      expect(r2.isScored).toBe(false);
      expect(r2.isOnField).toBe(true);
      expect(r2.isStarted).toBe(true);
    });

    it('fixture 9: corrupted, null, undefined, and non-object inputs', () => {
      // 9a: null and undefined
      expect(extractMatchAlliance(null)).toMatchObject({ teams: [], score: 0, isScored: false });
      expect(extractMatchAlliance(undefined)).toMatchObject({ teams: [], score: 0, isScored: false });

      // 9b: primitives
      expect(extractMatchAlliance(12345)).toMatchObject({ teams: [], score: 0, isScored: false });
      expect(extractMatchAlliance('corrupted')).toMatchObject({ teams: [], score: 0, isScored: false });

      // 9c: empty object
      expect(extractMatchAlliance({})).toMatchObject({ teams: [], score: 0, isScored: false });

      // 9d: malformed alliances and teams arrays
      const malformedMatch = {
        alliances: [
          null,
          undefined,
          {},
          { score: 'not-a-number', teams: null },
          { teams: [null, undefined, { team: null }, { team: { number: '' } }, { team: { number: '9999Z' } }] }
        ]
      };
      const rMalformed = extractMatchAlliance(malformedMatch);
      expect(rMalformed.teams).toHaveLength(1);
      expect(rMalformed.teams[0].number).toBe('9999Z');
      expect(rMalformed.score).toBe(0);
    });

    it('fixture 10: rounds identification (Finals, Practice, Quals, Elimination)', () => {
      expect(extractMatchAlliance({ round: 6 }).roundName).toBe('Finals');
      expect(extractMatchAlliance({ name: 'Grand Finals Match' }).roundName).toBe('Finals');
      expect(extractMatchAlliance({ round: 1 }).roundName).toBe('Practice');
      expect(extractMatchAlliance({ name: 'Practice 2' }).roundName).toBe('Practice');
      expect(extractMatchAlliance({ round: 3 }).roundName).toBe('R16');
      expect(extractMatchAlliance({ round: 4 }).roundName).toBe('QF');
      expect(extractMatchAlliance({ round: 5 }).roundName).toBe('SF');
      expect(extractMatchAlliance({ round: 2 }).roundName).toBe('Quals');
      expect(extractMatchAlliance({ round: 99 }).roundName).toBe('Quals'); // Safe fallback
    });
  });

  // =========================================================================
  // 2. CooperativeMatchCard Adversarial DOM Search (NO RED VS BLUE)
  // =========================================================================
  describe('CooperativeMatchCard Adversarial DOM Search (Zero Red/Blue UI)', () => {
    
    // Generator of diverse match scenarios to stress-test HTML rendering
    const testCases = [
      {
        name: 'Standard scored collaborative match',
        match: {
          id: 101,
          name: 'Qual 1',
          round: 2,
          scored: true,
          alliances: [{ score: 110, teams: [{ team: { number: '79813J' } }, { team: { number: '12345A' } }] }]
        },
        hasTeams: true
      },
      {
        name: 'TM red/blue 2-alliance export artifact',
        match: {
          id: 102,
          name: 'Qual 2',
          round: 2,
          scored: true,
          alliances: [
            { color: 'red', score: 115, teams: [{ team: { number: '79813J' } }] },
            { color: 'blue', score: 115, teams: [{ team: { number: '88888B' } }] }
          ]
        },
        hasTeams: true
      },
      {
        name: 'Flat teams array match',
        match: {
          id: 103,
          name: 'Qual 3',
          scored: true,
          score: 90,
          teams: [{ number: '55555X' }, { number: '66666Y' }]
        },
        hasTeams: true
      },
      {
        name: 'Solo team match',
        match: {
          id: 104,
          name: 'Qual 4',
          scored: true,
          alliances: [{ score: 45, teams: [{ team: { number: '79813J' } }] }]
        },
        hasTeams: true
      },
      {
        name: 'Unassigned 0-team placeholder',
        match: {
          id: 105,
          name: 'Finals 1',
          round: 6,
          scored: false,
          alliances: [{ score: 0, teams: [] }]
        },
        hasTeams: false
      },
      {
        name: 'Live match on-field',
        match: {
          id: 106,
          name: 'Qual 6',
          scored: false,
          started: true,
          alliances: [{ score: 0, teams: [{ team: { number: 'A1' } }, { team: { number: 'B1' } }] }]
        },
        hasTeams: true
      },
      {
        name: 'Scheduled upcoming match with field and time',
        match: {
          id: 107,
          name: 'Qual 7',
          field: 'Field A',
          scheduled: '2026-11-20T10:15:00Z',
          scored: false,
          alliances: [{ score: 0, teams: [{ team: { number: 'A2' } }, { team: { number: 'B2' } }] }]
        },
        hasTeams: true
      },
      {
        name: 'Match with active queue alert',
        activeAlertTeam: '79813J',
        match: {
          id: 108,
          name: 'Qual 8',
          alliances: [{ score: 0, teams: [{ team: { number: '79813J' } }, { team: { number: '9999Z' } }] }]
        },
        hasTeams: true
      },
      {
        name: 'Finals match with high score',
        match: {
          id: 109,
          name: 'Finals 2',
          round: 6,
          scored: true,
          alliances: [{ score: 146, teams: [{ team: { number: '79813J' } }, { team: { number: '11111A' } }] }]
        },
        hasTeams: true
      },
      {
        name: 'Corrupted match data payload with null/empty items',
        match: {
          id: 110,
          alliances: [null, { score: null, teams: [null] }]
        },
        hasTeams: false
      }
    ];

    testCases.forEach(({ name, match, activeAlertTeam, hasTeams }) => {
      it(`DOM verification: ${name}`, () => {
        const html = renderToStaticMarkup(
          React.createElement(CooperativeMatchCard, {
            match,
            event: mockEvent,
            activeAlertTeam: activeAlertTeam || null,
            favorites: ['79813J']
          })
        );

        // 1. MUST NOT contain red/blue competitive classes
        expect(html).not.toContain('bg-red-500');
        expect(html).not.toContain('bg-red-600');
        expect(html).not.toContain('text-red-500');
        expect(html).not.toContain('text-red-600');
        expect(html).not.toContain('border-red-500');
        expect(html).not.toContain('border-red-600');

        // 2. MUST NOT contain red vs blue alliance labels
        expect(html).not.toMatch(/Red Alliance/i);
        expect(html).not.toMatch(/Blue Alliance/i);

        // 3. MUST NOT contain "vs" or "VS" competitive separator
        expect(html).not.toMatch(/\bvs\b/i);
        expect(html).not.toMatch(/>vs</i);
        expect(html).not.toMatch(/>VS</i);

        // 4. Collaborative alliance layout
        if (hasTeams) {
          expect(html).toContain('text-sky-600'); // Uniform partner styling
        } else {
          expect(html).toContain('TBD'); // Safe placeholder
        }
      });
    });

    it('solo team match renders "Solo" badge for missing second partner', () => {
      const soloMatch = {
        name: 'Qual 9',
        scored: true,
        alliances: [{ score: 55, teams: [{ team: { number: '79813J' } }] }]
      };

      const html = renderToStaticMarkup(
        React.createElement(CooperativeMatchCard, {
          match: soloMatch,
          event: mockEvent
        })
      );

      expect(html).toContain('79813J');
      expect(html).toMatch(/Solo|Đấu đơn/i);
      expect(html).toContain('55');
    });

    it('empty team match renders "TBD" and "Solo" placeholders without throwing', () => {
      const emptyMatch = {
        name: 'Finals TBD',
        round: 6,
        scored: false,
        alliances: [{ score: 0, teams: [] }]
      };

      const html = renderToStaticMarkup(
        React.createElement(CooperativeMatchCard, {
          match: emptyMatch,
          event: mockEvent
        })
      );

      expect(html).toContain('TBD');
      expect(html).toMatch(/Solo|Đấu đơn/i);
      expect(html).toContain('—'); // Unscored placeholder
    });
  });

  // =========================================================================
  // 3. ScoreBreakdownModal Score Drawer Stress Tests
  // =========================================================================
  describe('ScoreBreakdownModal Component Stress Tests', () => {
    
    it('renders full Level Up scoring zones (L1, L2, L3, L4 Yellow, Floor, Clearances, Parking)', () => {
      const matchWithFullBreakdown = {
        name: 'Qual 15',
        round: 2,
        alliances: [
          {
            score: 125,
            teams: [
              { team: { number: '79813J', name: 'Brave' } },
              { team: { number: '12345A', name: 'RoboStars' } }
            ],
            breakdown: {
              level4_points: 32, // 2x 16 pts
              level3_points: 24, // 2x 12 pts
              level2_points: 18, // 3x 6 pts
              level1_points: 9,  // 3x 3 pts
              floor_points: 2,   // 2x 1 pt
              clearance_points: 10,
              park_points: 30
            }
          }
        ]
      };

      const html = renderToStaticMarkup(
        React.createElement(ScoreBreakdownModal, {
          match: matchWithFullBreakdown,
          event: mockEvent,
          onClose: vi.fn(),
          lang: 'en'
        })
      );

      // Verify all scoring zones exist with exact points
      expect(html).toMatch(/Level 4/i);
      expect(html).toContain('32');
      expect(html).toMatch(/Level 3/i);
      expect(html).toContain('24');
      expect(html).toMatch(/Level 2/i);
      expect(html).toContain('18');
      expect(html).toMatch(/Level 1/i);
      expect(html).toContain('9');
      expect(html).toMatch(/Floor Goal/i);
      expect(html).toContain('2');
      expect(html).toMatch(/Clearances/i);
      expect(html).toContain('10');
      expect(html).toMatch(/Parking \/ Level Up/i);
      expect(html).toContain('30');

      // Grand total score
      expect(html).toContain('125');
      expect(html).toMatch(/Combined Alliance Score/i);
      expect(html).toMatch(/OFFICIAL POINTS/i);
    });

    it('calculates points from count multipliers when point values are not precomputed', () => {
      const matchWithCounts = {
        name: 'Qual 16',
        alliances: [
          {
            score: 125,
            teams: [{ team: { number: '79813J' } }, { team: { number: '12345A' } }],
            breakdown: {
              level4: 2, // 2 * 16 = 32
              level3: 2, // 2 * 12 = 24
              level2: 3, // 3 * 6 = 18
              level1: 3, // 3 * 3 = 9
              floor: 2,  // 2 * 1 = 2
              cleared: 10,
              park: 30
            }
          }
        ]
      };

      const html = renderToStaticMarkup(
        React.createElement(ScoreBreakdownModal, {
          match: matchWithCounts,
          event: mockEvent,
          onClose: vi.fn(),
          lang: 'en'
        })
      );

      expect(html).toContain('32'); // 2 * 16
      expect(html).toContain('24'); // 2 * 12
      expect(html).toContain('18'); // 3 * 6
      expect(html).toContain('9');  // 3 * 3
      expect(html).toContain('2');  // 2 * 1
      expect(html).toContain('10');
      expect(html).toContain('30');
    });

    it('supports alternative key naming schemas (l1_points, parking_points, clear_points)', () => {
      const matchWithAltKeys = {
        name: 'Qual 17',
        alliances: [
          {
            score: 99,
            teams: [{ team: { number: '79813J' } }],
            breakdown: {
              l4_points: 16,
              l3_points: 12,
              l2_points: 12,
              l1_points: 9,
              clear_points: 10,
              parking_points: 20
            }
          }
        ]
      };

      const html = renderToStaticMarkup(
        React.createElement(ScoreBreakdownModal, {
          match: matchWithAltKeys,
          event: mockEvent,
          onClose: vi.fn()
        })
      );

      expect(html).toContain('16');
      expect(html).toContain('12');
      expect(html).toContain('9');
      expect(html).toContain('10');
      expect(html).toContain('20');
    });

    it('empty/null breakdown: displays calm fallback explanation without crashing', () => {
      const matchWithoutBreakdown = {
        name: 'Qual 18',
        alliances: [
          {
            score: 85,
            teams: [{ team: { number: '79813J' } }, { team: { number: '88888B' } }],
            breakdown: null
          }
        ]
      };

      // English fallback
      const htmlEn = renderToStaticMarkup(
        React.createElement(ScoreBreakdownModal, {
          match: matchWithoutBreakdown,
          event: mockEvent,
          onClose: vi.fn(),
          lang: 'en'
        })
      );

      expect(htmlEn).toMatch(/Detailed Goal Breakdown Not Published/i);
      expect(htmlEn).toMatch(/Tournament Manager recorded and certified only the official final score/i);
      expect(htmlEn).toContain('85');

      // Vietnamese fallback
      const htmlVi = renderToStaticMarkup(
        React.createElement(ScoreBreakdownModal, {
          match: matchWithoutBreakdown,
          event: mockEvent,
          onClose: vi.fn(),
          lang: 'vi'
        })
      );

      expect(htmlVi).toMatch(/Server giải đấu chưa công bố chi tiết từng tầng/i);
      expect(htmlVi).toMatch(/Ban tổ chức giải đấu chỉ ghi nhận và chứng thực tổng điểm số chính thức/i);
      expect(htmlVi).toContain('85');
    });

    it('handles corrupted breakdown payloads gracefully (empty object, string, primitive)', () => {
      const corruptedMatches = [
        { name: 'C1', alliances: [{ score: 50, breakdown: {} }] },
        { name: 'C2', alliances: [{ score: 50, breakdown: 'corrupted string' }] },
        { name: 'C3', alliances: [{ score: 50, breakdown: 42 }] },
        { name: 'C4', alliances: [{ score: 50, breakdown: { level1: 'invalid' } }] }
      ];

      corruptedMatches.forEach(match => {
        expect(() => {
          renderToStaticMarkup(
            React.createElement(ScoreBreakdownModal, {
              match,
              event: mockEvent,
              onClose: vi.fn()
            })
          );
        }).not.toThrow();
      });
    });

    it('ScoreBreakdownModal safely returns null when match is null', () => {
      const html = renderToStaticMarkup(
        React.createElement(ScoreBreakdownModal, { match: null, onClose: vi.fn() })
      );
      expect(html).toBe('');
    });
  });

  // =========================================================================
  // 4. MatchSchedule Full Component Lifecycle & Filter Resiliency
  // =========================================================================
  describe('MatchSchedule Component Resiliency & Integration', () => {
    
    it('handles null and undefined matches collection safely by rendering empty state', () => {
      const htmlNull = renderToStaticMarkup(
        React.createElement(MatchSchedule, {
          event: mockEvent,
          matches: null
        })
      );
      expect(htmlNull).toMatch(/No matches found|Không tìm thấy trận đấu nào/i);

      const htmlUndefined = renderToStaticMarkup(
        React.createElement(MatchSchedule, {
          event: mockEvent,
          matches: undefined
        })
      );
      expect(htmlUndefined).toMatch(/No matches found|Không tìm thấy trận đấu nào/i);
    });

    it('renders a schedule with corrupted, malformed, or empty match objects safely', () => {
      const dirtyMatches = [
        {},
        { id: 201, name: 'Valid Qual 1', alliances: [{ score: 100, teams: [{ team: { number: '79813J' } }] }] },
        { id: 202, name: 'Valid Qual 2', scored: false, alliances: [{ score: 0, teams: [{ team: { number: '88888B' } }] }] },
        { id: 203, alliances: null }
      ];

      expect(() => {
        const html = renderToStaticMarkup(
          React.createElement(MatchSchedule, {
            event: mockEvent,
            matches: dirtyMatches
          })
        );
        expect(html).toContain('Valid Qual 1');
        expect(html).toContain('Valid Qual 2');
      }).not.toThrow();
    });

    it('adversarial finding: schedule with a literal null item in matches array throws TypeError due to unchecked match.id access', () => {
      // Documenting the boundary condition: if matches array contains a literal null entry
      expect(() => {
        renderToStaticMarkup(
          React.createElement(MatchSchedule, {
            event: mockEvent,
            matches: [null]
          })
        );
      }).toThrow(TypeError);
    });

    it('status filter counts scheduled, played, and finals correctly', () => {
      const testMatches = [
        { id: 1, name: 'Qual 1', scored: true, alliances: [{ score: 90 }] },
        { id: 2, name: 'Qual 2', scored: false, alliances: [{ score: 0 }] },
        { id: 3, name: 'Finals 1', round: 6, scored: false, alliances: [{ score: 0 }] }
      ];

      const html = renderToStaticMarkup(
        React.createElement(MatchSchedule, {
          event: mockEvent,
          matches: testMatches
        })
      );

      // Status pill counts
      expect(html).toContain('All');
      expect(html).toContain('(3)'); // Total
      expect(html).toContain('Scheduled');
      expect(html).toContain('(2)'); // Qual 2 + Finals 1
      expect(html).toContain('Played');
      expect(html).toContain('(1)'); // Qual 1
      expect(html).toContain('Finals');
      expect(html).toContain('(1)'); // Finals 1
    });

    it('QuickQueueAlertModal renders team picker and audio test chime trigger', () => {
      const match = {
        name: 'Qual 30',
        alliances: [
          { score: 0, teams: [{ team: { number: '79813J' } }, { team: { number: '12345A' } }] }
        ]
      };

      const html = renderToStaticMarkup(
        React.createElement(QuickQueueAlertModal, {
          match,
          onClose: vi.fn(),
          onSave: vi.fn(),
          lang: 'en'
        })
      );

      expect(html).toContain('79813J');
      expect(html).toContain('12345A');
      expect(html).toMatch(/Test Audio Chime/i);
      expect(html).toMatch(/Enable Alert/i);
    });
  });
});
