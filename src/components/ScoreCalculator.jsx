import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  RotateCcw, 
  Sparkles, 
  Save, 
  Copy, 
  Check, 
  AlertTriangle, 
  Layers, 
  Grid, 
  Clock, 
  Plus, 
  Minus,
  X,
  ChevronDown,
  CheckCircle2,
  Share2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  GAME_INFO, 
  INITIAL_QUICK_STATE, 
  INITIAL_DETAILED_STATE,
  calculateQuickScore,
  calculateDetailedScore
} from '../constants/rules';
import { translations } from '../constants/translations';
import { saveMatch, getSavedMatches } from '../utils/storage';
import ShareMatchesModal from './ShareMatchesModal';

export default function ScoreCalculator({ 
  skillsStopTime, 
  setSkillsStopTime, 
  onMatchSaved,
  externalLoadedState,
  lang = 'en'
}) {
  const t = translations[lang] || translations.en;

  // Scoring mode: 'quick' (default) or 'detailed'
  const [mode, setMode] = useState('quick');

  // Calculator states
  const [quickState, setQuickState] = useState(INITIAL_QUICK_STATE);
  const [detailedState, setDetailedState] = useState(INITIAL_DETAILED_STATE);

  // Notifications
  const [copied, setCopied] = useState(false);

  // Save Modal state
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [modalMatchType, setModalMatchType] = useState('teamwork');
  const [modalSessionTag, setModalSessionTag] = useState('practice');
  const [modalTeamName, setModalTeamName] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const [modalStopTime, setModalStopTime] = useState(skillsStopTime || 0);

  // More Options in Save Modal
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [modalMatchDate, setModalMatchDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [modalMinorViolations, setModalMinorViolations] = useState(0);
  const [modalMajorViolations, setModalMajorViolations] = useState(0);
  const [modalRobotType, setModalRobotType] = useState('');
  const [saveToast, setSaveToast] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Sync external loaded state if user restored from history
  useEffect(() => {
    if (externalLoadedState) {
      if (externalLoadedState.mode === 'quick' && externalLoadedState.quickState) {
        setMode('quick');
        setQuickState(externalLoadedState.quickState);
      } else if (externalLoadedState.detailedState) {
        setMode('detailed');
        setDetailedState(externalLoadedState.detailedState);
      }
      if (externalLoadedState.matchType) setModalMatchType(externalLoadedState.matchType);
      if (externalLoadedState.sessionTag) setModalSessionTag(externalLoadedState.sessionTag);
      if (externalLoadedState.skillsStopTime !== undefined) {
        setSkillsStopTime(externalLoadedState.skillsStopTime);
        setModalStopTime(externalLoadedState.skillsStopTime);
      }
      if (externalLoadedState.matchNotes) setModalNotes(externalLoadedState.matchNotes);
      if (externalLoadedState.teamName) setModalTeamName(externalLoadedState.teamName);
      if (externalLoadedState.matchDate) setModalMatchDate(externalLoadedState.matchDate);
      if (externalLoadedState.minorViolations !== undefined) setModalMinorViolations(externalLoadedState.minorViolations);
      if (externalLoadedState.majorViolations !== undefined) setModalMajorViolations(externalLoadedState.majorViolations);
      if (externalLoadedState.robotType) setModalRobotType(externalLoadedState.robotType);
    }
  }, [externalLoadedState]);

  // Keep modal stop time updated when external stop time changes from timer
  useEffect(() => {
    setModalStopTime(skillsStopTime || 0);
  }, [skillsStopTime]);

  // Compute scores based on current mode
  const quickResult = calculateQuickScore(quickState);
  const detailedResult = calculateDetailedScore(detailedState);

  const currentResult = mode === 'quick' ? quickResult : detailedResult;
  const currentTotalScore = currentResult.totalPoints;
  const currentTotalBags = currentResult.totalBags;

  // Bag inventory counts
  const redBagsUsed = mode === 'detailed' ? detailedResult.redBags : (quickState.redBags || 0);
  const blueBagsUsed = mode === 'detailed' ? detailedResult.blueBags : (quickState.blueBags || 0);
  const yellowBagsUsed = mode === 'detailed' ? detailedResult.yellowBags : (quickState.l4 || 0);

  // Stepper helper
  const updateDetailed = (key, delta) => {
    setDetailedState(prev => {
      const currentVal = prev[key] || 0;
      const newVal = Math.max(0, currentVal + delta);
      return { ...prev, [key]: newVal };
    });
  };

  const updateQuick = (key, delta) => {
    setQuickState(prev => {
      const currentVal = prev[key] || 0;
      const newVal = Math.max(0, currentVal + delta);
      return { ...prev, [key]: newVal };
    });
  };

  const handleReset = () => {
    if (window.confirm(t.resetConfirm)) {
      setQuickState(INITIAL_QUICK_STATE);
      setDetailedState(INITIAL_DETAILED_STATE);
      setSkillsStopTime(0);
      setModalStopTime(0);
    }
  };

  const handleMaxPreset = () => {
    if (mode === 'detailed') {
      setDetailedState({
        floorRed: 0,
        l1Red: 0,
        l2Red: 0,
        l3Red: 16,
        floorBlue: 0,
        l1Blue: 0,
        l2Blue: 0,
        l3Blue: 16,
        floorYellow: 0,
        l1Yellow: 0,
        l2Yellow: 0,
        l3Yellow: 0,
        l4Yellow: 6
      });
    } else {
      setQuickState({
        floor: 0,
        l1: 0,
        l2: 0,
        l3: 32,
        l4: 6,
        redBags: 16,
        blueBags: 16,
        yellowBags: 6
      });
    }
  };

  const handleOpenSaveModal = () => {
    setModalStopTime(skillsStopTime || 0);
    setIsSaveModalOpen(true);
  };

  const handleConfirmSave = (e) => {
    e.preventDefault();
    const saved = getSavedMatches();
    const existingHigh = saved.reduce((max, m) => Math.max(max, m.score || 0), 0);

    const matchPayload = {
      score: currentTotalScore,
      totalBags: currentTotalBags,
      matchType: modalMatchType,
      sessionTag: modalSessionTag,
      matchDate: modalMatchDate,
      minorViolations: Number(modalMinorViolations) || 0,
      majorViolations: Number(modalMajorViolations) || 0,
      robotType: modalRobotType,
      teamName: modalTeamName.trim() || 'My Robot',
      matchNotes: modalNotes.trim(),
      skillsStopTime: modalMatchType !== 'teamwork' ? Number(modalStopTime) : 0,
      mode,
      details: mode === 'detailed' ? detailedState : quickState,
      breakdown: currentResult
    };

    const savedResult = saveMatch(matchPayload);
    setIsSaveModalOpen(false);

    if (savedResult) {
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 3500);
    }

    // Fire celebration if high score
    if (currentTotalScore > 0 && currentTotalScore > existingHigh) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }

    if (onMatchSaved) {
      onMatchSaved();
    }
  };

  const handleCopySummary = () => {
    const summaryLines = [
      `🏆 VEX IQ Level Up - Score Summary`,
      `Total Score: ${currentTotalScore} PTS (${currentTotalBags} Bags)`,
      skillsStopTime > 0 ? `Stop Time: ${skillsStopTime}s` : null,
      `--- Breakdown ---`,
      mode === 'detailed' 
        ? `L4 Top (Yellow): ${detailedState.l4Yellow} bags (${detailedState.l4Yellow * 16} pts)\n` +
          `L3: Red ${detailedState.l3Red}, Blue ${detailedState.l3Blue}, Yellow ${detailedState.l3Yellow}\n` +
          `L2: Red ${detailedState.l2Red}, Blue ${detailedState.l2Blue}, Yellow ${detailedState.l2Yellow}\n` +
          `L1: Red ${detailedState.l1Red}, Blue ${detailedState.l1Blue}, Yellow ${detailedState.l1Yellow}\n` +
          `Floor: Red ${detailedState.floorRed}, Blue ${detailedState.floorBlue}, Yellow ${detailedState.floorYellow}`
        : `L4: ${quickState.l4} bags\nL3: ${quickState.l3} bags\nL2: ${quickState.l2} bags\nL1: ${quickState.l1} bags\nFloor: ${quickState.floor} bags`
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(summaryLines);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Bar: Mode Switcher */}
      <div className="flex items-center justify-between">
        <div className="inline-flex p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <button
            type="button"
            onClick={() => setMode('quick')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              mode === 'quick'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{t.quickMode}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('detailed')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              mode === 'detailed'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>{t.detailedMode}</span>
          </button>
        </div>

        {/* Small Stop Time Indicator if timer captured one */}
        {skillsStopTime > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-mono font-bold">
            <Clock className="w-3.5 h-3.5" />
            <span>{t.stopTime}: {skillsStopTime}s</span>
          </div>
        )}
      </div>

      {/* Hero Score Display Banner */}
      <div className="relative overflow-hidden bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Trophy className="w-4 h-4" />
              <span>{t.points}</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-6xl md:text-8xl font-black font-mono tracking-tight text-slate-900 dark:text-white drop-shadow-sm">
                {currentTotalScore}
              </span>
              <span className="text-xl md:text-2xl font-bold text-slate-400">
                {t.points}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs md:text-sm text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 font-semibold text-slate-700 dark:text-slate-300">
                {t.totalBags}: <strong>{currentTotalBags}</strong> / 38
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleOpenSaveModal}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white dark:text-slate-950 font-extrabold hover:brightness-105 active:scale-95 transition-all shadow-lg shadow-emerald-500/25"
            >
              <Save className="w-5 h-5" />
              <span>{t.saveMatch}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-slate-700 dark:text-slate-200 hover:text-cyan-600 dark:hover:text-cyan-400 font-semibold transition-all active:scale-95 text-xs sm:text-sm"
              title={t.shareMatches}
            >
              <Share2 className="w-4 h-4 text-cyan-500" />
              <span>{t.shareMatches}</span>
            </button>

            <button
              type="button"
              onClick={handleCopySummary}
              className="flex items-center gap-2 px-4 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition-all active:scale-95 text-sm"
              title="Copy"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? t.copied : t.copy}</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-600 dark:hover:text-rose-300 text-slate-600 dark:text-slate-300 font-medium transition-all active:scale-95 text-sm"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t.reset}</span>
            </button>

            <button
              type="button"
              onClick={handleMaxPreset}
              className="flex items-center gap-1.5 px-3 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-xs font-bold transition-all"
              title="Max Score Preset"
            >
              <Sparkles className="w-4 h-4" />
              <span>{t.maxPreset}</span>
            </button>
          </div>
        </div>

        {/* Warning if over 38 */}
        {currentTotalBags > 38 && (
          <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/40 rounded-2xl flex items-center gap-3 text-rose-700 dark:text-rose-300 text-xs">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-500" />
            <span>{t.over38Warning}</span>
          </div>
        )}
      </div>

      {/* DETAILED MODE (Red Pyramid vs Blue Pyramid vs Yellow) */}
      {mode === 'detailed' ? (
        <div className="space-y-6">
          
          {/* L4 Top Goal (Yellow ONLY - 16 PTS) */}
          <div className="bg-amber-50/60 dark:bg-slate-900/90 border-2 border-amber-400 dark:border-yellow-500/40 rounded-3xl p-5 md:p-6 shadow-md relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950 shadow-sm">
                    L4
                  </span>
                  <span className="text-xs font-mono text-amber-700 dark:text-yellow-400 font-extrabold">
                    16 {t.pts}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {t.l4Goal}
                </h3>
                <p className="text-xs text-amber-800/80 dark:text-slate-400 font-medium">
                  {t.l4Subtitle}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-mono text-amber-700 dark:text-yellow-400 font-bold">
                  {detailedState.l4Yellow * 16} {t.pts}
                </span>
                <div className="flex items-center bg-white dark:bg-slate-950 border border-amber-300 dark:border-yellow-500/50 rounded-2xl p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => updateDetailed('l4Yellow', -1)}
                    disabled={detailedState.l4Yellow <= 0}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 active:scale-95 transition-all"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-mono text-xl font-black text-amber-600 dark:text-yellow-300">
                    {detailedState.l4Yellow}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateDetailed('l4Yellow', 1)}
                    disabled={detailedState.l4Yellow >= 6}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 disabled:opacity-30 active:scale-95 transition-all shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Red & Blue Pyramids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* RED PYRAMID */}
            <div className="bg-red-50/40 dark:bg-slate-900/90 border border-red-200 dark:border-red-500/30 rounded-3xl p-5 md:p-6 shadow-md">
              <div className="flex items-center justify-between border-b border-red-200 dark:border-red-500/20 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">{t.redPyramid}</h3>
                </div>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 font-bold">
                  Red & Yellow
                </span>
              </div>

              <div className="space-y-3.5">
                {[
                  { level: t.l3Goal, key: 'l3Red', pts: 12 },
                  { level: t.l2Goal, key: 'l2Red', pts: 6 },
                  { level: t.l1Goal, key: 'l1Red', pts: 3 },
                  { level: t.floorGoal, key: 'floorRed', pts: 1 },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div>
                      <div className="text-xs font-bold text-red-600 dark:text-red-400">{item.level}</div>
                      <div className="text-[11px] text-slate-500 font-mono font-semibold">{item.pts} {t.pts}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-400 font-bold">
                        {(detailedState[item.key] || 0) * item.pts} {t.pts}
                      </span>
                      <div className="flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5">
                        <button
                          type="button"
                          onClick={() => updateDetailed(item.key, -1)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 active:scale-90"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-9 text-center font-mono font-extrabold text-red-600 dark:text-red-400">
                          {detailedState[item.key] || 0}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateDetailed(item.key, 1)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-600 text-white font-bold hover:bg-red-500 active:scale-90 shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* BLUE PYRAMID */}
            <div className="bg-blue-50/40 dark:bg-slate-900/90 border border-blue-200 dark:border-blue-500/30 rounded-3xl p-5 md:p-6 shadow-md">
              <div className="flex items-center justify-between border-b border-blue-200 dark:border-blue-500/20 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">{t.bluePyramid}</h3>
                </div>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold">
                  Blue & Yellow
                </span>
              </div>

              <div className="space-y-3.5">
                {[
                  { level: t.l3Goal, key: 'l3Blue', pts: 12 },
                  { level: t.l2Goal, key: 'l2Blue', pts: 6 },
                  { level: t.l1Goal, key: 'l1Blue', pts: 3 },
                  { level: t.floorGoal, key: 'floorBlue', pts: 1 },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div>
                      <div className="text-xs font-bold text-blue-600 dark:text-blue-400">{item.level}</div>
                      <div className="text-[11px] text-slate-500 font-mono font-semibold">{item.pts} {t.pts}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-400 font-bold">
                        {(detailedState[item.key] || 0) * item.pts} {t.pts}
                      </span>
                      <div className="flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5">
                        <button
                          type="button"
                          onClick={() => updateDetailed(item.key, -1)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 active:scale-90"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-9 text-center font-mono font-extrabold text-blue-600 dark:text-blue-400">
                          {detailedState[item.key] || 0}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateDetailed(item.key, 1)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500 active:scale-90 shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* QUICK MODE */
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          {[
            { level: 'L4 (Yellow)', key: 'l4', pts: 16, border: 'border-amber-400 dark:border-yellow-500/50', text: 'text-amber-600 dark:text-yellow-400', max: 6 },
            { level: 'L3', key: 'l3', pts: 12, border: 'border-cyan-300 dark:border-cyan-500/40', text: 'text-cyan-600 dark:text-cyan-400' },
            { level: 'L2', key: 'l2', pts: 6, border: 'border-blue-300 dark:border-blue-500/40', text: 'text-blue-600 dark:text-blue-400' },
            { level: 'L1', key: 'l1', pts: 3, border: 'border-emerald-300 dark:border-emerald-500/40', text: 'text-emerald-600 dark:text-emerald-400' },
            { level: 'Floor', key: 'floor', pts: 1, border: 'border-slate-300 dark:border-slate-700', text: 'text-slate-700 dark:text-slate-200' },
          ].map(item => (
            <div key={item.key} className={`bg-white dark:bg-slate-900 border ${item.border} rounded-3xl p-4 text-center shadow-md flex flex-col justify-between`}>
              <div>
                <span className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">{item.level}</span>
                <div className={`text-2xl font-mono font-black ${item.text} mt-1`}>
                  {item.pts} {t.pts}
                </div>
              </div>
              <div className="mt-4">
                <div className="text-xs font-mono font-bold text-slate-400 mb-2">
                  {(quickState[item.key] || 0) * item.pts} {t.pts}
                </div>
                <div className="flex items-center justify-center gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => updateQuick(item.key, -1)}
                    className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 flex items-center justify-center shadow-sm"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className={`w-9 font-mono text-lg font-bold ${item.text}`}>
                    {quickState[item.key] || 0}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuick(item.key, 1)}
                    disabled={item.max && (quickState[item.key] || 0) >= item.max}
                    className="w-9 h-9 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 flex items-center justify-center shadow-sm disabled:opacity-30"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bag Quotas Bar */}
      <div className="bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {t.totalBags} Quota:
        </span>
        <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono font-bold">
          <span className="px-3 py-1 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-300">
            {t.quotaRed}: {redBagsUsed} / 16
          </span>
          <span className="px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-300">
            {t.quotaBlue}: {blueBagsUsed} / 16
          </span>
          <span className="px-3 py-1 rounded-xl bg-amber-50 dark:bg-yellow-500/10 border border-amber-200 dark:border-yellow-500/30 text-amber-600 dark:text-yellow-300">
            {t.quotaYellow}: {yellowBagsUsed} / 6
          </span>
          <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
            {t.quotaTotal}: {currentTotalBags} / 38
          </span>
        </div>
      </div>

      {/* POPUP MODAL: Shown ONLY when user clicks SAVE button */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Save className="w-5 h-5 text-emerald-500" />
                  <span>{t.modalSaveTitle}</span>
                </h3>
                <span className="text-xs text-slate-500">
                  {t.modalScoreLabel}: <strong className="text-cyan-600 dark:text-cyan-400 text-sm font-mono">{currentTotalScore} {t.pts}</strong> ({currentTotalBags} {t.bags})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmSave} className="space-y-4">
              {/* Category */}
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  {t.modalCategory}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'driving', label: t.driving },
                    { id: 'auton', label: t.auton },
                    { id: 'teamwork', label: t.teamwork }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setModalMatchType(cat.id)}
                      className={`px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        modalMatchType === cat.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Activity Tag */}
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  {t.modalTag}
                </label>
                <select
                  value={modalSessionTag}
                  onChange={(e) => setModalSessionTag(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="practice">{t.practice}</option>
                  <option value="testing">{t.testing}</option>
                  <option value="debugging">{t.debugging}</option>
                  <option value="building">{t.building}</option>
                  <option value="official">{t.official}</option>
                  <option value="scrimmage">{t.scrimmage}</option>
                </select>
              </div>

              {/* Stop Time (Simplified wording as requested) */}
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  {t.stopTime} (0 - 60s)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={modalStopTime}
                    onChange={(e) => setModalStopTime(Math.max(0, Math.min(60, Number(e.target.value) || 0)))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-amber-600 dark:text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-xs text-slate-400 font-mono">sec</span>
                </div>
              </div>

              {/* Team Name */}
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  {t.modalTeam}
                </label>
                <input
                  type="text"
                  placeholder="e.g. 79813J / Hero Bot"
                  value={modalTeamName}
                  onChange={(e) => setModalTeamName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  {t.modalNotes}
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. tested auton path with new intake"
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* More Details Toggle Button */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowMoreOptions(!showMoreOptions)}
                  className="flex items-center gap-1.5 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline py-1"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${showMoreOptions ? 'rotate-180' : ''}`} />
                  <span>{showMoreOptions ? t.lessOptions : t.moreOptions} ({t.matchDate}, Violations, {t.robotType}...)</span>
                </button>
              </div>

              {/* Collapsible More Options Section */}
              {showMoreOptions && (
                <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3.5">
                  
                  {/* Match Date / Day */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      {t.matchDate}
                    </label>
                    <input
                      type="date"
                      value={modalMatchDate}
                      onChange={(e) => setModalMatchDate(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>

                  {/* Robot Type */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      {t.robotType}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        list="robotTypesList"
                        placeholder={t.customRobotPlaceholder}
                        value={modalRobotType}
                        onChange={(e) => setModalRobotType(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500 font-medium"
                      />
                      <datalist id="robotTypesList">
                        <option value={t.heroBot} />
                        <option value={t.liftBot} />
                        <option value={t.catapultBot} />
                        <option value={t.clawBot} />
                        <option value={t.customBot} />
                      </datalist>
                    </div>
                    {/* Quick suggestion pills */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[t.heroBot, t.liftBot, t.catapultBot, t.clawBot].map(item => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setModalRobotType(modalRobotType === item ? '' : item)}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                            modalRobotType === item
                              ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-500 shadow-sm'
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Minor & Major Violations */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-amber-600 dark:text-amber-400 block mb-1">
                        {t.minorViolations}
                      </label>
                      <div className="flex items-center bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-500/40 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() => setModalMinorViolations(Math.max(0, modalMinorViolations - 1))}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="flex-1 text-center font-mono font-bold text-sm text-slate-900 dark:text-white">
                          {modalMinorViolations}
                        </span>
                        <button
                          type="button"
                          onClick={() => setModalMinorViolations(modalMinorViolations + 1)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-rose-600 dark:text-rose-400 block mb-1">
                        {t.majorViolations}
                      </label>
                      <div className="flex items-center bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-500/40 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() => setModalMajorViolations(Math.max(0, modalMajorViolations - 1))}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="flex-1 text-center font-mono font-bold text-sm text-slate-900 dark:text-white">
                          {modalMajorViolations}
                        </span>
                        <button
                          type="button"
                          onClick={() => setModalMajorViolations(modalMajorViolations + 1)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-500"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  {t.modalCancel}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 text-white dark:text-slate-950 font-black text-sm hover:bg-emerald-400 shadow-md shadow-emerald-500/20"
                >
                  {t.modalSaveButton}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Save Success Floating Toast */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-900 text-white border border-emerald-500/50 shadow-2xl shadow-emerald-500/20 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-xs sm:text-sm font-bold">{t.savedMatchSuccessToast}</span>
        </div>
      )}

      {/* Share Matches Modal */}
      <ShareMatchesModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        lang={lang}
      />
    </div>
  );
}
