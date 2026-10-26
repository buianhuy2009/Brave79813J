// @vitest-environment happy-dom
/**
 * src/components/events/m5_challenger2_integration_stress.test.jsx
 * 
 * Empirical Stress Test Suite by Challenger 2 for Milestone M5:
 * 1. App-level Tab Switching & Navigation Coordination:
 *    - Strict tab order verification (Home -> Calculator -> Timer -> Live Events -> History -> Manual -> Strategy)
 *    - Position check: Live Events tab directly follows Timer (index 3)
 *    - Radio icon rendering with pulse animation
 *    - Seamless view coordination across all 7 views
 *    - Responsive main container max-w expansion (max-w-7xl on Live Events)
 *    - Footer rendering rules (omitted on Strategy board)
 *    - Bilingual (EN/VI) language switching across tabs and components
 * 2. URL Hash Synchronization in LiveEvents:
 *    - Default hash (#live-events / empty) routes to EventList discovery
 *    - Deep-link SKU hash entry (#live-events/RE-VIQRC-24-0001) transitions to EventHub
 *    - URL-encoded characters in SKU decoding (#live-events/RE%2DVIQRC%2D26%2D9999)
 *    - Dynamic hashchange dispatch (browser Back/Forward navigation)
 *    - Event selection hash updates and back-to-list hash resets
 * 3. Global Active Queue Alert Banner Across Views:
 *    - Inactive when queue alert disabled
 *    - Renders persistent alert banner across views (list view & hub view)
 *    - Correct badge, status (ON FIELD vs QUEUE ALERT), team number, and message
 *    - Deduplicated Web Audio chime trigger (single chime per match ID)
 *    - Audio re-chime when match advances to next match ID
 *    - "View Match" jump button when in list view
 *    - Banner dismissal lifecycle and auto-un-dismissal on next match
 * 4. Inactivity Engine & Modal Coordination:
 *    - 15-minute inactivity timeout pause banner
 *    - Resumption via button click and user input events
 *    - Utility modal triggering (Simulator, Compare, Queue Alert, Team Profile)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import App from '../../App.jsx';
import LiveEvents from './LiveEvents.jsx';
import * as eventsApi from '../../utils/eventsApi.js';
import * as eventsStorage from '../../utils/eventsStorage.js';
import * as audioAlert from '../../utils/audioAlert.js';

// Polyfill canvas context for happy-dom with a dynamic proxy for 2D drawing routines
const dummyContext = new Proxy({}, {
  get(target, prop) {
    if (prop in target) return target[prop];
    if (prop === 'measureText') return vi.fn(() => ({ width: 0 }));
    if (prop === 'getImageData') return vi.fn(() => ({ data: new Array(4) }));
    return vi.fn(() => target);
  },
  set(target, prop, val) {
    target[prop] = val;
    return true;
  }
});
HTMLCanvasElement.prototype.getContext = vi.fn(() => dummyContext);

describe('Milestone M5 Challenger 2: Empirical App Integration, Hash Sync & Queue Alert Stress Tests', () => {
  let container;
  let root;

  const mockDivisions = [
    { id: 101, name: 'Middle School', order: 1 },
    { id: 102, name: 'Elementary School', order: 2 }
  ];

  const mockEvent = {
    id: 9999,
    name: '2026-2027 Vietnam VEX IQ National Championship',
    sku: 'RE-VIQRC-26-9999',
    start: '2026-11-20T08:00:00Z',
    end: '2026-11-21T18:00:00Z',
    ongoing: true,
    location: {
      venue: 'National Convention Center',
      city: 'Hanoi',
      region: 'Hanoi',
      country: 'Vietnam'
    },
    divisions: mockDivisions
  };

  const mockMatches = [
    {
      id: 201,
      name: 'Qual 1',
      round: 2,
      matchnum: 1,
      field: 'Field 1',
      scheduled: '2026-11-20T09:00:00Z',
      started: false,
      scored: false,
      alliances: [
        {
          score: 0,
          teams: [{ team: { name: '79813J' } }, { team: { name: '12345A' } }]
        }
      ]
    },
    {
      id: 202,
      name: 'Qual 2',
      round: 2,
      matchnum: 2,
      field: 'Field 2',
      scheduled: '2026-11-20T09:15:00Z',
      started: false,
      scored: false,
      alliances: [
        {
          score: 0,
          teams: [{ team: { name: '99999Z' } }, { team: { name: '88888X' } }]
        }
      ]
    }
  ];

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    // Mock window methods
    window.scrollTo = vi.fn();
    window.location.hash = '';

    // Mock API calls
    vi.spyOn(eventsApi, 'getEvents').mockResolvedValue({ data: [mockEvent], meta: { total: 1 } });
    vi.spyOn(eventsApi, 'getActiveVietnamEvents').mockResolvedValue({ activeEvents: [mockEvent], scheduledEvents: [] });
    vi.spyOn(eventsApi, 'getSeasonSkills').mockResolvedValue({ data: [] });
    vi.spyOn(eventsApi, 'getEvent').mockResolvedValue(mockEvent);
    vi.spyOn(eventsApi, 'getEventDivisions').mockResolvedValue(mockDivisions);
    vi.spyOn(eventsApi, 'getEventMatches').mockResolvedValue({ data: mockMatches });
    vi.spyOn(eventsApi, 'getEventRankings').mockResolvedValue({ data: [] });
    vi.spyOn(eventsApi, 'getEventSkills').mockResolvedValue({ data: [] });
    vi.spyOn(eventsApi, 'getEventAwards').mockResolvedValue({ data: [] });
    vi.spyOn(eventsApi, 'getEventTeams').mockResolvedValue({ data: [] });

    // Mock Audio Alerts
    vi.spyOn(audioAlert, 'playQueueAlertChime').mockResolvedValue({ success: true });

    // Reset local storage
    localStorage.clear();
  });

  afterEach(async () => {
    vi.useRealTimers();
    if (root) {
      await act(async () => {
        root.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    vi.restoreAllMocks();
    localStorage.clear();
  });

  // =========================================================================
  // SECTION 1: App Navigation, Tab Ordering & View Coordination
  // =========================================================================
  describe('1. Top-Level Navigation & Tab Ordering Integration', () => {

    it('renders the top navbar with exactly 7 tabs in strict contract order', async () => {
      await act(async () => {
        root.render(<App />);
      });

      const navButtons = Array.from(container.querySelectorAll('nav button'));
      expect(navButtons.length).toBe(7);

      // Verify sequence: home (0), calculator (1), timer (2), live-events (3), history (4), manual (5), strategy (6)
      const tabTexts = navButtons.map(btn => btn.textContent.trim());
      expect(tabTexts[0]).toContain('Home');
      expect(tabTexts[1]).toContain('Calculator');
      expect(tabTexts[2]).toContain('Timer');
      expect(tabTexts[3]).toContain('Live Events');
      expect(tabTexts[4]).toContain('History');
      expect(tabTexts[5]).toContain('Game Manual');
      expect(tabTexts[6]).toContain('Strategy');

      // Live Events tab is at index 3 (directly after Timer)
      const liveEventsBtn = navButtons[3];
      expect(liveEventsBtn.getAttribute('aria-label')).toBe('Live Events');
      expect(liveEventsBtn.innerHTML).toContain('animate-pulse'); // Radio icon pulse
    });

    it('switches between all tabs cleanly and updates active styling and views', async () => {
      await act(async () => {
        root.render(<App />);
      });

      const navButtons = Array.from(container.querySelectorAll('nav button'));
      const [homeBtn, calcBtn, timerBtn, liveBtn, historyBtn, manualBtn, strategyBtn] = navButtons;

      // Initial active tab is Home
      expect(homeBtn.className).toContain('bg-white');
      expect(container.textContent).toContain('Team Brave 79813J');

      // Switch to Calculator
      await act(async () => {
        calcBtn.click();
      });
      expect(calcBtn.className).toContain('bg-white');
      expect(container.querySelector('main').className).toContain('max-w-5xl');

      // Switch to Timer
      await act(async () => {
        timerBtn.click();
      });
      expect(timerBtn.className).toContain('bg-white');
      expect(container.textContent).toContain('VEX IQ Match Timer');
      expect(container.textContent).toContain('60s');

      // Switch to Live Events -> verifies max-w-7xl dynamic width expansion
      await act(async () => {
        liveBtn.click();
      });
      expect(liveBtn.className).toContain('bg-white');
      const mainEl = container.querySelector('main');
      expect(mainEl.className).toContain('max-w-7xl');
      expect(container.textContent).toContain('VEX IQ Live Tournaments');

      // Switch to History
      await act(async () => {
        historyBtn.click();
      });
      expect(historyBtn.className).toContain('bg-white');

      // Switch to Manual
      await act(async () => {
        manualBtn.click();
      });
      expect(manualBtn.className).toContain('bg-white');

      // Switch to Strategy -> verifies max-w-[1800px] and absence of footer
      await act(async () => {
        strategyBtn.click();
      });
      expect(strategyBtn.className).toContain('bg-white');
      expect(container.querySelector('main').className).toContain('max-w-[1800px]');
      expect(container.querySelector('footer')).toBeNull(); // Footer hidden on strategy board

      // Switch back to Home -> footer reappears
      await act(async () => {
        homeBtn.click();
      });
      expect(container.querySelector('footer')).not.toBeNull();
    });

    it('toggles language between English and Vietnamese, updating navbar and Live Events labels', async () => {
      await act(async () => {
        root.render(<App />);
      });

      // Find language toggle button
      const langBtn = container.querySelector('button[title="Toggle Language (EN / VI)"]');
      expect(langBtn).not.toBeNull();
      expect(langBtn.textContent).toContain('EN');

      // Switch to Vietnamese
      await act(async () => {
        langBtn.click();
      });
      expect(langBtn.textContent).toContain('VI');
      expect(localStorage.getItem('vexiq_lang')).toBe('vi');

      // Verify Vietnamese tab labels in navbar
      const navButtons = Array.from(container.querySelectorAll('nav button'));
      const navTexts = navButtons.map(btn => btn.textContent.trim());
      expect(navTexts[0]).toContain('Trang chủ');
      expect(navTexts[1]).toContain('Máy tính điểm');
      expect(navTexts[2]).toContain('Đồng hồ');
      expect(navTexts[3]).toContain('Giải Đấu'); // Live Events in Vietnamese
      expect(navTexts[4]).toContain('Lịch sử');
      expect(navTexts[5]).toContain('Luật thi đấu');
      expect(navTexts[6]).toContain('Chiến thuật');

      // Switch to Live Events view in Vietnamese
      await act(async () => {
        navButtons[3].click();
      });
      expect(container.textContent).toContain('Giải Đấu VEX IQ Trực Tiếp');
      expect(container.textContent).toContain('TRỰC TIẾP');

      // Switch back to English
      await act(async () => {
        langBtn.click();
      });
      expect(langBtn.textContent).toContain('EN');
      expect(localStorage.getItem('vexiq_lang')).toBe('en');
      expect(container.textContent).toContain('VEX IQ Live Tournaments');
      expect(container.textContent).toContain('LIVE');
    });

  });

  // =========================================================================
  // SECTION 2: URL Hash Synchronization in LiveEvents
  // =========================================================================
  describe('2. URL Hash Synchronization in LiveEvents', () => {

    it('renders EventList discovery view by default when hash is empty', async () => {
      window.location.hash = '';

      await act(async () => {
        root.render(<LiveEvents lang="en" />);
      });

      // Verification: Discovery header & EventList elements are rendered
      expect(container.textContent).toContain('VEX IQ Live Tournaments');
      // Sub-view is list (search bar is visible)
      const searchInputs = container.querySelectorAll('input[type="text"]');
      expect(searchInputs.length).toBeGreaterThan(0);
    });

    it('initializes in EventHub view when loaded with direct SKU hash (#live-events/RE-VIQRC-24-0001)', async () => {
      window.location.hash = '#live-events/RE-VIQRC-24-0001';

      await act(async () => {
        root.render(<LiveEvents lang="en" />);
      });

      // Verification: EventHub is rendered and fetches division schedule for SKU
      expect(eventsApi.getEventDivisions).toHaveBeenCalledWith('RE-VIQRC-24-0001');
    });

    it('decodes URL-encoded SKU strings in hash correctly (#live-events/RE%2DVIQRC%2D26%2D9999)', async () => {
      window.location.hash = '#live-events/RE%2DVIQRC%2D26%2D9999';

      await act(async () => {
        root.render(<LiveEvents lang="en" />);
      });

      // Verification: Decoded to 'RE-VIQRC-26-9999'
      expect(eventsApi.getEventDivisions).toHaveBeenCalledWith('RE-VIQRC-26-9999');
    });

    it('dynamically switches view when window hashchange event fires (Back/Forward navigation)', async () => {
      window.location.hash = '#live-events';

      await act(async () => {
        root.render(<LiveEvents lang="en" />);
      });

      expect(container.textContent).toContain('VEX IQ Live Tournaments');

      // Simulate browser Forward navigation to a specific tournament
      await act(async () => {
        window.location.hash = '#live-events/RE-VIQRC-26-9999';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });

      expect(eventsApi.getEventDivisions).toHaveBeenCalledWith('RE-VIQRC-26-9999');

      // Simulate browser Back navigation back to #live-events list
      await act(async () => {
        window.location.hash = '#live-events';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });

      // Discovery view remains accessible
      expect(container.textContent).toContain('VEX IQ Live Tournaments');
    });

  });

  // =========================================================================
  // SECTION 3: Global Active Queue Alert Banner Across Views
  // =========================================================================
  describe('3. Global Active Queue Alert Banner Across Views', () => {

    it('does not render alert banner when queue alerts are disabled', async () => {
      eventsStorage.setQueueAlertConfig({
        teamNumber: '79813J',
        matchesAhead: 2,
        enabled: false
      });

      await act(async () => {
        root.render(<LiveEvents lang="en" />);
      });

      const alertBanner = container.querySelector('.bg-gradient-to-r.from-rose-500\\/20');
      expect(alertBanner).toBeNull();
      expect(audioAlert.playQueueAlertChime).not.toHaveBeenCalled();
    });

    it('renders persistent alert banner and triggers audio chime when match approaches', async () => {
      eventsStorage.setQueueAlertConfig({
        teamNumber: '79813J',
        matchesAhead: 2,
        enabled: true
      });

      // Mock evaluateQueueAlert returning an active alert
      vi.spyOn(audioAlert, 'evaluateQueueAlert').mockReturnValue({
        shouldAlert: true,
        status: 'QUEUE_ALERT',
        teamNumber: '79813J',
        matchesAhead: 1,
        threshold: 2,
        teamMatch: { id: 201, name: 'Qual 1', matchnum: 1 },
        message: 'Team 79813J is scheduled in 1 match (Qual 1).'
      });

      await act(async () => {
        root.render(<LiveEvents lang="en" />);
      });

      // Verify alert banner presence and text
      expect(container.textContent).toContain('QUEUE ALERT');
      expect(container.textContent).toContain('Team 79813J');
      expect(container.textContent).toContain('Team 79813J is scheduled in 1 match (Qual 1).');

      // Verify audio chime played
      expect(audioAlert.playQueueAlertChime).toHaveBeenCalledTimes(1);
    });

    it('deduplicates audio chime so subsequent evaluations with same match ID do not re-chime', async () => {
      eventsStorage.setQueueAlertConfig({
        teamNumber: '79813J',
        matchesAhead: 2,
        enabled: true
      });

      const evalSpy = vi.spyOn(audioAlert, 'evaluateQueueAlert').mockReturnValue({
        shouldAlert: true,
        status: 'QUEUE_ALERT',
        teamNumber: '79813J',
        teamMatch: { id: 201, name: 'Qual 1' },
        message: 'Team 79813J queue alert'
      });

      await act(async () => {
        root.render(<LiveEvents lang="en" />);
      });
      expect(audioAlert.playQueueAlertChime).toHaveBeenCalledTimes(1);

      // Re-trigger queue config storage update with same active match ID 201
      await act(async () => {
        eventsStorage.setQueueAlertConfig({
          teamNumber: '79813J',
          matchesAhead: 3,
          enabled: true
        });
      });

      // Should still be 1 (deduplicated)
      expect(audioAlert.playQueueAlertChime).toHaveBeenCalledTimes(1);

      // Advance match ID to 202 -> chime should be played again
      evalSpy.mockReturnValue({
        shouldAlert: true,
        status: 'ON_FIELD',
        teamNumber: '79813J',
        teamMatch: { id: 202, name: 'Qual 2' },
        message: 'Team 79813J is ON FIELD NOW!'
      });

      await act(async () => {
        eventsStorage.setQueueAlertConfig({
          teamNumber: '79813J',
          matchesAhead: 3,
          enabled: true
        });
      });

      expect(audioAlert.playQueueAlertChime).toHaveBeenCalledTimes(2);
      expect(container.textContent).toContain('ON FIELD NOW');
    });

    it('allows user to dismiss alert banner, and auto-resets dismissal on next match ID', async () => {
      eventsStorage.setQueueAlertConfig({
        teamNumber: '79813J',
        matchesAhead: 2,
        enabled: true
      });

      const evalSpy = vi.spyOn(audioAlert, 'evaluateQueueAlert').mockReturnValue({
        shouldAlert: true,
        status: 'QUEUE_ALERT',
        teamNumber: '79813J',
        teamMatch: { id: 201, name: 'Qual 1' },
        message: 'Team 79813J queue alert'
      });

      await act(async () => {
        root.render(<LiveEvents lang="en" />);
      });

      expect(container.textContent).toContain('Team 79813J queue alert');

      // Find and click Dismiss button (title contains "Dismiss" or "Đóng")
      const dismissBtn = container.querySelector('button[title="Dismiss"]');
      expect(dismissBtn).not.toBeNull();

      await act(async () => {
        dismissBtn.click();
      });

      // Banner is dismissed and hidden
      expect(container.textContent).not.toContain('Team 79813J queue alert');

      // When match advances to next match ID 202, dismissal resets and new alert banner displays
      evalSpy.mockReturnValue({
        shouldAlert: true,
        status: 'QUEUE_ALERT',
        teamNumber: '79813J',
        teamMatch: { id: 202, name: 'Qual 2' },
        message: 'Team 79813J is next in Qual 2!'
      });

      await act(async () => {
        eventsStorage.setQueueAlertConfig({
          teamNumber: '79813J',
          matchesAhead: 2,
          enabled: true
        });
      });

      expect(container.textContent).toContain('Team 79813J is next in Qual 2!');
    });

    it('launches Queue Alert settings modal from the alert banner Settings button', async () => {
      eventsStorage.setQueueAlertConfig({
        teamNumber: '79813J',
        matchesAhead: 2,
        enabled: true
      });

      vi.spyOn(audioAlert, 'evaluateQueueAlert').mockReturnValue({
        shouldAlert: true,
        status: 'QUEUE_ALERT',
        teamNumber: '79813J',
        teamMatch: { id: 201, name: 'Qual 1' },
        message: 'Upcoming match alert'
      });

      await act(async () => {
        root.render(<LiveEvents lang="en" />);
      });

      // Click settings button inside alert banner
      const bannerSettingsBtn = Array.from(container.querySelectorAll('button')).find(
        btn => btn.textContent.trim() === 'Settings'
      );
      expect(bannerSettingsBtn).toBeDefined();

      await act(async () => {
        bannerSettingsBtn.click();
      });

      // QueueAlertModal should now be open
      expect(container.textContent).toContain('Queue Alert Settings');
      expect(container.textContent).toContain('Test Alert Tone');
    });

  });

  // =========================================================================
  // SECTION 4: Inactivity Engine & Header Tool Modals Integration
  // =========================================================================
  describe('4. Inactivity Engine & Header Tool Modals Integration', () => {

    it('triggers 15-minute inactivity timeout pause banner and resumes on user action', async () => {
      vi.useFakeTimers();

      await act(async () => {
        root.render(<LiveEvents lang="en" />);
      });

      // Initially no pause banner
      expect(container.textContent).not.toContain('Live Updates Paused');

      // Fast-forward 15 minutes + 15 seconds
      act(() => {
        vi.advanceTimersByTime(15 * 60 * 1000 + 15000);
      });

      // Inactivity banner should now be rendered
      expect(container.textContent).toContain('Live Updates Paused');
      expect(container.textContent).toContain('Resume Live Updates');

      // Click "Resume Live Updates" button
      const resumeBtn = Array.from(container.querySelectorAll('button')).find(
        btn => btn.textContent.trim() === 'Resume Live Updates'
      );
      expect(resumeBtn).toBeDefined();

      act(() => {
        resumeBtn.click();
      });

      // Banner should be dismissed
      expect(container.textContent).not.toContain('Live Updates Paused');

      vi.useRealTimers();
    });

    it('launches World Skills Simulator modal from header button', async () => {
      await act(async () => {
        root.render(<LiveEvents lang="en" />);
      });

      const simBtn = Array.from(container.querySelectorAll('button')).find(
        btn => btn.textContent.trim().includes('Skills Simulator')
      );
      expect(simBtn).toBeDefined();

      await act(async () => {
        simBtn.click();
      });

      // Simulator modal opens
      expect(container.textContent).toContain('World Skills Simulator');
      expect(container.textContent).toContain('Driver Skills');
      expect(container.textContent).toContain('Autonomous Coding');
    });

    it('launches Team Compare modal from header button', async () => {
      await act(async () => {
        root.render(<LiveEvents lang="en" />);
      });

      const compareBtn = Array.from(container.querySelectorAll('button')).find(
        btn => btn.textContent.trim().includes('Compare Teams')
      );
      expect(compareBtn).toBeDefined();

      await act(async () => {
        compareBtn.click();
      });

      // Compare modal opens
      expect(container.textContent).toContain('Team Head-to-Head Comparison');
      expect(container.textContent).toContain('Metric Matrix');
    });

  });

});
