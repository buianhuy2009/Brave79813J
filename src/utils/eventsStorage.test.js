/**
 * src/utils/eventsStorage.test.js
 * Vitest suite for eventsStorage.js
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  STORAGE_KEY_FAVORITES,
  STORAGE_KEY_QUEUE_ALERTS,
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

  describe('Reactive Subscriptions', () => {
    it('triggers listener when toggleFavorite or setQueueAlertConfig fires', () => {
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

      unsubscribe();
      toggleFavorite('teams', '12345A');
      expect(listener).toHaveBeenCalledTimes(2); // No new call after unsubscribe
    });
  });
});
