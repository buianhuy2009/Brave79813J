/**
 * src/utils/icsExport.test.js
 * Vitest suite for icsExport.js
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatIcsDate,
  escapeIcsText,
  foldLine,
  extractTeamsFromMatch,
  generateEventIcs,
  downloadIcsFile,
  exportEventCalendar
} from './icsExport.js';

describe('icsExport.js - RFC 5545 iCalendar Generator', () => {
  describe('formatIcsDate', () => {
    it('correctly formats UTC ISO strings into YYYYMMDDTHHMMSSZ', () => {
      const iso = '2026-10-26T09:30:15.000Z';
      expect(formatIcsDate(iso)).toBe('20261026T093015Z');
    });

    it('correctly formats Date objects with zero padding', () => {
      const d = new Date(Date.UTC(2026, 4, 3, 7, 5, 9)); // May 3, 2026 07:05:09
      expect(formatIcsDate(d)).toBe('20260503T070509Z');
    });

    it('returns null for null, undefined, or invalid dates', () => {
      expect(formatIcsDate(null)).toBeNull();
      expect(formatIcsDate(undefined)).toBeNull();
      expect(formatIcsDate('invalid-date')).toBeNull();
    });
  });

  describe('escapeIcsText', () => {
    it('escapes backslashes, semicolons, commas, and newlines per RFC 5545 §3.3.11', () => {
      const raw = 'VEX IQ, Level Up; Section \\1\nLine 2\r\nLine 3';
      const escaped = escapeIcsText(raw);
      expect(escaped).toBe('VEX IQ\\, Level Up\\; Section \\\\1\\nLine 2\\nLine 3');
    });

    it('handles empty, null, or undefined values safely', () => {
      expect(escapeIcsText('')).toBe('');
      expect(escapeIcsText(null)).toBe('');
      expect(escapeIcsText(undefined)).toBe('');
    });
  });

  describe('foldLine', () => {
    it('leaves short lines untouched', () => {
      const shortLine = 'SUMMARY:Match 12 - Level Up';
      expect(foldLine(shortLine, 75)).toBe(shortLine);
    });

    it('folds lines exceeding 75 octets with CRLF and continuation space', () => {
      // 85 character line
      const longLine = 'DESCRIPTION:' + 'A'.repeat(80);
      const folded = foldLine(longLine, 75);

      expect(folded).toContain('\r\n ');
      const [first] = folded.split('\r\n ');
      expect(new TextEncoder().encode(first).length).toBeLessThanOrEqual(75);
    });

    it('safely handles multi-byte UTF-8 characters without splitting code points', () => {
      // Vietnamese characters taking 2-3 bytes each
      const vietnamese = 'DESCRIPTION: Giải Vô Địch Quốc Gia VEX IQ Robotics Việt Nam 2026';
      const folded = foldLine(vietnamese, 40);
      expect(folded).toContain('\r\n ');
      // Unfolding should restore identical string
      const unfolded = folded.replace(/\r\n /g, '');
      expect(unfolded).toBe(vietnamese);
    });
  });

  describe('extractTeamsFromMatch', () => {
    it('extracts team numbers from RobotEvents v2 nested alliances array', () => {
      const match = {
        alliances: [
          {
            teams: [
              { team: { id: 1, name: '79813J', code: '79813J' } },
              { team: { id: 2, name: '12345A', code: '12345A' } }
            ]
          }
        ]
      };

      const teams = extractTeamsFromMatch(match);
      expect(teams).toEqual(['79813J', '12345A']);
    });

    it('extracts team numbers from flat teams array', () => {
      const match = {
        teams: [{ number: '79813J' }, { number: '88888B' }]
      };
      expect(extractTeamsFromMatch(match)).toEqual(['79813J', '88888B']);
    });

    it('returns empty array when match has no team info', () => {
      expect(extractTeamsFromMatch(null)).toEqual([]);
      expect(extractTeamsFromMatch({})).toEqual([]);
    });
  });

  describe('generateEventIcs', () => {
    const mockEvent = {
      id: 54321,
      sku: 'RE-VIQRC-26-0001',
      name: 'Vietnam National Championship 2026',
      location: {
        venue: 'National Convention Center',
        city: 'Hanoi',
        country: 'Vietnam'
      }
    };

    const mockMatches = [
      {
        id: 101,
        name: 'Qualification 1',
        round: 2,
        matchnum: 1,
        field: 'Field 1 - Blue',
        scheduled: '2026-10-26T09:00:00.000Z',
        alliances: [
          {
            teams: [
              { team: { code: '79813J' } },
              { team: { code: '12345A' } }
            ]
          }
        ]
      },
      {
        id: 102,
        name: 'Qualification 2',
        round: 2,
        matchnum: 2,
        field: 'Field 2 - Red',
        scheduled: '2026-10-26T09:15:00.000Z',
        alliances: [
          {
            teams: [
              { team: { code: '99999X' } },
              { team: { code: '88888Y' } }
            ]
          }
        ]
      }
    ];

    it('generates valid RFC 5545 calendar with CRLF line endings', () => {
      const ics = generateEventIcs(mockEvent, mockMatches);

      expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
      expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
      expect(ics).toContain('VERSION:2.0\r\n');
      expect(ics).toContain('PRODID:-//Level Up VEX IQ Calculator//Live Events Calendar Export//EN\r\n');
      expect(ics).toContain('CALSCALE:GREGORIAN\r\n');
      expect(ics).toContain('METHOD:PUBLISH\r\n');
      expect(ics).toContain('BEGIN:VEVENT\r\n');
      expect(ics).toContain('DTSTART:20261026T090000Z\r\n');
      expect(ics).toContain('DTEND:20261026T090500Z\r\n'); // 5 minutes duration default
      expect(ics).toContain('LOCATION:National Convention Center\\, Hanoi\\, Vietnam\r\n');
    });

    it('filters matches by teamNumber and identifies alliance partner', () => {
      const ics = generateEventIcs(mockEvent, mockMatches, '79813j');

      // Match 1 has 79813J -> included
      expect(ics).toContain('Qualification 1');
      expect(ics).toContain('SUMMARY:Match Qualification 1: 79813J w/ 12345A');
      expect(ics).toContain('Alliance Partner: 12345A');

      // Match 2 does NOT have 79813J -> excluded
      expect(ics).not.toContain('Qualification 2');
      expect(ics).not.toContain('99999X');
    });

    it('generates tournament-level event block if match schedule is empty', () => {
      const eventWithDates = {
        ...mockEvent,
        start: '2026-11-01T08:00:00.000Z',
        end: '2026-11-02T17:00:00.000Z'
      };

      const ics = generateEventIcs(eventWithDates, []);
      expect(ics).toContain('BEGIN:VEVENT\r\n');
      expect(ics).toContain('DTSTART:20261101T080000Z\r\n');
      expect(ics).toContain('DTEND:20261102T170000Z\r\n');
      expect(ics).toContain('SUMMARY:Vietnam National Championship 2026\r\n');
    });

    it('skips matches missing scheduled times without throwing', () => {
      const matchesWithUnscheduled = [
        { id: 999, name: 'Practice 1', scheduled: null }
      ];
      const ics = generateEventIcs(mockEvent, matchesWithUnscheduled);
      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).not.toContain('Practice 1');
    });
  });

  describe('downloadIcsFile & exportEventCalendar', () => {
    let originalBlob;
    let originalUrl;
    let originalDocument;
    let originalWindow;

    beforeEach(() => {
      originalBlob = globalThis.Blob;
      originalUrl = globalThis.URL;
      originalDocument = globalThis.document;
      originalWindow = globalThis.window;

      class MockBlob {
        constructor(content, options) {
          this.content = content;
          this.options = options;
        }
      }
      globalThis.Blob = MockBlob;
      globalThis.URL = {
        createObjectURL: vi.fn(() => 'blob:http://localhost/mock-uuid'),
        revokeObjectURL: vi.fn()
      };

      globalThis.window = {};
      globalThis.document = {
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn()
        },
        createElement: vi.fn()
      };
    });

    afterEach(() => {
      globalThis.Blob = originalBlob;
      globalThis.URL = originalUrl;
      globalThis.document = originalDocument;
      globalThis.window = originalWindow;
    });

    it('returns false when window or document is undefined', () => {
      delete globalThis.window;
      expect(downloadIcsFile('test', 'test.ics')).toBe(false);
    });

    it('triggers DOM download of .ics file in browser environment', () => {
      const clickSpy = vi.fn();
      const appendChildSpy = vi.spyOn(document.body, 'appendChild');
      const removeChildSpy = vi.spyOn(document.body, 'removeChild');

      vi.spyOn(document, 'createElement').mockReturnValue({
        setAttribute: vi.fn(),
        click: clickSpy,
        href: ''
      });

      const success = downloadIcsFile('BEGIN:VCALENDAR\r\nEND:VCALENDAR', 'test.ics');
      expect(success).toBe(true);
      expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
    });

    it('exportEventCalendar formats sanitized filename with SKU and team number', () => {
      const clickSpy = vi.fn();
      let capturedDownloadName = '';

      vi.spyOn(document, 'createElement').mockReturnValue({
        setAttribute: vi.fn((attr, val) => {
          if (attr === 'download') capturedDownloadName = val;
        }),
        click: clickSpy,
        href: ''
      });
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});

      const mockEvent = { sku: 'RE-VIQRC-26-1234', name: 'Vietnam Open' };
      exportEventCalendar(mockEvent, [], '79813J');

      expect(capturedDownloadName).toBe('RE-VIQRC-26-1234_team_79813J_schedule.ics');
    });
  });
});
