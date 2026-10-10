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
  Tag, 
  Info,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  GAME_INFO, 
  MATCH_TYPES, 
  SESSION_TAGS, 
  INITIAL_QUICK_STATE, 
  INITIAL_DETAILED_STATE,
  calculateQuickScore,
  calculateDetailedScore
} from '../constants/rules';
import { saveMatch, getSavedMatches } from '../utils/storage';

export default function ScoreCalculator({ 
  skillsStopTime, 
  setSkillsStopTime, 
  onMatchSaved,
  externalLoadedState 
}) {
  // Scoring mode: 'quick' or 'detailed'
  const [mode, setMode] = useState('detailed');

  // Match metadata
  const [matchType, setMatchType] = useState('driving');
  const [sessionTag, setSessionTag] = useState('practice');
  const [matchNotes, setMatchNotes] = useState('');
  const [teamName, setTeamName] = useState('');

  // States
  const [quickState, setQuickState] = useState(INITIAL_QUICK_STATE);
  const [detailedState, setDetailedState] = useState(INITIAL_DETAILED_STATE);

  // Notification states
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

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
      if (externalLoadedState.matchType) setMatchType(externalLoadedState.matchType);
      if (externalLoadedState.sessionTag) setSessionTag(externalLoadedState.sessionTag);
      if (externalLoadedState.skillsStopTime !== undefined) setSkillsStopTime(externalLoadedState.skillsStopTime);
      if (externalLoadedState.matchNotes) setMatchNotes(externalLoadedState.matchNotes);
      if (externalLoadedState.teamName) setTeamName(externalLoadedState.teamName);
    }
  }, [externalLoadedState]);

  // Compute scores based on current mode
  const quickResult = calculateQuickScore(quickState);
  const detailedResult = calculateDetailedScore(detailedState);

  const currentResult = mode === 'quick' ? quickResult : detailedResult;
  const currentTotalScore = currentResult.totalPoints;
  const currentTotalBags = currentResult.totalBags;

  // Bag inventory counts for detailed mode
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
    if (window.confirm("Reset calculator to 0?")) {
      setQuickState(INITIAL_QUICK_STATE);
      setDetailedState(INITIAL_DETAILED_STATE);
      setSkillsStopTime(0);
      setMatchNotes('');
    }
  };

  const handleMaxPreset = () => {
    // Maximum legal theoretical score:
    // All 6 Yellow bags on L4 = 6 * 16 = 96
    // 16 Red bags and 16 Blue bags all on L3 = 32 * 12 = 384
    // Total = 480 points!
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

  const handleSave = () => {
    const saved = getSavedMatches();
    const existingHigh = saved.reduce((max, m) => Math.max(max, m.score || 0), 0);

    const matchPayload = {
      score: currentTotalScore,
      totalBags: currentTotalBags,
      matchType,
      sessionTag,
      teamName: teamName.trim() || 'My Robot',
      matchNotes: matchNotes.trim(),
      skillsStopTime: matchType !== 'teamwork' ? Number(skillsStopTime) : 0,
      mode,
      details: mode === 'detailed' ? detailedState : quickState,
      breakdown: currentResult
    };

    saveMatch(matchPayload);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);

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
      `Match Type: ${MATCH_TYPES.find(t => t.id === matchType)?.label}`,
      `Session: ${SESSION_TAGS.find(t => t.id === sessionTag)?.label}`,
      teamName ? `Team: ${teamName}` : null,
      `Total Score: ${currentTotalScore} PTS (${currentTotalBags} Bags)`,
      matchType !== 'teamwork' && skillsStopTime > 0 ? `Skills Stop Time: ${skillsStopTime}s remaining` : null,
      `--- Breakdown ---`,
      mode === 'detailed' 
        ? `L4 Top (Yellow): ${detailedState.l4Yellow} bags (${detailedState.l4Yellow * 16} pts)\n` +
          `L3 (Red ${detailedState.l3Red}, Blue ${detailedState.l3Blue}, Yellow ${detailedState.l3Yellow}): ${(detailedState.l3Red + detailedState.l3Blue + detailedState.l3Yellow) * 12} pts\n` +
          `L2 (Red ${detailedState.l2Red}, Blue ${detailedState.l2Blue}, Yellow ${detailedState.l2Yellow}): ${(detailedState.l2Red + detailedState.l2Blue + detailedState.l2Yellow) * 6} pts\n` +
          `L1 (Red ${detailedState.l1Red}, Blue ${detailedState.l1Blue}, Yellow ${detailedState.l1Yellow}): ${(detailedState.l1Red + detailedState.l1Blue + detailedState.l1Yellow) * 3} pts\n` +
          `Floor (Red ${detailedState.floorRed}, Blue ${detailedState.floorBlue}, Yellow ${detailedState.floorYellow}): ${detailedState.floorRed + detailedState.floorBlue + detailedState.floorYellow} pts`
        : `L4: ${quickState.l4} bags (${quickState.l4 * 16} pts)\n` +
          `L3: ${quickState.l3} bags (${quickState.l3 * 12} pts)\n` +
          `L2: ${quickState.l2} bags (${quickState.l2 * 6} pts)\n` +
          `L1: ${quickState.l1} bags (${quickState.l1 * 3} pts)\n` +
          `Floor: ${quickState.floor} bags (${quickState.floor * 1} pts)`,
      matchNotes ? `Notes: "${matchNotes}"` : null
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(summaryLines);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Mode & Match Configuration */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Mode Switcher */}
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Scoring Layout Mode
            </span>
            <div className="inline-flex p-1 bg-slate-950 border border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setMode('detailed')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  mode === 'detailed'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Grid className="w-4 h-4" />
                <span>Detailed Split (Red / Blue / Yellow)</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('quick')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  mode === 'quick'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Quick Levels (L1 - L4)</span>
              </button>
            </div>
          </div>

          {/* Match Type Pills */}
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Match Category
            </span>
            <div className="flex flex-wrap gap-2">
              {MATCH_TYPES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setMatchType(t.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs md:text-sm font-semibold transition-all border ${
                    matchType === t.id
                      ? 'bg-blue-600/30 border-blue-500 text-blue-300 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Second Row: Session Tag & Notes & Skills Stop Time */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Activity Tag */}
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-cyan-400" />
              Activity Tag
            </label>
            <select
              value={sessionTag}
              onChange={(e) => setSessionTag(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {SESSION_TAGS.map(tag => (
                <option key={tag.id} value={tag.id}>
                  {tag.label}
                </option>
              ))}
            </select>
          </div>

          {/* Team / Robot ID */}
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">
              Team / Robot Note
            </label>
            <input
              type="text"
              placeholder="e.g. 20160M - HeroBot"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Skills Stop Time (for Skills runs) */}
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Skills Stop Time (seconds left)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="60"
                value={skillsStopTime}
                onChange={(e) => setSkillsStopTime(Math.max(0, Math.min(60, Number(e.target.value) || 0)))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
              />
              <span className="text-xs text-slate-500 font-mono">sec</span>
            </div>
          </div>

          {/* Quick Notes */}
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">
              Test Run Notes
            </label>
            <input
              type="text"
              placeholder="e.g. new intake roller test"
              value={matchNotes}
              onChange={(e) => setMatchNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Hero Score Display Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Trophy className="w-4 h-4" />
              <span>Official Calculated Score</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl md:text-7xl font-black font-mono tracking-tight text-white drop-shadow-md">
                {currentTotalScore}
              </span>
              <span className="text-xl md:text-2xl font-bold text-slate-400">
                POINTS
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs md:text-sm text-slate-400">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 font-medium">
                Total Bags: <strong className="text-slate-200">{currentTotalBags}</strong> / 38
              </span>
              {matchType !== 'teamwork' && skillsStopTime > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                  Stop Time: <strong>{skillsStopTime}s</strong>
                </span>
              )}
            </div>
          </div>

          {/* Action Button Strip */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-5 h-5" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Save Match</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCopySummary}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 font-semibold transition-all active:scale-95"
              title="Copy score breakdown to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700/80 hover:bg-rose-900/40 hover:text-rose-300 hover:border-rose-500/50 text-slate-300 transition-all active:scale-95"
              title="Reset counters to 0"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>

            <button
              type="button"
              onClick={handleMaxPreset}
              className="flex items-center gap-2 px-3 py-3 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:bg-cyan-950/40 hover:text-cyan-300 text-slate-400 text-xs transition-all"
              title="Set maximum possible score"
            >
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span>Max</span>
            </button>
          </div>
        </div>

        {/* Capacity Warning Alert if over 38 bags or specific limits */}
        {currentTotalBags > 38 && (
          <div className="mt-4 p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl flex items-center gap-3 text-rose-300 text-xs md:text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <span>
              <strong>Warning:</strong> The field only has 38 Bean Bags in total. Currently {currentTotalBags} bags are counted.
            </span>
          </div>
        )}
      </div>

      {/* Detailed Mode Scoring Sections (Split Red vs Blue vs Yellow) */}
      {mode === 'detailed' ? (
        <div className="space-y-6">
          {/* Top Level 4 Goal (YELLOW ONLY - 16 PTS) */}
          <div className="bg-slate-900/90 border-2 border-yellow-500/40 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                    LEVEL 4 GOAL
                  </span>
                  <span className="text-xs font-mono text-yellow-400 font-bold">16 PTS EACH</span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1">
                  Top L4 Goal <span className="text-xs font-normal text-slate-400">(Yellow Bean Bags ONLY — Max 6)</span>
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-mono text-yellow-400 font-bold">
                  {detailedState.l4Yellow * 16} PTS
                </span>
                <div className="flex items-center bg-slate-950 border border-yellow-500/50 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => updateDetailed('l4Yellow', -1)}
                    disabled={detailedState.l4Yellow <= 0}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-900 text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none active:scale-95"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-mono text-xl font-bold text-yellow-300">
                    {detailedState.l4Yellow}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateDetailed('l4Yellow', 1)}
                    disabled={detailedState.l4Yellow >= 6}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-yellow-500 text-slate-950 font-bold hover:bg-yellow-400 disabled:opacity-30 disabled:pointer-events-none active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            
            <p className="text-xs text-slate-400">
              Per rule <strong className="text-yellow-400">&lt;SC5&gt;</strong>: Only yellow Bean Bags count as scored on the L4 Goal. Red or blue bags cannot score on L4.
            </p>
          </div>

          {/* Goal Grids: Red Pyramid & Blue Pyramid Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* RED PYRAMID & FLOOR GOAL */}
            <div className="bg-slate-900/90 border border-red-500/30 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between border-b border-red-500/20 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
                  <h3 className="font-bold text-white text-base">Red Pyramid & Floor Goal</h3>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 font-semibold">
                  Red & Yellow Bags
                </span>
              </div>

              <div className="space-y-4">
                {/* L3 Red (12 pts) */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div>
                    <div className="text-xs font-bold text-red-400">L3 GOAL (12 PTS)</div>
                    <div className="text-xs text-slate-400">Highest pyramid step</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-400 font-bold">
                      {detailedState.l3Red * 12} pts
                    </span>
                    <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => updateDetailed('l3Red', -1)}
                        className="w-8 h-8 flex items-center justify-center rounded text-slate-300 hover:bg-slate-800 active:scale-90"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-9 text-center font-mono font-bold text-red-400">
                        {detailedState.l3Red}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateDetailed('l3Red', 1)}
                        className="w-8 h-8 flex items-center justify-center rounded bg-red-600/80 text-white hover:bg-red-500 active:scale-90"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* L2 Red (6 pts) */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div>
                    <div className="text-xs font-bold text-red-400">L2 GOAL (6 PTS)</div>
                    <div className="text-xs text-slate-400">Middle pyramid step</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-400 font-bold">
                      {detailedState.l2Red * 6} pts
                    </span>
                    <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => updateDetailed('l2Red', -1)}
                        className="w-8 h-8 flex items-center justify-center rounded text-slate-300 hover:bg-slate-800 active:scale-90"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-9 text-center font-mono font-bold text-red-400">
                        {detailedState.l2Red}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateDetailed('l2Red', 1)}
                        className="w-8 h-8 flex items-center justify-center rounded bg-red-600/80 text-white hover:bg-red-500 active:scale-90"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* L1 Red (3 pts) */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div>
                    <div className="text-xs font-bold text-red-400">L1 GOAL (3 PTS)</div>
                    <div className="text-xs text-slate-400">Lowest pyramid step</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-400 font-bold">
                      {detailedState.l1Red * 3} pts
                    </span>
                    <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => updateDetailed('l1Red', -1)}
                        className="w-8 h-8 flex items-center justify-center rounded text-slate-300 hover:bg-slate-800 active:scale-90"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-9 text-center font-mono font-bold text-red-400">
                        {detailedState.l1Red}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateDetailed('l1Red', 1)}
                        className="w-8 h-8 flex items-center justify-center rounded bg-red-600/80 text-white hover:bg-red-500 active:scale-90"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Floor Goal Red (1 pt) */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div>
                    <div className="text-xs font-bold text-red-400">RED FLOOR GOAL (1 PT)</div>
                    <div className="text-xs text-slate-400">Inside red floor boundary</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-400 font-bold">
                      {detailedState.floorRed * 1} pts
                    </span>
                    <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => updateDetailed('floorRed', -1)}
                        className="w-8 h-8 flex items-center justify-center rounded text-slate-300 hover:bg-slate-800 active:scale-90"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-9 text-center font-mono font-bold text-red-400">
                        {detailedState.floorRed}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateDetailed('floorRed', 1)}
                        className="w-8 h-8 flex items-center justify-center rounded bg-red-600/80 text-white hover:bg-red-500 active:scale-90"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* BLUE PYRAMID & FLOOR GOAL */}
            <div className="bg-slate-900/90 border border-blue-500/30 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between border-b border-blue-500/20 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
                  <h3 className="font-bold text-white text-base">Blue Pyramid & Floor Goal</h3>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
                  Blue & Yellow Bags
                </span>
              </div>

              <div className="space-y-4">
                {/* L3 Blue (12 pts) */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div>
                    <div className="text-xs font-bold text-blue-400">L3 GOAL (12 PTS)</div>
                    <div className="text-xs text-slate-400">Highest pyramid step</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-400 font-bold">
                      {detailedState.l3Blue * 12} pts
                    </span>
                    <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => updateDetailed('l3Blue', -1)}
                        className="w-8 h-8 flex items-center justify-center rounded text-slate-300 hover:bg-slate-800 active:scale-90"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-9 text-center font-mono font-bold text-blue-400">
                        {detailedState.l3Blue}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateDetailed('l3Blue', 1)}
                        className="w-8 h-8 flex items-center justify-center rounded bg-blue-600/80 text-white hover:bg-blue-500 active:scale-90"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* L2 Blue (6 pts) */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div>
                    <div className="text-xs font-bold text-blue-400">L2 GOAL (6 PTS)</div>
                    <div className="text-xs text-slate-400">Middle pyramid step</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-400 font-bold">
                      {detailedState.l2Blue * 6} pts
                    </span>
                    <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => updateDetailed('l2Blue', -1)}
                        className="w-8 h-8 flex items-center justify-center rounded text-slate-300 hover:bg-slate-800 active:scale-90"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-9 text-center font-mono font-bold text-blue-400">
                        {detailedState.l2Blue}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateDetailed('l2Blue', 1)}
                        className="w-8 h-8 flex items-center justify-center rounded bg-blue-600/80 text-white hover:bg-blue-500 active:scale-90"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* L1 Blue (3 pts) */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div>
                    <div className="text-xs font-bold text-blue-400">L1 GOAL (3 PTS)</div>
                    <div className="text-xs text-slate-400">Lowest pyramid step</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-400 font-bold">
                      {detailedState.l1Blue * 3} pts
                    </span>
                    <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => updateDetailed('l1Blue', -1)}
                        className="w-8 h-8 flex items-center justify-center rounded text-slate-300 hover:bg-slate-800 active:scale-90"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-9 text-center font-mono font-bold text-blue-400">
                        {detailedState.l1Blue}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateDetailed('l1Blue', 1)}
                        className="w-8 h-8 flex items-center justify-center rounded bg-blue-600/80 text-white hover:bg-blue-500 active:scale-90"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Floor Goal Blue (1 pt) */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div>
                    <div className="text-xs font-bold text-blue-400">BLUE FLOOR GOAL (1 PT)</div>
                    <div className="text-xs text-slate-400">Inside blue floor boundary</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-400 font-bold">
                      {detailedState.floorBlue * 1} pts
                    </span>
                    <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => updateDetailed('floorBlue', -1)}
                        className="w-8 h-8 flex items-center justify-center rounded text-slate-300 hover:bg-slate-800 active:scale-90"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-9 text-center font-mono font-bold text-blue-400">
                        {detailedState.floorBlue}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateDetailed('floorBlue', 1)}
                        className="w-8 h-8 flex items-center justify-center rounded bg-blue-600/80 text-white hover:bg-blue-500 active:scale-90"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Yellow Bags on Pyramid/Floor (Optional extra yellow bags) */}
          <div className="bg-slate-900/60 border border-yellow-500/20 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-yellow-300 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                Additional Yellow Bags Placed on Pyramid / Floor (if any)
              </span>
              <span className="text-xs text-slate-400">
                Yellow can score on either red or blue goals
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Yellow on L3', key: 'l3Yellow', pts: 12 },
                { label: 'Yellow on L2', key: 'l2Yellow', pts: 6 },
                { label: 'Yellow on L1', key: 'l1Yellow', pts: 3 },
                { label: 'Yellow on Floor', key: 'floorYellow', pts: 1 },
              ].map(item => (
                <div key={item.key} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-slate-300">{item.label}</div>
                    <div className="text-[10px] text-yellow-400 font-mono font-semibold">{item.pts} pts</div>
                  </div>
                  <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-700">
                    <button
                      type="button"
                      onClick={() => updateDetailed(item.key, -1)}
                      className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-mono text-xs font-bold text-yellow-300">
                      {detailedState[item.key] || 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateDetailed(item.key, 1)}
                      className="w-6 h-6 flex items-center justify-center text-yellow-400 hover:text-yellow-200"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Quick Mode: Aggregated Level-by-Level Scoring */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            
            {/* L4 Goal (16 pts - Yellow Only) */}
            <div className="bg-slate-900 border-2 border-yellow-500/50 rounded-2xl p-4 shadow-lg text-center flex flex-col justify-between">
              <div>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                  L4 GOAL
                </span>
                <div className="text-2xl font-mono font-black text-yellow-400 mt-2">16 PTS</div>
                <div className="text-xs text-slate-400 mt-0.5">Top Goal (Yellow)</div>
              </div>
              <div className="mt-4">
                <div className="text-sm font-mono font-bold text-white mb-2">
                  {quickState.l4 * 16} pts
                </div>
                <div className="flex items-center justify-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => updateQuick('l4', -1)}
                    className="w-9 h-9 rounded-lg bg-slate-900 text-slate-300 hover:bg-slate-800 flex items-center justify-center"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 font-mono text-lg font-bold text-yellow-300">
                    {quickState.l4}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuick('l4', 1)}
                    disabled={quickState.l4 >= 6}
                    className="w-9 h-9 rounded-lg bg-yellow-500 text-slate-950 font-bold hover:bg-yellow-400 flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* L3 Goal (12 pts) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg text-center flex flex-col justify-between">
              <div>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  L3 GOAL
                </span>
                <div className="text-2xl font-mono font-black text-cyan-400 mt-2">12 PTS</div>
                <div className="text-xs text-slate-400 mt-0.5">Pyramid Level 3</div>
              </div>
              <div className="mt-4">
                <div className="text-sm font-mono font-bold text-white mb-2">
                  {quickState.l3 * 12} pts
                </div>
                <div className="flex items-center justify-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => updateQuick('l3', -1)}
                    className="w-9 h-9 rounded-lg bg-slate-900 text-slate-300 hover:bg-slate-800 flex items-center justify-center"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 font-mono text-lg font-bold text-cyan-300">
                    {quickState.l3}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuick('l3', 1)}
                    className="w-9 h-9 rounded-lg bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* L2 Goal (6 pts) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg text-center flex flex-col justify-between">
              <div>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                  L2 GOAL
                </span>
                <div className="text-2xl font-mono font-black text-blue-400 mt-2">6 PTS</div>
                <div className="text-xs text-slate-400 mt-0.5">Pyramid Level 2</div>
              </div>
              <div className="mt-4">
                <div className="text-sm font-mono font-bold text-white mb-2">
                  {quickState.l2 * 6} pts
                </div>
                <div className="flex items-center justify-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => updateQuick('l2', -1)}
                    className="w-9 h-9 rounded-lg bg-slate-900 text-slate-300 hover:bg-slate-800 flex items-center justify-center"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 font-mono text-lg font-bold text-blue-300">
                    {quickState.l2}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuick('l2', 1)}
                    className="w-9 h-9 rounded-lg bg-blue-500 text-white font-bold hover:bg-blue-400 flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* L1 Goal (3 pts) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg text-center flex flex-col justify-between">
              <div>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  L1 GOAL
                </span>
                <div className="text-2xl font-mono font-black text-emerald-400 mt-2">3 PTS</div>
                <div className="text-xs text-slate-400 mt-0.5">Pyramid Level 1</div>
              </div>
              <div className="mt-4">
                <div className="text-sm font-mono font-bold text-white mb-2">
                  {quickState.l1 * 3} pts
                </div>
                <div className="flex items-center justify-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => updateQuick('l1', -1)}
                    className="w-9 h-9 rounded-lg bg-slate-900 text-slate-300 hover:bg-slate-800 flex items-center justify-center"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 font-mono text-lg font-bold text-emerald-300">
                    {quickState.l1}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuick('l1', 1)}
                    className="w-9 h-9 rounded-lg bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Floor Goal (1 pt) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg text-center flex flex-col justify-between">
              <div>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-700 text-slate-300 border border-slate-600">
                  FLOOR
                </span>
                <div className="text-2xl font-mono font-black text-slate-200 mt-2">1 PT</div>
                <div className="text-xs text-slate-400 mt-0.5">Floor Goal Boundary</div>
              </div>
              <div className="mt-4">
                <div className="text-sm font-mono font-bold text-white mb-2">
                  {quickState.floor * 1} pts
                </div>
                <div className="flex items-center justify-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => updateQuick('floor', -1)}
                    className="w-9 h-9 rounded-lg bg-slate-900 text-slate-300 hover:bg-slate-800 flex items-center justify-center"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 font-mono text-lg font-bold text-slate-200">
                    {quickState.floor}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuick('floor', 1)}
                    className="w-9 h-9 rounded-lg bg-slate-200 text-slate-950 font-bold hover:bg-white flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bag Inventory Monitor */}
      <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span>Field Object Quotas:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-mono font-bold">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span>Red: {redBagsUsed} / 16</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>Blue: {blueBagsUsed} / 16</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-300">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <span>Yellow: {yellowBagsUsed} / 6</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200">
            <span>Total: {currentTotalBags} / 38</span>
          </div>
        </div>
      </div>
    </div>
  );
}
