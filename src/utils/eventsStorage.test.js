/**
 * src/utils/eventsStorage.test.js
 * Vitest suite for eventsStorage.js
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  STORAGE_KEY_FAVORITES,
  STORAGE_KEY_QUEUE_ALERTS,
  STORAGE_KEY_SCOUTING_NOTES,
  STORAGE_KEY_MATCH_NOTES,
  DEFAULT_FAVORITES,
  DEFAULT_QUEUE_ALERT_CONFIG,
  getFavorites,
  isFavorite,
  toggleFavorite,
  addFavorite,
  removeFavorite,
  clearFavorites,
  getQueueAlertConfig,
  setQueueAlertConfig,
  resetQueueAlertConfig,
  getTeamNotes,
  setTeamNotes,
  getAllTeamNotes,
  clearAllTeamNotes,
  getMatchNotes,
  setMatchNotes,
  getAllMatchNotes,
  clearAllMatchNotes,
  toggleScoutingTag,
  subscribeToStorage
} from './eventsStorage.js';

describe('eventsStorage.js - LocalStorage & Cache Manager', () => {
  let mockStorage = {};
  let originalWindow;
  let eventListeners = {};

  beforeEach(() => {
    mockStorage = {};
    eventListeners = {};
    originalWindow = globalThis.window;

    // Polyfill CustomEvent if not present in Node
    if (typeof globalThis.CustomEvent === 'undefined') {
      globalThis.CustomEvent = class CustomEvent {
        constructor(type, eventInitDict) {
          this.type = type;
          this.detail = eventInitDict?.detail;
        }
      };
    }

    const localStorageMock = {
      getItem: vi.fn((key) => mockStorage[key] || null),
      setItem: vi.fn((key, value) => {
        mockStorage[key] = String(value);
      }),
      removeItem: vi.fn((key) => {
        delete mockStorage[key];
      }),
      clear: vi.fn(() => {
        mockStorage = {};
      })
    };

    globalThis.window = {
      localStorage: localStorageMock,
      dispatchEvent: vi.fn((event) => {
        const type = event?.type;
        if (eventListeners[type]) {
          eventListeners[type].forEach(fn => fn(event));
        }
        return true;
      }),
      addEventListener: vi.fn((type, fn) => {
        if (!eventListeners[type]) eventListeners[type] = [];
        eventListeners[type].push(fn);
      }),
      removeEventListener: vi.fn((type, fn) => {
        if (eventListeners[type]) {
          eventListeners[type] = eventListeners[type].filter(cb => cb !== fn);
        }
      }),
      CustomEvent: globalThis.CustomEvent
    };

    clearFavorites();
    resetQueueAlertConfig();
    clearAllTeamNotes();
    clearAllMatchNotes();
  });

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  describe('Favorites CRUD Operations', () => {
    it('returns default empty favorites when storage is empty', () => {
      const favs = getFavorites();
      expect(favs).toEqual({ events: [], teams: [] });
    });

    it('toggles a team favorite and normalizes team number to uppercase', () => {
      expect(isFavorite('teams', '79813j')).toBe(false);

      const added = toggleFavorite('teams', '79813j');
      expect(added).toBe(true);
      expect(isFavorite('teams', '79813J')).toBe(true);
      expect(isFavorite('teams', '79813j')).toBe(true); // case-insensitive query

      const stored = JSON.parse(mockStorage[STORAGE_KEY_FAVORITES]);
      expect(stored.teams).toContain('79813J');

      // Toggle off
      const removed = toggleFavorite('teams', '79813J');
      expect(removed).toBe(false);
      expect(isFavorite('teams', '79813J')).toBe(false);
    });

    it('toggles an event favorite and stores SKU/ID trimmed', () => {
      const added = toggleFavorite('events', ' RE-VIQRC-26-0001 ');
      expect(added).toBe(true);
      expect(isFavorite('events', 'RE-VIQRC-26-0001')).toBe(true);

      const favs = getFavorites();
      expect(favs.events).toEqual(['RE-VIQRC-26-0001']);
    });

    it('idempotently adds and removes favorites with addFavorite and removeFavorite', () => {
      expect(addFavorite('teams', '88888A')).toBe(true);
      expect(addFavorite('teams', '88888A')).toBe(true); // Second add does not duplicate
      expect(getFavorites().teams).toEqual(['88888A']);

      expect(removeFavorite('teams', '88888A')).toBe(true);
      expect(removeFavorite('teams', '88888A')).toBe(true); // Second remove is safe
      expect(getFavorites().teams).toEqual([]);
    });

    it('clears all favorites successfully', () => {
      toggleFavorite('teams', '79813J');
      toggleFavorite('events', 'RE-1234');
      expect(getFavorites().teams.length).toBe(1);
      expect(getFavorites().events.length).toBe(1);

      clearFavorites();
      expect(getFavorites().teams).toEqual([]);
      expect(getFavorites().events).toEqual([]);
    });
  });

  describe('Storage Resilience & Edge Cases', () => {
    it('gracefully handles corrupted JSON in localStorage', () => {
      mockStorage[STORAGE_KEY_FAVORITES] = '{ invalid json !!';
      const favs = getFavorites();
      expect(favs).toEqual({ events: [], teams: [] });
    });

    it('gracefully handles non-object corrupted JSON payloads', () => {
      mockStorage[STORAGE_KEY_FAVORITES] = JSON.stringify('a plain string');
      const favs = getFavorites();
      expect(favs).toEqual({ events: [], teams: [] });
    });

    it('falls back to in-memory cache when localStorage setItem throws QuotaExceededError', () => {
      window.localStorage.setItem.mockImplementation(() => {
        const err = new Error('Quota exceeded');
        err.name = 'QuotaExceededError';
        throw err;
      });

      // Toggling should still succeed in memory without crashing
      const added = toggleFavorite('teams', '79813J');
      expect(added).toBe(true);
      expect(isFavorite('teams', '79813J')).toBe(true);
    });

    it('falls back gracefully when localStorage throws SecurityError in private browsing', () => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new Error('SecurityError: Access denied');
        },
        configurable: true
      });

      const favs = getFavorites();
      expect(favs).toEqual({ events: [], teams: [] });

      const added = toggleFavorite('teams', '79813J');
      expect(added).toBe(true);
      expect(isFavorite('teams', '79813J')).toBe(true);
    });
  });

  describe('Queue Alert Configuration API', () => {
    it('returns default queue alert config when unset', () => {
      const config = getQueueAlertConfig();
      expect(config).toEqual({
        teamNumber: '',
        matchesAhead: 2,
        enabled: false
      });
    });

    it('sets and persists valid queue alert config with normalized team number', () => {
      const updated = setQueueAlertConfig({
        teamNumber: ' 79813j ',
        matchesAhead: 3,
        enabled: true
      });

      expect(updated).toEqual({
        teamNumber: '79813J',
        matchesAhead: 3,
        enabled: true
      });

      const reRead = getQueueAlertConfig();
      expect(reRead.teamNumber).toBe('79813J');
      expect(reRead.matchesAhead).toBe(3);
      expect(reRead.enabled).toBe(true);
    });

    it('clamps matchesAhead between 1 and 10 and coerces enabled boolean', () => {
      const updatedLow = setQueueAlertConfig({ matchesAhead: -5, enabled: 'truthy' });
      expect(updatedLow.matchesAhead).toBe(2); // clamped to default on invalid
      expect(updatedLow.enabled).toBe(true);

      const updatedHigh = setQueueAlertConfig({ matchesAhead: 99 });
      expect(updatedHigh.matchesAhead).toBe(2); // clamped to default on invalid

      const validCustom = setQueueAlertConfig({ matchesAhead: 5 });
      expect(validCustom.matchesAhead).toBe(5);
    });

    it('resets queue alert config to defaults', () => {
      setQueueAlertConfig({ teamNumber: '79813J', matchesAhead: 4, enabled: true });
      const reset = resetQueueAlertConfig();
      expect(reset).toEqual(DEFAULT_QUEUE_ALERT_CONFIG);
    });
  });

  describe('Team Scouting Notes CRUD', () => {
    it('returns empty string when no notes exist for team', () => {
      expect(getTeamNotes('79813J')).toBe('');
      expect(getTeamNotes('')).toBe('');
      expect(getTeamNotes(null)).toBe('');
    });

    it('saves and retrieves team notes with uppercase team number normalization', () => {
      setTeamNotes('79813j', 'Fast intake, reliable Level 3 score');
      expect(getTeamNotes('79813J')).toBe('Fast intake, reliable Level 3 score');
      expect(getTeamNotes(' 79813j ')).toBe('Fast intake, reliable Level 3 score');

      const allNotes = getAllTeamNotes();
      expect(allNotes['79813J']).toBe('Fast intake, reliable Level 3 score');
    });

    it('removes team entry when notes are updated to empty or whitespace string', () => {
      setTeamNotes('79813J', 'Initial note');
      expect(getTeamNotes('79813J')).toBe('Initial note');

      setTeamNotes('79813J', '   ');
      expect(getTeamNotes('79813J')).toBe('');
      const allNotes = getAllTeamNotes();
      expect(allNotes['79813J']).toBeUndefined();
    });

    it('clears all scouting notes cleanly', () => {
      setTeamNotes('1111A', 'Team 1 notes');
      setTeamNotes('2222B', 'Team 2 notes');
      expect(Object.keys(getAllTeamNotes()).length).toBe(2);

      clearAllTeamNotes();
      expect(Object.keys(getAllTeamNotes()).length).toBe(0);
      expect(getTeamNotes('1111A')).toBe('');
    });
  });

  describe('Match Scouting Notes CRUD', () => {
    it('returns empty string when no notes exist for match', () => {
      expect(getMatchNotes('101')).toBe('');
      expect(getMatchNotes('')).toBe('');
      expect(getMatchNotes(null)).toBe('');
    });

    it('saves and retrieves match notes by string or numeric matchId', () => {
      setMatchNotes(101, 'Level 3 autonomous success, fast double park');
      expect(getMatchNotes('101')).toBe('Level 3 autonomous success, fast double park');
      expect(getMatchNotes(101)).toBe('Level 3 autonomous success, fast double park');

      const allNotes = getAllMatchNotes();
      expect(allNotes['101']).toBe('Level 3 autonomous success, fast double park');
    });

    it('removes match entry when notes are updated to empty or whitespace string', () => {
      setMatchNotes('202', 'Initial match strategy');
      expect(getMatchNotes('202')).toBe('Initial match strategy');

      setMatchNotes('202', '   ');
      expect(getMatchNotes('202')).toBe('');
      const allNotes = getAllMatchNotes();
      expect(allNotes['202']).toBeUndefined();
    });

    it('clears all match notes cleanly', () => {
      setMatchNotes('M1', 'Match 1 tactical note');
      setMatchNotes('M2', 'Match 2 tactical note');
      expect(Object.keys(getAllMatchNotes()).length).toBe(2);

      clearAllMatchNotes();
      expect(Object.keys(getAllMatchNotes()).length).toBe(0);
      expect(getMatchNotes('M1')).toBe('');
    });
  });

  describe('Reactive Subscriptions', () => {
    it('triggers listener when toggleFavorite, setQueueAlertConfig, setTeamNotes, or setMatchNotes fires', () => {
      const listener = vi.fn();
      const unsubscribe = subscribeToStorage(listener);

      toggleFavorite('teams', '79813J');
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        key: STORAGE_KEY_FAVORITES,
        action: 'toggle'
      }));

      setQueueAlertConfig({ teamNumber: '79813J', enabled: true });
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        key: STORAGE_KEY_QUEUE_ALERTS,
        action: 'update'
      }));

      setTeamNotes('79813J', 'Great alliance partner');
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        key: STORAGE_KEY_SCOUTING_NOTES,
        action: 'update'
      }));

      setMatchNotes('101', 'Solid Level 4 scoring');
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        key: STORAGE_KEY_MATCH_NOTES,
        action: 'update'
      }));

      unsubscribe();
      toggleFavorite('teams', '12345A');
      expect(listener).toHaveBeenCalledTimes(4); // No new call after unsubscribe
    });
  });

  describe('toggleScoutingTag Utility', () => {
    it('appends tag to empty or null notes', () => {
      expect(toggleScoutingTag('', '⚡ Rapid Intake')).toBe('⚡ Rapid Intake');
      expect(toggleScoutingTag(null, '⚡ Rapid Intake')).toBe('⚡ Rapid Intake');
    });

    it('appends tag with bullet delimiter to existing single-line notes', () => {
      const result = toggleScoutingTag('Fast autonomous', '⚡ Rapid Intake');
      expect(result).toBe('Fast autonomous • ⚡ Rapid Intake');
    });

    it('toggles off active tag at the end cleanly', () => {
      const initial = 'Fast autonomous • ⚡ Rapid Intake';
      const toggled = toggleScoutingTag(initial, '⚡ Rapid Intake');
      expect(toggled).toBe('Fast autonomous');
    });

    it('toggles off active tag at the beginning cleanly', () => {
      const initial = '⚡ Rapid Intake • Fast autonomous';
      const toggled = toggleScoutingTag(initial, '⚡ Rapid Intake');
      expect(toggled).toBe('Fast autonomous');
    });

    it('toggles off middle tag without leaving double bullets', () => {
      const initial = 'TagA • TagB • TagC';
      const toggled = toggleScoutingTag(initial, 'TagB');
      expect(toggled).toBe('TagA • TagC');
    });

    it('strictly preserves multi-line notes without destroying newlines', () => {
      const initial = 'Auto Path: Level 3 yellow goal\nDriver: 45 pts\n⚡ Rapid Intake • 🅿️ Clean Double Park';
      const toggled = toggleScoutingTag(initial, '⚡ Rapid Intake');
      expect(toggled).toBe('Auto Path: Level 3 yellow goal\nDriver: 45 pts\n🅿️ Clean Double Park');
    });

    it('coerces non-string notes in setTeamNotes and setMatchNotes properly', () => {
      setTeamNotes('99999X', 12345);
      expect(getTeamNotes('99999X')).toBe('12345');

      setMatchNotes('M99', 67890);
      expect(getMatchNotes('M99')).toBe('67890');
    });
  });
});
