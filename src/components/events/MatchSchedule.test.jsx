import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import MatchSchedule, { 
  extractMatchAlliance, 
  CooperativeMatchCard, 
  ScoreBreakdownModal, 
  QuickQueueAlertModal,
  MatchScoutingNotesModal
} from './MatchSchedule';
import * as icsExport from '../../utils/icsExport';
import * as eventsStorage from '../../utils/eventsStorage';
import * as audioAlert from '../../utils/audioAlert';

describe('MatchSchedule & Cooperative Alliance Tests', () => {
  const mockEvent = {
    id: 1001,
    name: 'Vietnam National VEX IQ Championship 2026',
    sku: 'RE-VIQRC-26-1001',
    start: '2026-11-20T08:00:00Z',
    end: '2026-11-21T18:00:00Z',
    location: {
      venue: 'Hanoi Center',
      city: 'Hanoi',
      country: 'Vietnam'
    }
  };

  const sampleMatchWithSingleAlliance = {
    id: 10,
    name: 'Practice 1',
    round: 1,
    matchnum: 1,
    field: 'Field 1',
    scheduled: '2026-11-20T08:30:00Z',
    scored: true,
    alliances: [
      {
        score: 95,
        teams: [
          { team: { number: '79813J', name: 'Brave' } },
          { team: { number: '12345A', name: 'RoboStars' } }
        ],
        breakdown: {
          level1_points: 9,
          level2_points: 18,
          level3_points: 24,
          level4_points: 32,
          floor_points: 2,
          clearance_points: 10
        }
      }
    ]
  };

  // RobotEvents sometimes returns 2 alliance items (legacy artifact from VRC red/blue TM export)
  // but in VIQRC, both teams are collaborative partners sharing the same joint score!
  const sampleMatchWithTwoAlliancesArtifact = {
    id: 20,
    name: 'Qual 1',
    round: 2,
    matchnum: 1,
    field: 'Field 2',
    scheduled: '2026-11-20T09:00:00Z',
    scored: true,
    alliances: [
      {
        color: 'red',
        score: 110,
        teams: [{ team: { number: '79813J', name: 'Brave' } }]
      },
      {
        color: 'blue',
        score: 110,
        teams: [{ team: { number: '88888B', name: 'DragonBots' } }]
      }
    ]
  };

  const sampleUnscoredMatch = {
    id: 30,
    name: 'Qual 2',
    round: 2,
    matchnum: 2,
    field: 'Field 1',
    scheduled: '2026-11-20T09:15:00Z',
    scored: false,
    alliances: [
      {
        score: 0,
        teams: [
          { team: { number: '12345A', name: 'RoboStars' } },
          { team: { number: '99999Z', name: 'CyberBots' } }
        ]
      }
    ]
  };

  const sampleFinalsMatch = {
    id: 40,
    name: 'Finals 1',
    round: 6,
    matchnum: 1,
    field: 'Main Arena',
    scheduled: '2026-11-21T15:00:00Z',
    scored: false,
    alliances: [
      {
        score: 0,
        teams: [
          { team: { number: '79813J', name: 'Brave' } },
          { team: { number: '99999Z', name: 'CyberBots' } }
        ]
      }
    ]
  };

  beforeEach(() => {
    vi.spyOn(icsExport, 'exportEventCalendar').mockReturnValue(true);
    vi.spyOn(audioAlert, 'playQueueAlertChime').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Helper Logic: extractMatchAlliance
  // =========================================================================
  describe('extractMatchAlliance() Normalization', () => {
    it('normalizes single alliance with 2 teams into a collaborative alliance pair', () => {
      const alliance = extractMatchAlliance(sampleMatchWithSingleAlliance);
      expect(alliance.teams).toHaveLength(2);
      expect(alliance.teams[0].number).toBe('79813J');
      expect(alliance.teams[1].number).toBe('12345A');
      expect(alliance.score).toBe(95);
      expect(alliance.isScored).toBe(true);
      expect(alliance.roundName).toBe('Practice');
      expect(alliance.breakdown).toBeDefined();
      expect(alliance.breakdown.level4_points).toBe(32);
    });

    it('MANDATORY: normalizes 2 alliance objects (red/blue export artifact) into a single cooperative pair', () => {
      const alliance = extractMatchAlliance(sampleMatchWithTwoAlliancesArtifact);
      expect(alliance.teams).toHaveLength(2);
      expect(alliance.teams[0].number).toBe('79813J');
      expect(alliance.teams[1].number).toBe('88888B');
      expect(alliance.score).toBe(110);
      expect(alliance.isScored).toBe(true);
      expect(alliance.roundName).toBe('Quals');
    });

    it('correctly handles unscored upcoming matches', () => {
      const alliance = extractMatchAlliance(sampleUnscoredMatch);
      expect(alliance.isScored).toBe(false);
      expect(alliance.teams).toHaveLength(2);
      expect(alliance.teams[0].number).toBe('12345A');
      expect(alliance.teams[1].number).toBe('99999Z');
    });

    it('identifies Finals rounds correctly', () => {
      const alliance = extractMatchAlliance(sampleFinalsMatch);
      expect(alliance.roundName).toBe('Finals');
    });

    it('handles flat teams array match schema correctly', () => {
      const flatMatch = {
        name: 'Qual 3',
        score: 75,
        scored: true,
        teams: [{ number: '79813J' }, { number: '11111A' }]
      };
      const alliance = extractMatchAlliance(flatMatch);
      expect(alliance.teams).toHaveLength(2);
      expect(alliance.score).toBe(75);
      expect(alliance.isScored).toBe(true);
    });
  });

  // =========================================================================
  // 2. CooperativeMatchCard Rendering (NO RED VS BLUE)
  // =========================================================================
  describe('CooperativeMatchCard Component', () => {
    it('displays partner teams side-by-side with collaborative alliance connector and single score', () => {
      const html = renderToStaticMarkup(
        <CooperativeMatchCard
          match={sampleMatchWithSingleAlliance}
          event={mockEvent}
          onSelectTeam={vi.fn()}
          onOpenBreakdown={vi.fn()}
          onOpenQueueAlert={vi.fn()}
        />
      );

      // Verify both team numbers are rendered
      expect(html).toContain('79813J');
      expect(html).toContain('12345A');

      // Verify single unified score
      expect(html).toContain('95');

      // Strictly verify NO red vs blue boxes exist
      expect(html).not.toMatch(/Red Alliance/i);
      expect(html).not.toMatch(/Blue Alliance/i);
      expect(html).not.toContain('bg-red-500');
      expect(html).not.toContain('bg-red-600');
      expect(html).not.toContain('border-red-500');
    });

    it('renders unscored match with placeholder score and time indicator', () => {
      const html = renderToStaticMarkup(
        <CooperativeMatchCard
          match={sampleUnscoredMatch}
          event={mockEvent}
        />
      );

      expect(html).toContain('12345A');
      expect(html).toContain('99999Z');
      expect(html).toContain('—'); // Unscored placeholder
    });
  });

  // =========================================================================
  // 3. ScoreBreakdownModal
  // =========================================================================
  describe('ScoreBreakdownModal Component', () => {
    it('renders Level 1-4 points, clearances, and parking when breakdown data is present', () => {
      const html = renderToStaticMarkup(
        <ScoreBreakdownModal
          match={sampleMatchWithSingleAlliance}
          event={mockEvent}
          onClose={vi.fn()}
        />
      );

      // Level 4 Yellow points
      expect(html).toMatch(/Level 4/i);
      expect(html).toContain('32');

      // Total official points
      expect(html).toContain('95');
      expect(html).toMatch(/OFFICIAL POINTS|ĐIỂM CHÍNH THỨC/i);
    });

    it('gracefully renders fallback message when detailed breakdown is not published', () => {
      const html = renderToStaticMarkup(
        <ScoreBreakdownModal
          match={sampleMatchWithTwoAlliancesArtifact}
          event={mockEvent}
          onClose={vi.fn()}
        />
      );

      expect(html).toMatch(/Detailed Goal Breakdown Not Published|Server giải đấu chưa công bố/i);
      expect(html).toContain('110');
    });
  });

  // =========================================================================
  // 4. QuickQueueAlertModal
  // =========================================================================
  describe('QuickQueueAlertModal Component', () => {
    it('renders team selection buttons and matches ahead options', () => {
      const html = renderToStaticMarkup(
        <QuickQueueAlertModal
          match={sampleMatchWithSingleAlliance}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      );

      expect(html).toContain('79813J');
      expect(html).toContain('12345A');
      expect(html).toMatch(/Test Audio Chime|Thử âm thanh/i);
      expect(html).toMatch(/Enable Alert|Kích Hoạt Báo Giờ/i);
    });
  });

  // =========================================================================
  // 5. MatchSchedule Full View Integration
  // =========================================================================
  describe('MatchSchedule Component Full Integration', () => {
    const allMatches = [
      sampleMatchWithSingleAlliance,
      sampleMatchWithTwoAlliancesArtifact,
      sampleUnscoredMatch,
      sampleFinalsMatch
    ];

    it('renders schedule container, filter bar, search input, and match cards', () => {
      const html = renderToStaticMarkup(
        <MatchSchedule
          event={mockEvent}
          division={{ id: 1, name: 'Middle School' }}
          matches={allMatches}
        />
      );

      // Total count indicator
      expect(html).toMatch(/collaborative teamwork matches|trận đấu/i);

      // Verify all matches render
      expect(html).toContain('Practice 1');
      expect(html).toContain('Qual 1');
      expect(html).toContain('Qual 2');
      expect(html).toContain('Finals 1');

      // Verify search input is present
      expect(html).toContain('input');
    });

    it('renders empty state gracefully when no matches are provided', () => {
      const html = renderToStaticMarkup(
        <MatchSchedule
          event={mockEvent}
          division={{ id: 1, name: 'Middle School' }}
          matches={[]}
        />
      );

      expect(html).toMatch(/No matches found|Không tìm thấy trận đấu nào/i);
    });
  });

  // =========================================================================
  // 6. MatchScoutingNotesModal & CooperativeMatchCard Scouting Notes
  // =========================================================================
  describe('Match Scouting Notes Component & Card Integration', () => {
    it('renders MatchScoutingNotesModal with match name, alliance teams, quick tags, and textarea', () => {
      const html = renderToStaticMarkup(
        <MatchScoutingNotesModal
          match={sampleMatchWithSingleAlliance}
          event={mockEvent}
          onClose={vi.fn()}
          lang="en"
        />
      );

      expect(html).toContain('Practice 1');
      expect(html).toContain('79813J &amp; 12345A');
      expect(html).toMatch(/Match Tactical Tags/i);
      expect(html).toContain('Great Synergy');
      expect(html).toContain('Rapid Cycling');
      expect(html).toContain('textarea');
      expect(html).toMatch(/Clear Notes/i);
    });

    it('renders Vietnamese localization in MatchScoutingNotesModal', () => {
      const html = renderToStaticMarkup(
        <MatchScoutingNotesModal
          match={sampleMatchWithSingleAlliance}
          event={mockEvent}
          onClose={vi.fn()}
          lang="vi"
        />
      );

      expect(html).toContain('Practice 1');
      expect(html).toContain('Phối hợp ăn ý');
      expect(html).toContain('Tốc độ nạp nhanh');
      expect(html).toContain('Đóng');
    });

    it('displays Scout button on CooperativeMatchCard when onOpenNotes is provided', () => {
      const onOpenNotes = vi.fn();
      const html = renderToStaticMarkup(
        <CooperativeMatchCard
          match={sampleMatchWithSingleAlliance}
          event={mockEvent}
          onOpenNotes={onOpenNotes}
          allMatchNotes={{}}
        />
      );

      expect(html).toContain('Scout');
      expect(html).toContain('aria-label="Scout notes for Practice 1"');
    });

    it('displays Notes button with amber highlight on CooperativeMatchCard when notes exist', () => {
      const onOpenNotes = vi.fn();
      const matchId = sampleMatchWithSingleAlliance.id;
      const html = renderToStaticMarkup(
        <CooperativeMatchCard
          match={sampleMatchWithSingleAlliance}
          event={mockEvent}
          onOpenNotes={onOpenNotes}
          allMatchNotes={{ [matchId]: '🤝 Great Synergy • ⚡ Rapid Cycling' }}
        />
      );

      expect(html).toContain('Notes');
      expect(html).toContain('text-amber-600');
    });

    it('displays Notes badge when scalar prop hasNotes is explicitly true', () => {
      const onOpenNotes = vi.fn();
      const html = renderToStaticMarkup(
        <CooperativeMatchCard
          match={sampleMatchWithSingleAlliance}
          event={mockEvent}
          onOpenNotes={onOpenNotes}
          hasNotes={true}
        />
      );

      expect(html).toContain('Notes');
      expect(html).toContain('text-amber-600');
    });

    it('renders MatchScoutingNotesModal for match with only name (null id)', () => {
      const matchOnlyName = {
        name: 'Finals 1',
        scored: false,
        alliances: [{ score: 0, teams: [{ number: '79813J' }, { number: '12345A' }] }]
      };
      const html = renderToStaticMarkup(
        <MatchScoutingNotesModal
          match={matchOnlyName}
          event={mockEvent}
          onClose={vi.fn()}
          lang="en"
        />
      );

      expect(html).toContain('Finals 1');
      expect(html).toContain('79813J &amp; 12345A');
    });
  });
});
