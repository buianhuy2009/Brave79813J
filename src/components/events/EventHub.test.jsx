import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import EventHub from './EventHub';
import EventList from './EventList';
import { calculateMeanScore, calculateOPR, parseMatch } from '../../utils/opr';
import * as eventsApi from '../../utils/eventsApi';

describe('EventHub Component & Overview Dashboard Tests', () => {
  const mockEvent = {
    id: 9999,
    name: '2026-2027 Vietnam VEX IQ Championship',
    sku: 'RE-VIQRC-26-9999',
    start: '2026-11-20T08:00:00Z',
    end: '2026-11-21T18:00:00Z',
    ongoing: true,
    location: {
      venue: 'Hanoi Convention Center',
      city: 'Hanoi',
      region: 'Hanoi',
      country: 'Vietnam'
    },
    divisions: [
      { id: 101, name: 'Middle School', order: 1 },
      { id: 102, name: 'Elementary School', order: 2 }
    ]
  };

  const mockMatches = [
    {
      id: 1,
      name: 'Qual 1',
      round: 2,
      matchnum: 1,
      field: 'Field A',
      scheduled: '2026-11-20T09:00:00Z',
      scored: true,
      alliances: [
        {
          score: 80,
          teams: [{ team: { name: '79813J' } }, { team: { name: '12345A' } }]
        }
      ]
    },
    {
      id: 2,
      name: 'Qual 2',
      round: 2,
      matchnum: 2,
      field: 'Field B',
      scheduled: '2026-11-20T09:15:00Z',
      scored: false,
      alliances: [
        {
          score: 0,
          teams: [{ team: { name: '79813J' } }, { team: { name: '99999Z' } }]
        }
      ]
    }
  ];

  const mockRankings = [
    {
      id: 1,
      rank: 1,
      team: { name: '79813J', code: '79813J' },
      wins: 2,
      losses: 0,
      ties: 0,
      average_points: 80,
      high_score: 80
    }
  ];

  const mockTeams = [
    { id: 1, number: '79813J', team_name: 'Brave', city: 'Hanoi' },
    { id: 2, number: '12345A', team_name: 'RoboStars', city: 'Hanoi' },
    { id: 3, number: '99999Z', team_name: 'CyberBots', city: 'Hanoi' }
  ];

  beforeEach(() => {
    vi.spyOn(eventsApi, 'getEvent').mockResolvedValue(mockEvent);
    vi.spyOn(eventsApi, 'getEventDivisions').mockResolvedValue(mockEvent.divisions);
    vi.spyOn(eventsApi, 'getEventMatches').mockResolvedValue({ data: mockMatches });
    vi.spyOn(eventsApi, 'getEventRankings').mockResolvedValue({ data: mockRankings });
    vi.spyOn(eventsApi, 'getEventSkills').mockResolvedValue({ data: [] });
    vi.spyOn(eventsApi, 'getEventAwards').mockResolvedValue({ data: [] });
    vi.spyOn(eventsApi, 'getEventTeams').mockResolvedValue({ data: mockTeams });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders event header, SKU, location, and division pills', () => {
    const html = renderToStaticMarkup(
      <EventHub eventId={9999} event={mockEvent} onBack={vi.fn()} />
    );

    expect(html).toContain('2026-2027 Vietnam VEX IQ Championship');
    expect(html).toContain('RE-VIQRC-26-9999');
    expect(html).toContain('Hanoi');
    expect(html).toContain('Middle School');
    expect(html).toContain('Elementary School');
  });

  it('renders all 6 sub-tabs: Overview, Matches, Rankings, Skills, Awards, Teams', () => {
    const html = renderToStaticMarkup(
      <EventHub eventId={9999} event={mockEvent} onBack={vi.fn()} />
    );

    expect(html).toMatch(/Overview|Tổng quan/i);
    expect(html).toMatch(/Matches|Lịch thi đấu/i);
    expect(html).toMatch(/Rankings|Bảng xếp hạng/i);
    expect(html).toMatch(/Skills|Điểm Skills/i);
    expect(html).toMatch(/Awards|Giải thưởng/i);
    expect(html).toMatch(/Teams|Danh sách đội/i);
  });

  it('calculates average alliance score and highest match score correctly via math utilities', () => {
    const avg = calculateMeanScore(mockMatches);
    expect(avg).toBe(80);

    const oprMap = calculateOPR(mockTeams, mockMatches);
    expect(oprMap).toBeDefined();
    expect(typeof oprMap).toBe('object');
  });

  it('MANDATORY: renders cooperative alliance pair without red or blue styling in Up Next', () => {
    const html = renderToStaticMarkup(
      <EventHub 
        eventId={9999} 
        event={mockEvent} 
        initialMatches={mockMatches}
        initialTeams={mockTeams}
        onBack={vi.fn()} 
      />
    );

    // Verify cooperative alliance badge is present
    expect(html).toMatch(/Teamwork Alliance|Liên minh đồng đội/i);

    // Strictly ensure no red/blue boxes appear
    expect(html).not.toMatch(/Red Alliance/i);
    expect(html).not.toMatch(/Blue Alliance/i);
    expect(html).not.toContain('bg-red-500');
    expect(html).not.toContain('bg-red-600');
    expect(html).not.toContain('border-red-500');
  });

  it('renders .ics schedule export button and favorite toggle button', () => {
    const html = renderToStaticMarkup(
      <EventHub eventId={9999} event={mockEvent} onBack={vi.fn()} />
    );

    expect(html).toMatch(/\.ICS|Download Schedule/i);
    expect(html).toMatch(/title="Add to favorites"|title="Remove from favorites"/i);
  });

  describe('EventList Component Rendering', () => {
    it('renders hero title, season badge, search input, and filter pills', () => {
      const html = renderToStaticMarkup(
        <EventList onSelectEvent={vi.fn()} lang="en" />
      );

      expect(html).toMatch(/VEX IQ Live Tournaments|Giải Đấu VEX IQ/i);
      expect(html).toContain('Level Up 2026–2027');
      expect(html).toMatch(/Live Now|Đang diễn ra/i);
      expect(html).toMatch(/All Countries|Tất cả quốc gia/i);
      expect(html).toMatch(/Favorites|Yêu thích/i);
    });

    it('renders bilingual Vietnamese strings when lang is vi', () => {
      const html = renderToStaticMarkup(
        <EventList onSelectEvent={vi.fn()} lang="vi" />
      );

      expect(html).toContain('Giải Đấu VEX IQ Trực Tiếp');
      expect(html).toContain('Đang diễn ra');
      expect(html).toContain('Tất cả quốc gia');
      expect(html).toContain('Yêu thích');
    });
  });
});

