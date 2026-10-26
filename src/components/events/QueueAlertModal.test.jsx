import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { 
  simulateQueueAlert, 
  isAudioMuted, 
  setAudioMuted,
  evaluateQueueAlert 
} from '../../utils/audioAlert';
import { 
  getQueueAlertConfig, 
  setQueueAlertConfig, 
  resetQueueAlertConfig 
} from '../../utils/eventsStorage';
import { QueueAlertBanner } from './QueueAlertModal.jsx';

describe('QueueAlertModal & QueueAlertBanner - Logic & Integration Tests', () => {

  beforeEach(() => {
    resetQueueAlertConfig();
    setAudioMuted(false);
  });

  afterEach(() => {
    resetQueueAlertConfig();
    setAudioMuted(false);
  });

  describe('Queue Alert Persistence & Configuration Validation', () => {
    it('initializes with default queue alert configuration', () => {
      const config = getQueueAlertConfig();
      expect(config.teamNumber).toBe('');
      expect(config.matchesAhead).toBe(2);
      expect(config.enabled).toBe(false);
    });

    it('saves valid configuration with team uppercase normalization and threshold clamping', () => {
      const saved = setQueueAlertConfig({
        teamNumber: '  79813j  ',
        matchesAhead: 3,
        enabled: true
      });

      expect(saved.teamNumber).toBe('79813J');
      expect(saved.matchesAhead).toBe(3);
      expect(saved.enabled).toBe(true);

      const retrieved = getQueueAlertConfig();
      expect(retrieved.teamNumber).toBe('79813J');
      expect(retrieved.matchesAhead).toBe(3);
      expect(retrieved.enabled).toBe(true);
    });

    it('resets configuration back to defaults on disable', () => {
      setQueueAlertConfig({
        teamNumber: '1111A',
        matchesAhead: 5,
        enabled: true
      });

      const reset = resetQueueAlertConfig();
      expect(reset.teamNumber).toBe('');
      expect(reset.enabled).toBe(false);

      const current = getQueueAlertConfig();
      expect(current.teamNumber).toBe('');
      expect(current.enabled).toBe(false);
    });
  });

  describe('Audio Tone Mute & Simulation Hookup', () => {
    it('sets and retrieves audio muted state', () => {
      expect(isAudioMuted()).toBe(false);
      setAudioMuted(true);
      expect(isAudioMuted()).toBe(true);
      setAudioMuted(false);
      expect(isAudioMuted()).toBe(false);
    });

    it('simulateQueueAlert produces mock evaluation compatible with QueueAlertBanner', () => {
      const sim = simulateQueueAlert('79813J', 2);
      expect(sim.shouldAlert).toBe(true);
      expect(sim.status).toBe('ALERT_ACTIVE');
      expect(sim.teamNumber).toBe('79813J');
      expect(sim.matchesAhead).toBe(2);
      expect(sim.isSimulation).toBe(true);
      expect(sim.message).toContain('79813J');
    });

    it('simulateQueueAlert handles on-field scenario when matchesAhead is 0', () => {
      const sim = simulateQueueAlert('79813J', 0);
      expect(sim.shouldAlert).toBe(true);
      expect(sim.status).toBe('ON_FIELD');
      expect(sim.matchesAhead).toBe(0);
      expect(sim.message).toContain('on the field now');
    });
  });

  describe('QueueAlertBanner Component Logic', () => {
    it('returns null if evaluation is null or shouldAlert is false', () => {
      const elementNull = QueueAlertBanner({ evaluation: null });
      expect(elementNull).toBeNull();

      const elementFalse = QueueAlertBanner({ evaluation: { shouldAlert: false } });
      expect(elementFalse).toBeNull();
    });

    it('renders alert banner element when evaluation.shouldAlert is true', () => {
      const evaluation = {
        shouldAlert: true,
        status: 'ALERT_ACTIVE',
        matchesAhead: 2,
        teamNumber: '79813J',
        message: 'Team 79813J is 2 matches away!',
        teamMatch: { name: 'Quals #14', matchnum: 14 }
      };

      const element = QueueAlertBanner({ evaluation, isPreview: false });
      expect(element).not.toBeNull();
      expect(element.type).toBe('aside');
      expect(element.props['role']).toBe('alert');
    });

    it('renders on-field styling when status is ON_FIELD', () => {
      const evaluation = {
        shouldAlert: true,
        status: 'ON_FIELD',
        matchesAhead: 0,
        teamNumber: '79813J',
        message: 'Team 79813J is on the field now!',
        teamMatch: { name: 'Finals #1', matchnum: 1 }
      };

      const element = QueueAlertBanner({ evaluation, isPreview: true });
      expect(element).not.toBeNull();
      expect(element.props.className).toContain('rose-500');
    });
  });

});
