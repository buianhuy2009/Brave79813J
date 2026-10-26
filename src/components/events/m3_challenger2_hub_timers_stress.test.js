// @vitest-environment happy-dom
/**
 * src/components/events/m3_challenger2_hub_timers_stress.test.js
 * 
 * Empirical Stress Test Suite by Challenger 2 for Milestone M3:
 * 1. EventHub Timers & Activity Listeners:
 *    - 15-minute inactivity timeout: polling pause + resume banner appearance
 *    - User activity resume (mousemove, mousedown, keydown, touchstart, scroll)
 *    - Manual resume button click
 *    - Document visibility change: pause on hidden, catch-up fetch on visible (>= 30s)
 *    - Listener cleanup on component unmount
 * 2. Vietnam Priority & Multi-Event Picker:
 *    - Multiple active Vietnam events: selector banner, default to first event, event switching
 *    - Single active Vietnam event: spotlight banner without picker tabs
 *    - Zero active Vietnam events: circuit chip with count and 1-tap Vietnam filter
 *    - Zero active + zero scheduled: graceful exclusion of banners
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import EventHub from './EventHub.jsx';
import EventList from './EventList.jsx';
import * as eventsApi from '../../utils/eventsApi.js';
import * as eventsStorage from '../../utils/eventsStorage.js';

describe('Milestone M3 Challenger 2: EventHub Timers, Visibility & Vietnam Discovery Stress Tests', () => {
  let container;
  let root;

  const mockDivisions = [
    { id: 101, name: 'Middle School', order: 1 },
    { id: 102, name: 'Elementary School', order: 2 }
  ];

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
    divisions: mockDivisions
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
          score: 85,
          teams: [{ team: { name: '79813J' } }, { team: { name: '12345A' } }]
        }
      ]
    }
  ];

  const mockRankings = [
    {
      id: 1,
      rank: 1,
      team: { name: '79813J', code: '79813J' },
      wins: 1,
      losses: 0,
      ties: 0,
      average_points: 85,
      high_score: 85
    }
  ];

  const mockTeams = [
    { id: 1, number: '79813J', team_name: 'Brave', city: 'Hanoi' },
    { id: 2, number: '12345A', team_name: 'RoboStars', city: 'Hanoi' }
  ];

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    // Mock API responses
    vi.spyOn(eventsApi, 'getEvent').mockResolvedValue(mockEvent);
    vi.spyOn(eventsApi, 'getEventDivisions').mockResolvedValue(mockDivisions);
    vi.spyOn(eventsApi, 'getEventMatches').mockResolvedValue({ data: mockMatches });
    vi.spyOn(eventsApi, 'getEventRankings').mockResolvedValue({ data: mockRankings });
    vi.spyOn(eventsApi, 'getEventSkills').mockResolvedValue({ data: [] });
    vi.spyOn(eventsApi, 'getEventAwards').mockResolvedValue({ data: [] });
    vi.spyOn(eventsApi, 'getEventTeams').mockResolvedValue({ data: mockTeams });
  });

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // SECTION 1: EventHub Inactivity Timeout & Resume Banner
  // =========================================================================
  describe('1. EventHub 15-Minute Inactivity Engine', () => {

    it('simulates 15-minute inactivity timeout: polling pauses and resume banner appears', async () => {
      vi.useFakeTimers();

      await act(async () => {
        root.render(
          React.createElement(EventHub, {
            eventId: 9999,
            event: mockEvent,
            initialMatches: mockMatches,
            initialRankings: mockRankings,
            initialTeams: mockTeams,
            onBack: vi.fn(),
            lang: 'en'
          })
        );
      });

      // Initial active state: no resume banner, countdown active
      expect(container.textContent).not.toContain('Live updates paused after 15 minutes of inactivity');
      expect(container.textContent).toContain('Refreshing in');

      const matchesFetchSpy = vi.spyOn(eventsApi, 'getEventMatches');
      matchesFetchSpy.mockClear();

      // Advance by 14 minutes (840,000 ms) - still active
      await act(async () => {
        vi.advanceTimersByTime(14 * 60 * 1000);
      });
      expect(container.textContent).not.toContain('Live updates paused after 15 minutes of inactivity');

      // Advance past 15 minutes mark (total 15m 1s = 901,000 ms)
      await act(async () => {
        vi.advanceTimersByTime(61 * 1000);
      });

      // Assert inactivity pause banner is displayed
      expect(container.textContent).toContain('Live updates paused after 15 minutes of inactivity');
      expect(container.textContent).toContain('Resume Live Updates');

      // Assert countdown indicator is hidden during pause
      expect(container.textContent).not.toContain('Refreshing in');

      // Verify periodic polling is paused: advance another 2 minutes and assert no automatic fetch
      matchesFetchSpy.mockClear();
      await act(async () => {
        vi.advanceTimersByTime(120 * 1000);
      });
      expect(matchesFetchSpy).not.toHaveBeenCalled();

      // Simulate user activity: mousemove event on window
      await act(async () => {
        window.dispatchEvent(new Event('mousemove'));
      });

      // Assert inactivity cleared: banner disappears and countdown resumes
      expect(container.textContent).not.toContain('Live updates paused after 15 minutes of inactivity');
      expect(container.textContent).toContain('Refreshing in');

      // Assert immediate data refresh triggered upon user activity resume
      expect(matchesFetchSpy).toHaveBeenCalledTimes(1);
    });

    it('simulates resume via clicking the "Resume Live Updates" button in the banner', async () => {
      vi.useFakeTimers();

      await act(async () => {
        root.render(
          React.createElement(EventHub, {
            eventId: 9999,
            event: mockEvent,
            initialMatches: mockMatches,
            initialRankings: mockRankings,
            initialTeams: mockTeams,
            onBack: vi.fn(),
            lang: 'en'
          })
        );
      });

      // Trigger inactivity timeout
      await act(async () => {
        vi.advanceTimersByTime(15 * 60 * 1000 + 1000);
      });
      expect(container.textContent).toContain('Resume Live Updates');

      const matchesFetchSpy = vi.spyOn(eventsApi, 'getEventMatches');
      matchesFetchSpy.mockClear();

      // Find resume button and click it
      const resumeButton = Array.from(container.querySelectorAll('button')).find(
        btn => btn.textContent.includes('Resume Live Updates')
      );
      expect(resumeButton).toBeDefined();

      await act(async () => {
        resumeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      // Assert banner removed and fetch triggered
      expect(container.textContent).not.toContain('Live updates paused after 15 minutes of inactivity');
      expect(matchesFetchSpy).toHaveBeenCalledTimes(1);
    });

    it('asserts all 5 user activity events (mousemove, mousedown, keydown, touchstart, scroll) reset inactivity timer', async () => {
      vi.useFakeTimers();

      await act(async () => {
        root.render(
          React.createElement(EventHub, {
            eventId: 9999,
            event: mockEvent,
            initialMatches: mockMatches,
            initialRankings: mockRankings,
            initialTeams: mockTeams,
            onBack: vi.fn(),
            lang: 'en'
          })
        );
      });

      const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

      for (const evtName of events) {
        // Trigger inactivity
        await act(async () => {
          vi.advanceTimersByTime(15 * 60 * 1000 + 1000);
        });
        expect(container.textContent).toContain('Live updates paused after 15 minutes of inactivity');

        // Dispatch user activity event
        await act(async () => {
          window.dispatchEvent(new Event(evtName));
        });

        // Verify recovered
        expect(container.textContent).not.toContain('Live updates paused after 15 minutes of inactivity');
      }
    });

    it('verifies Vietnamese localization in inactivity banner when lang="vi"', async () => {
      vi.useFakeTimers();

      await act(async () => {
        root.render(
          React.createElement(EventHub, {
            eventId: 9999,
            event: mockEvent,
            initialMatches: mockMatches,
            initialRankings: mockRankings,
            initialTeams: mockTeams,
            onBack: vi.fn(),
            lang: 'vi'
          })
        );
      });

      await act(async () => {
        vi.advanceTimersByTime(15 * 60 * 1000 + 1000);
      });

      expect(container.textContent).toContain('Tự động cập nhật đã tạm dừng sau 15 phút không hoạt động');
      expect(container.textContent).toContain('Tiếp tục cập nhật');
    });

  });

  // =========================================================================
  // SECTION 2: Document Visibility Change (Tab Hidden / Visible)
  // =========================================================================
  describe('2. EventHub Document Visibility Change Engine', () => {

    it('pauses polling when tab is hidden and catches up immediately upon visibility', async () => {
      vi.useFakeTimers();

      await act(async () => {
        root.render(
          React.createElement(EventHub, {
            eventId: 9999,
            event: mockEvent,
            initialMatches: mockMatches,
            initialRankings: mockRankings,
            initialTeams: mockTeams,
            onBack: vi.fn(),
            lang: 'en'
          })
        );
      });

      const matchesFetchSpy = vi.spyOn(eventsApi, 'getEventMatches');
      matchesFetchSpy.mockClear();

      // 1. Simulate tab hidden
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // Assert countdown indicator is hidden
      expect(container.textContent).not.toContain('Refreshing in');

      // Advance timers by 60s while hidden: assert NO periodic fetch calls occurred
      await act(async () => {
        vi.advanceTimersByTime(60 * 1000);
      });
      expect(matchesFetchSpy).not.toHaveBeenCalled();

      // 2. Simulate tab visible again (elapsed time >= 30s)
      Object.defineProperty(document, 'hidden', { configurable: true, value: false });
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // Assert catch-up fetch was executed immediately
      expect(matchesFetchSpy).toHaveBeenCalledTimes(1);
      // Assert countdown resumed
      expect(container.textContent).toContain('Refreshing in');
    });

    it('does not trigger premature catch-up if tab was hidden for less than 30s', async () => {
      vi.useFakeTimers();

      await act(async () => {
        root.render(
          React.createElement(EventHub, {
            eventId: 9999,
            event: mockEvent,
            initialMatches: mockMatches,
            initialRankings: mockRankings,
            initialTeams: mockTeams,
            onBack: vi.fn(),
            lang: 'en'
          })
        );
      });

      const matchesFetchSpy = vi.spyOn(eventsApi, 'getEventMatches');
      matchesFetchSpy.mockClear();

      // Tab hidden
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // Advance only 5 seconds
      await act(async () => {
        vi.advanceTimersByTime(5 * 1000);
      });

      // Tab becomes visible quickly
      Object.defineProperty(document, 'hidden', { configurable: true, value: false });
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // Assert NO immediate fetch because elapsed < 30s
      expect(matchesFetchSpy).not.toHaveBeenCalled();
      expect(container.textContent).toContain('Refreshing in');
    });

    it('combined adversarial scenario: 30 minutes idle in background, then user re-focuses tab and interacts', async () => {
      vi.useFakeTimers();

      await act(async () => {
        root.render(
          React.createElement(EventHub, {
            eventId: 9999,
            event: mockEvent,
            initialMatches: mockMatches,
            initialRankings: mockRankings,
            initialTeams: mockTeams,
            onBack: vi.fn(),
            lang: 'en'
          })
        );
      });

      const matchesFetchSpy = vi.spyOn(eventsApi, 'getEventMatches');
      matchesFetchSpy.mockClear();

      // 1. Tab hidden
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // 2. Advance 30 minutes while tab is hidden
      await act(async () => {
        vi.advanceTimersByTime(30 * 60 * 1000);
      });

      // Assert inactivity triggered while hidden
      // 3. User switches back to tab (tab visible)
      Object.defineProperty(document, 'hidden', { configurable: true, value: false });
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // Resume banner should be present due to 30 min idle
      expect(container.textContent).toContain('Live updates paused after 15 minutes of inactivity');

      // 4. User moves mouse to interact with the page
      matchesFetchSpy.mockClear();
      await act(async () => {
        window.dispatchEvent(new Event('mousemove'));
      });

      // Assert banner removed and fresh data fetched
      expect(container.textContent).not.toContain('Live updates paused after 15 minutes of inactivity');
      expect(matchesFetchSpy).toHaveBeenCalledTimes(1);
    });

    it('rapid visibility toggle stress: 10 visibility changes in 1 second does not crash or cause runaway requests', async () => {
      vi.useFakeTimers();

      await act(async () => {
        root.render(
          React.createElement(EventHub, {
            eventId: 9999,
            event: mockEvent,
            initialMatches: mockMatches,
            initialRankings: mockRankings,
            initialTeams: mockTeams,
            onBack: vi.fn(),
            lang: 'en'
          })
        );
      });

      const matchesFetchSpy = vi.spyOn(eventsApi, 'getEventMatches');
      matchesFetchSpy.mockClear();

      // Rapidly toggle visibility 10 times with 100ms intervals
      for (let i = 0; i < 10; i++) {
        Object.defineProperty(document, 'hidden', { configurable: true, value: i % 2 === 0 });
        await act(async () => {
          document.dispatchEvent(new Event('visibilitychange'));
          vi.advanceTimersByTime(100);
        });
      }

      // Restore to visible
      Object.defineProperty(document, 'hidden', { configurable: true, value: false });
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // Total elapsed was 1s, which is < 30s interval, so no burst of redundant network fetches
      expect(matchesFetchSpy).not.toHaveBeenCalled();
      expect(container.textContent).toContain('Refreshing in');
    });

  });

  // =========================================================================
  // SECTION 3: Vietnam Priority & Multi-Event Picker in EventList
  // =========================================================================
  describe('3. Vietnam Priority & Multi-Event Picker in EventList', () => {

    const activeVietnamEventA = {
      id: 8801,
      sku: 'RE-VIQRC-26-8801',
      name: 'Vietnam National Championship - Middle School',
      start: '2026-11-20T08:00:00Z',
      end: '2026-11-21T18:00:00Z',
      ongoing: true,
      location: { venue: 'Hanoi Gymnasium', city: 'Hanoi', country: 'Vietnam' },
      divisions: [{ id: 1, name: 'Middle School Division' }]
    };

    const activeVietnamEventB = {
      id: 8802,
      sku: 'RE-VIQRC-26-8802',
      name: 'Vietnam National Championship - Elementary School',
      start: '2026-11-20T08:00:00Z',
      end: '2026-11-21T18:00:00Z',
      ongoing: true,
      location: { venue: 'Hanoi Convention Center', city: 'Hanoi', country: 'Vietnam' },
      divisions: [{ id: 2, name: 'Elementary Division' }]
    };

    const upcomingVietnamEvent = {
      id: 8803,
      sku: 'RE-VIQRC-26-8803',
      name: 'Danang Regional Qualifying Tournament',
      start: '2026-12-15T08:00:00Z',
      end: '2026-12-16T18:00:00Z',
      ongoing: false,
      location: { venue: 'Danang Sports Center', city: 'Danang', country: 'Vietnam' },
      divisions: [{ id: 3, name: 'All Divisions' }]
    };

    it('Scenario: Multiple active Vietnam events — renders selector banner and defaults to first event', async () => {
      vi.spyOn(eventsApi, 'getActiveVietnamEvents').mockResolvedValue({
        allVietnamEvents: [activeVietnamEventA, activeVietnamEventB, upcomingVietnamEvent],
        activeEvents: [activeVietnamEventA, activeVietnamEventB]
      });
      vi.spyOn(eventsApi, 'getEvents').mockResolvedValue({
        data: [activeVietnamEventA, activeVietnamEventB, upcomingVietnamEvent]
      });

      const onSelectEvent = vi.fn();

      await act(async () => {
        root.render(React.createElement(EventList, { onSelectEvent, lang: 'en' }));
      });

      // Assert multi-event banner header is displayed
      expect(container.textContent).toContain('LIVE IN VIETNAM');
      expect(container.textContent).toContain('Multiple Live Tournaments in Vietnam');
      expect(container.textContent).toContain('Select an active tournament to view live match schedules and standings:');

      // Assert both event selector pill buttons exist
      expect(container.textContent).toContain('Vietnam National Championship - Middle School');
      expect(container.textContent).toContain('Vietnam National Championship - Elementary School');

      // Assert defaults to first event in spotlight title
      const spotlightTitle = container.querySelector('h3');
      expect(spotlightTitle?.textContent).toContain('Vietnam National Championship - Middle School');

      // Find and click the second event pill to switch selection
      const pillButtons = Array.from(container.querySelectorAll('button')).filter(
        btn => btn.textContent.includes('Elementary School')
      );
      expect(pillButtons.length).toBeGreaterThan(0);

      await act(async () => {
        pillButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      // Assert spotlight title updated to Event B
      expect(container.querySelector('h3')?.textContent).toContain('Vietnam National Championship - Elementary School');

      // Click "Open Tournament Hub" and assert callback received Event B
      const openHubBtn = Array.from(container.querySelectorAll('button')).find(
        btn => btn.textContent.includes('Open Tournament Hub')
      );
      expect(openHubBtn).toBeDefined();

      await act(async () => {
        openHubBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      expect(onSelectEvent).toHaveBeenCalledWith(activeVietnamEventB);
    });

    it('Scenario: Single active Vietnam event — renders spotlight banner without multi-event picker tabs', async () => {
      vi.spyOn(eventsApi, 'getActiveVietnamEvents').mockResolvedValue({
        allVietnamEvents: [activeVietnamEventA, upcomingVietnamEvent],
        activeEvents: [activeVietnamEventA]
      });
      vi.spyOn(eventsApi, 'getEvents').mockResolvedValue({
        data: [activeVietnamEventA, upcomingVietnamEvent]
      });

      await act(async () => {
        root.render(React.createElement(EventList, { onSelectEvent: vi.fn(), lang: 'en' }));
      });

      // Displays single tournament title
      expect(container.textContent).toContain('LIVE IN VIETNAM');
      expect(container.textContent).toContain('Tournament in Progress in Vietnam');
      expect(container.textContent).not.toContain('Multiple Live Tournaments in Vietnam');
      expect(container.textContent).not.toContain('Select an active tournament to view live match schedules and standings:');
    });

    it('Scenario: Zero active Vietnam events — renders circuit banner/chip with count and 1-tap filter', async () => {
      vi.spyOn(eventsApi, 'getActiveVietnamEvents').mockResolvedValue({
        allVietnamEvents: [upcomingVietnamEvent],
        activeEvents: [] // zero active
      });
      vi.spyOn(eventsApi, 'getEvents').mockResolvedValue({
        data: [upcomingVietnamEvent]
      });

      await act(async () => {
        root.render(React.createElement(EventList, { onSelectEvent: vi.fn(), lang: 'en' }));
      });

      // Assert active live banner is NOT displayed
      expect(container.textContent).not.toContain('LIVE IN VIETNAM');
      expect(container.textContent).not.toContain('Tournament in Progress in Vietnam');

      // Assert Vietnam Circuit chip is displayed
      expect(container.textContent).toContain('Vietnam VEX IQ Circuit:');
      expect(container.textContent).toContain('1 tournaments scheduled for Level Up 2026–2027');
      expect(container.textContent).toContain('View Vietnam Events (1)');

      // Click "View Vietnam Events" button
      const filterBtn = Array.from(container.querySelectorAll('button')).find(
        btn => btn.textContent.includes('View Vietnam Events')
      );
      expect(filterBtn).toBeDefined();

      await act(async () => {
        filterBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      // Country selector should now have value "Vietnam"
      const countrySelect = container.querySelector('select');
      expect(countrySelect?.value).toBe('Vietnam');
    });

    it('Scenario: Zero active and zero scheduled Vietnam events — cleanly omits both banners', async () => {
      vi.spyOn(eventsApi, 'getActiveVietnamEvents').mockResolvedValue({
        allVietnamEvents: [],
        activeEvents: []
      });
      vi.spyOn(eventsApi, 'getEvents').mockResolvedValue({
        data: []
      });

      await act(async () => {
        root.render(React.createElement(EventList, { onSelectEvent: vi.fn(), lang: 'en' }));
      });

      expect(container.textContent).not.toContain('LIVE IN VIETNAM');
      expect(container.textContent).not.toContain('Vietnam VEX IQ Circuit:');
    });

  });

  // =========================================================================
  // SECTION 4: Unmount Cleanup & Memory Leak Safeguards
  // =========================================================================
  describe('4. EventHub Lifecycle & Listener Cleanup', () => {

    it('removes window activity listeners and document visibility listeners on unmount', async () => {
      const windowRemoveSpy = vi.spyOn(window, 'removeEventListener');
      const docRemoveSpy = vi.spyOn(document, 'removeEventListener');

      await act(async () => {
        root.render(
          React.createElement(EventHub, {
            eventId: 9999,
            event: mockEvent,
            initialMatches: mockMatches,
            initialRankings: mockRankings,
            initialTeams: mockTeams,
            onBack: vi.fn()
          })
        );
      });

      await act(async () => {
        root.unmount();
      });

      // Assert all 5 activity listeners were removed
      const removedEvents = windowRemoveSpy.mock.calls.map(c => c[0]);
      expect(removedEvents).toContain('mousemove');
      expect(removedEvents).toContain('mousedown');
      expect(removedEvents).toContain('keydown');
      expect(removedEvents).toContain('touchstart');
      expect(removedEvents).toContain('scroll');

      // Assert visibilitychange listener was removed
      const docRemovedEvents = docRemoveSpy.mock.calls.map(c => c[0]);
      expect(docRemovedEvents).toContain('visibilitychange');
    });

  });

});
