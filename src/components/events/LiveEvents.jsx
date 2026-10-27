import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Radio, 
  Activity, 
  Flame, 
  Sparkles, 
  Star, 
  Volume2, 
  VolumeX, 
  Bell, 
  BellRing, 
  X, 
  ChevronLeft, 
  Layers, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Trophy, 
  Gamepad2, 
  GitCompare, 
  Target, 
  SlidersHorizontal 
} from 'lucide-react';
import EventList from './EventList';
import EventHub from './EventHub';
import TeamProfileModal from './TeamProfileModal';
import TeamCompareModal from './TeamCompareModal';
import WorldSkillsSimulator from './WorldSkillsSimulator';
import QueueAlertModal from './QueueAlertModal';
import { 
  getFavorites, 
  getQueueAlertConfig, 
  setQueueAlertConfig, 
  subscribeToStorage 
} from '../../utils/eventsStorage';
import { 
  evaluateQueueAlert, 
  playQueueAlertChime, 
  simulateQueueAlert, 
  isAudioMuted, 
  setAudioMuted 
} from '../../utils/audioAlert';
import { getEvent } from '../../utils/eventsApi';
import { translations } from '../../constants/translations';

// 15-Minute Inactivity Timeout in milliseconds
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;

export default function LiveEvents({ lang = 'en' }) {
  const t = translations[lang] || translations.en;
  const isVi = lang === 'vi';

  // Navigation View State: 'list' (discovery) or 'hub' (selected tournament)
  const [currentView, setCurrentView] = useState('list');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDivisionId, setSelectedDivisionId] = useState(null);

  // Active Modals: 'profile' | 'compare' | 'simulator' | 'queueAlert' | null
  const [activeModal, setActiveModal] = useState(null);
  const [activeModalPayload, setActiveModalPayload] = useState(null);

  // Queue Alert Configuration & Evaluation State
  const [queueConfig, setQueueConfig] = useState(() => getQueueAlertConfig());
  const [activeQueueAlert, setActiveQueueAlert] = useState(null);
  const [isAlertDismissed, setIsAlertDismissed] = useState(false);
  const [lastChimedMatchId, setLastChimedMatchId] = useState(null);
  const [activeMatches, setActiveMatches] = useState([]);

  // Inactivity & Visibility Tracking
  const [isInactivePaused, setIsInactivePaused] = useState(false);
  const lastActivityTimeRef = useRef(Date.now());

  // Favorites tracking for header counter
  const [favorites, setFavorites] = useState(() => getFavorites());

  // --------------------------------------------------------------------------
  // 1. Storage & Reactivity Subscriptions
  // --------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = subscribeToStorage((detail) => {
      if (detail.key === 'vexiq_live_queue_alerts' || !detail.key) {
        setQueueConfig(getQueueAlertConfig());
      }
      if (detail.key === 'vexiq_live_favorites' || !detail.key) {
        setFavorites(getFavorites());
      }
    });
    return () => unsubscribe();
  }, []);

  // --------------------------------------------------------------------------
  // 2. URL Hash Synchronization (#live-events and #live-events/:sku)
  // --------------------------------------------------------------------------
  const syncHashToState = useCallback(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash || '';
    
    if (hash.startsWith('#live-events/')) {
      const sku = decodeURIComponent(hash.replace('#live-events/', '').trim());
      if (sku) {
        if (!selectedEvent || (selectedEvent.sku !== sku && String(selectedEvent.id) !== sku)) {
          // Preload minimal placeholder while EventHub pulls full details
          setSelectedEvent({ sku, name: sku, id: sku });
          setCurrentView('hub');
        }
      }
    } else if (hash === '#live-events' || hash === '') {
      if (currentView === 'hub' && !selectedEvent) {
        setCurrentView('list');
      }
    }
  }, [selectedEvent, currentView]);

  useEffect(() => {
    syncHashToState();
    const handleHashChange = () => syncHashToState();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [syncHashToState]);

  // --------------------------------------------------------------------------
  // 3. User Activity & Inactivity Timeout Engine
  // --------------------------------------------------------------------------
  const recordUserActivity = useCallback(() => {
    lastActivityTimeRef.current = Date.now();
    if (isInactivePaused) {
      setIsInactivePaused(false);
    }
  }, [isInactivePaused]);

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(evt => window.addEventListener(evt, recordUserActivity, { passive: true }));

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Paused during background tab
      } else {
        const elapsed = Date.now() - lastActivityTimeRef.current;
        if (elapsed > INACTIVITY_TIMEOUT_MS) {
          setIsInactivePaused(true);
        } else {
          lastActivityTimeRef.current = Date.now();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const intervalId = setInterval(() => {
      if (!isInactivePaused && Date.now() - lastActivityTimeRef.current > INACTIVITY_TIMEOUT_MS) {
        setIsInactivePaused(true);
      }
    }, 10000);

    return () => {
      events.forEach(evt => window.removeEventListener(evt, recordUserActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [recordUserActivity, isInactivePaused]);

  // --------------------------------------------------------------------------
  // 4. Global Queue Alert Evaluation
  // --------------------------------------------------------------------------
  const runQueueEvaluation = useCallback((matchesList) => {
    if (!queueConfig || !queueConfig.enabled || !queueConfig.teamNumber) {
      setActiveQueueAlert(null);
      return;
    }
    const evalResult = evaluateQueueAlert(matchesList || activeMatches, queueConfig);
    if (evalResult && evalResult.shouldAlert) {
      setActiveQueueAlert(evalResult);
      // Play audio chime once per newly approaching match
      const currentMatchId = evalResult.teamMatch?.id;
      if (currentMatchId && currentMatchId !== lastChimedMatchId) {
        playQueueAlertChime({ volume: 0.35 }).catch(() => {});
        setLastChimedMatchId(currentMatchId);
        setIsAlertDismissed(false); // Un-dismiss when next match arrives
      }
    } else {
      setActiveQueueAlert(null);
    }
  }, [queueConfig, activeMatches, lastChimedMatchId]);

  useEffect(() => {
    runQueueEvaluation();
  }, [queueConfig, runQueueEvaluation]);

  // --------------------------------------------------------------------------
  // 5. Navigation Handlers
  // --------------------------------------------------------------------------
  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    setCurrentView('hub');
    if (typeof window !== 'undefined') {
      window.location.hash = `#live-events/${encodeURIComponent(event.sku || event.id)}`;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedEvent(null);
    if (typeof window !== 'undefined') {
      window.location.hash = '#live-events';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Modal Openers
  const handleOpenTeamProfile = useCallback((teamOrPayload) => {
    const teamNumber = typeof teamOrPayload === 'string'
      ? teamOrPayload
      : (teamOrPayload?.number || teamOrPayload?.team || teamOrPayload?.teamNumber || '');
    const modalPayload = typeof teamOrPayload === 'object' && teamOrPayload !== null
      ? { ...teamOrPayload, teamNumber }
      : { teamNumber, team: { number: teamNumber } };
    setActiveModalPayload(modalPayload);
    setActiveModal('profile');
  }, []);

  const handleOpenTeamCompare = useCallback((payload) => {
    let resolved = {};
    if (typeof payload === 'string' && payload.trim()) {
      resolved = { initialTeams: [payload.trim()], teamNumber: payload.trim() };
    } else if (Array.isArray(payload)) {
      resolved = { initialTeams: payload };
    } else if (payload && typeof payload === 'object') {
      const initialTeams = Array.isArray(payload.initialTeams)
        ? payload.initialTeams
        : (Array.isArray(payload.teams)
            ? payload.teams
            : (payload.teamNumber ? [payload.teamNumber] : []));
      resolved = { ...payload, initialTeams };
    }
    setActiveModalPayload(resolved);
    setActiveModal('compare');
  }, []);

  const handleOpenSimulator = useCallback((payload = {}) => {
    setActiveModalPayload(payload || {});
    setActiveModal('simulator');
  }, []);

  const handleOpenQueueAlert = useCallback((payload) => {
    setActiveModalPayload(payload || {});
    setActiveModal('queueAlert');
  }, []);

  const handleCloseModal = useCallback(() => {
    setActiveModal(null);
    setActiveModalPayload(null);
  }, []);

  return (
    <div className="space-y-6 pb-16 animate-fadeIn">

      {/* Top Feature Header & Global Tool Launcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-rose-500 via-red-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-rose-500/20 shrink-0">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                {t.pageTitle || (isVi ? 'Giải Đấu VEX IQ Trực Tiếp' : 'VEX IQ Live Tournaments')}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping inline-block" />
                {isVi ? 'TRỰC TIẾP' : 'LIVE'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isVi 
                ? 'Theo dõi trận đấu, tính OPR hợp tác và cảnh báo giờ ra sân theo thời gian thực'
                : 'Real-time match schedule, cooperative OPR, and queue alerts for Level Up 2026–2027'}
            </p>
          </div>
        </div>

        {/* Quick Utility Tool Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* World Skills Simulator Button */}
          <button
            type="button"
            onClick={() => handleOpenSimulator({})}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all hover:scale-105 active:scale-95"
            title={t.simulatorTitle || (isVi ? 'Giả lập xếp hạng Skills thế giới' : 'World Skills Simulator')}
          >
            <Target className="w-3.5 h-3.5 text-cyan-500" />
            <span>{isVi ? 'Giả lập Skills' : 'Skills Simulator'}</span>
          </button>

          {/* Team Compare Button */}
          <button
            type="button"
            onClick={() => handleOpenTeamCompare({})}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all hover:scale-105 active:scale-95"
            title={t.compareTitle || (isVi ? 'So sánh các đội' : 'Compare Teams')}
          >
            <GitCompare className="w-3.5 h-3.5 text-indigo-500" />
            <span>{isVi ? 'So sánh Đội' : 'Compare Teams'}</span>
          </button>

          {/* Queue Alert Settings Button */}
          <button
            type="button"
            onClick={() => handleOpenQueueAlert({})}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all hover:scale-105 active:scale-95 ${
              queueConfig.enabled && queueConfig.teamNumber
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
            }`}
            title={t.queueAlertModalTitle || (isVi ? 'Cài đặt cảnh báo xếp hàng' : 'Queue Alert Settings')}
          >
            <BellRing className={`w-3.5 h-3.5 ${queueConfig.enabled ? 'text-amber-500 animate-bounce' : 'text-slate-400'}`} />
            <span>
              {queueConfig.enabled && queueConfig.teamNumber 
                ? `${queueConfig.teamNumber} (${queueConfig.matchesAhead}m)` 
                : (isVi ? 'Báo Giờ Đấu' : 'Queue Alert')}
            </span>
          </button>
        </div>
      </div>

      {/* Global Inactivity Pause Banner */}
      {isInactivePaused && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <div className="text-xs sm:text-sm">
              <span className="font-bold block sm:inline">
                {t.inactivityPausedTitle || (isVi ? 'Đã tạm dừng tự động cập nhật' : 'Live updates paused')}
              </span>
              <span className="opacity-90 sm:ml-1">
                {t.inactivityPausedDesc || (isVi ? 'Tạm dừng sau 15 phút không hoạt động để tiết kiệm pin và băng thông.' : 'Paused after 15 minutes of inactivity to conserve bandwidth.')}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={recordUserActivity}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black shadow-sm transition-all hover:scale-105 active:scale-95 shrink-0"
          >
            {t.resumeLiveUpdates || (isVi ? 'Tiếp tục cập nhật' : 'Resume Live Updates')}
          </button>
        </div>
      )}

      {/* Global Active Queue Alert Notification Banner */}
      {activeQueueAlert && activeQueueAlert.shouldAlert && !isAlertDismissed && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-500/20 via-amber-500/20 to-rose-500/20 border-2 border-rose-500/50 dark:border-rose-400/60 shadow-lg shadow-rose-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase px-2 py-0.5 rounded-full bg-rose-600 text-white">
                  {activeQueueAlert.status === 'ON_FIELD' 
                    ? (isVi ? 'ĐANG TRÊN SÂN' : 'ON FIELD NOW') 
                    : (isVi ? 'SẮP LÊN SÂN' : 'QUEUE ALERT')}
                </span>
                <span className="text-xs font-mono font-black text-rose-700 dark:text-rose-300">
                  Team {activeQueueAlert.teamNumber}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                {activeQueueAlert.message}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {currentView === 'list' && selectedEvent && (
              <button
                type="button"
                onClick={() => setCurrentView('hub')}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-sm transition-all hover:scale-105 active:scale-95"
              >
                {t.queueAlertViewMatch || (isVi ? 'Vào xem trận' : 'View Match')}
              </button>
            )}
            <button
              type="button"
              onClick={() => handleOpenQueueAlert({})}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
            >
              {t.queueAlertSettings || (isVi ? 'Cài đặt' : 'Settings')}
            </button>
            <button
              type="button"
              onClick={() => setIsAlertDismissed(true)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors"
              title={t.queueAlertDismiss || (isVi ? 'Đóng thông báo' : 'Dismiss')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Primary Sub-View Switching: Event Discovery (List) vs Event Hub */}
      {currentView === 'list' ? (
        <EventList 
          onSelectEvent={handleSelectEvent}
          onSelectTeam={handleOpenTeamProfile}
          onOpenSimulator={handleOpenSimulator}
          onOpenCompare={handleOpenTeamCompare}
          onOpenQueueAlert={handleOpenQueueAlert}
          queueConfig={queueConfig}
          lang={lang}
          initialCountry="all"
        />
      ) : (
        <EventHub
          eventId={selectedEvent?.id || selectedEvent?.sku}
          event={selectedEvent}
          onBack={handleBackToList}
          onSelectTeam={handleOpenTeamProfile}
          onOpenQueueAlert={handleOpenQueueAlert}
          onSetAlert={handleOpenQueueAlert}
          onOpenTeamCompare={handleOpenTeamCompare}
          onCompareTeam={handleOpenTeamCompare}
          onOpenSimulator={handleOpenSimulator}
          lang={lang}
        />
      )}

      {/* Top-Level Scouting & Utility Modals */}

      {/* 1. Team Profile Modal */}
      {activeModal === 'profile' && activeModalPayload && (
        <TeamProfileModal
          isOpen={true}
          onClose={handleCloseModal}
          teamIdentifier={activeModalPayload.teamNumber}
          event={activeModalPayload.event || selectedEvent}
          division={activeModalPayload.division}
          matches={activeModalPayload.matches || []}
          rankings={activeModalPayload.rankings || []}
          skills={activeModalPayload.skills || []}
          teams={activeModalPayload.teams || []}
          awards={activeModalPayload.awards || []}
          oprMap={activeModalPayload.oprMap || null}
          onSelectTeam={handleOpenTeamProfile}
          onOpenCompare={handleOpenTeamCompare}
          onOpenQueueAlert={handleOpenQueueAlert}
          onOpenSimulator={handleOpenSimulator}
          lang={lang}
        />
      )}

      {/* 2. Team Compare Modal */}
      {activeModal === 'compare' && (
        <TeamCompareModal
          isOpen={true}
          onClose={handleCloseModal}
          initialTeams={activeModalPayload?.initialTeams || activeModalPayload?.teams || []}
          event={activeModalPayload?.event || selectedEvent}
          division={activeModalPayload?.division}
          matches={activeModalPayload?.matches || []}
          rankings={activeModalPayload?.rankings || []}
          skills={activeModalPayload?.skills || []}
          teams={activeModalPayload?.teams || []}
          awards={activeModalPayload?.awards || []}
          oprMap={activeModalPayload?.oprMap || null}
          onSelectTeam={handleOpenTeamProfile}
          lang={lang}
        />
      )}

      {/* 3. World Skills Simulator Modal */}
      {activeModal === 'simulator' && (
        <WorldSkillsSimulator
          isOpen={true}
          onClose={handleCloseModal}
          event={activeModalPayload?.event || selectedEvent}
          eventSkills={activeModalPayload?.eventSkills || activeModalPayload?.skills || []}
          initialDriverScore={activeModalPayload?.driverScore ?? activeModalPayload?.initialDriverScore ?? 40}
          initialProgScore={activeModalPayload?.progScore ?? activeModalPayload?.initialProgScore ?? 30}
          lang={lang}
        />
      )}

      {/* 4. Queue Alert Modal */}
      {activeModal === 'queueAlert' && (
        <QueueAlertModal
          isOpen={true}
          onClose={handleCloseModal}
          initialTeamNumber={activeModalPayload?.teamNumber || queueConfig?.teamNumber || ''}
          event={activeModalPayload?.event || selectedEvent}
          division={activeModalPayload?.division}
          matches={activeModalPayload?.matches || []}
          teams={activeModalPayload?.teams || []}
          lang={lang}
        />
      )}

    </div>
  );
}
