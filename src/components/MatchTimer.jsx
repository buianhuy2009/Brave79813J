import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  Flag, 
  Clock, 
  Bell, 
  Sparkles,
  RotateCcw as ResetIcon,
  FastForward,
  Rewind
} from 'lucide-react';
import { translations } from '../constants/translations';

export default function MatchTimer({ onRecordStopTime, lang = 'en' }) {
  const t = translations[lang] || translations.en;
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(75.4);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showRecordedToast, setShowRecordedToast] = useState(false);
  const [lastRecordedSeconds, setLastRecordedSeconds] = useState(0);

  const MATCH_START_OFFSET = 5.0; // Seconds into video when match officially starts
  const MATCH_LENGTH = 60.0;

  const getMatchTimeRemaining = () => {
    if (currentTime < MATCH_START_OFFSET) return 60;
    const elapsed = currentTime - MATCH_START_OFFSET;
    return Math.max(0, Math.ceil(MATCH_LENGTH - elapsed));
  };

  const matchRemaining = getMatchTimeRemaining();

  const getMatchPhase = () => {
    if (currentTime < MATCH_START_OFFSET) {
      return { label: t.startingCountdown, color: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/40', pulse: true };
    }
    if (matchRemaining > 35) {
      return { label: t.driver1Active, color: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40', pulse: false };
    }
    if (matchRemaining >= 25 && matchRemaining <= 35) {
      return { label: `⚠️ ${t.driverSwitchAlert}`, color: 'bg-amber-500 text-slate-950 font-black border-amber-400', pulse: true };
    }
    if (matchRemaining > 10) {
      return { label: t.driver2Active, color: 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-500/40', pulse: false };
    }
    if (matchRemaining > 0) {
      return { label: t.finalCountdown, color: 'bg-rose-500 text-white font-black border-rose-400', pulse: true };
    }
    return { label: t.matchComplete, color: 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700', pulse: false };
  };

  const phase = getMatchPhase();

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 75.4);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.error("Playback error:", err);
      });
    }
  };

  const handleReset = () => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    videoRef.current.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeekDelta = (deltaSeconds) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(duration || 75.4, videoRef.current.currentTime + deltaSeconds));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(e => console.error(e));
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(e => console.error(e));
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Keyboard Shortcuts:
  // Space: play/pause
  // 0: reset to beginning
  // ArrowLeft: back 5s
  // ArrowRight: forward 5s
  // F: toggle fullscreen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === '0') {
        e.preventDefault();
        handleReset();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSeekDelta(-5);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSeekDelta(5);
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, duration]);

  const handleCaptureStopTime = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    const rem = matchRemaining;
    setLastRecordedSeconds(rem);
    setShowRecordedToast(true);
    setTimeout(() => setShowRecordedToast(false), 3000);

    if (onRecordStopTime) {
      onRecordStopTime(rem);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none bg-black flex flex-col justify-between p-6' : ''
      }`}
    >
      {/* Header bar */}
      <div className="p-4 md:px-6 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse" />
          <h2 className="font-extrabold text-slate-900 dark:text-white text-base md:text-lg">
            {t.timerTitle}
          </h2>
        </div>

        {/* Status Phase Badge */}
        <div className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${phase.color} ${phase.pulse ? 'animate-pulse' : ''}`}>
          {phase.label}
        </div>
      </div>

      {/* Main Video & HUD Display Area */}
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          src="/assets/timer.mp4"
          playsInline
          preload="auto"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          className="w-full h-full object-contain cursor-pointer"
          onClick={togglePlay}
        />

        {/* Large Digital Overlay HUD */}
        <div className="absolute top-4 right-4 pointer-events-none bg-slate-950/80 backdrop-blur-md border border-slate-700/80 px-4 py-2 rounded-2xl shadow-xl flex items-center gap-3">
          <Clock className="w-5 h-5 text-cyan-400" />
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
              {t.timeLeft}
            </span>
            <span className="text-3xl md:text-4xl font-black font-mono tracking-tight text-white">
              {matchRemaining}s
            </span>
          </div>
        </div>

        {/* Driver Switch Banner Alert */}
        {matchRemaining >= 25 && matchRemaining <= 35 && currentTime >= MATCH_START_OFFSET && (
          <div className="absolute inset-x-4 top-16 md:top-20 flex justify-center pointer-events-none animate-bounce">
            <div className="bg-amber-500 text-slate-950 font-black px-6 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-sm md:text-base border-2 border-white">
              <Bell className="w-5 h-5 animate-spin" />
              <span>{t.driverSwitchAlert}</span>
            </div>
          </div>
        )}

        {/* Center Big Play Prompt when paused */}
        {!isPlaying && (
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/25 transition-all group"
          >
            <div className="w-20 h-20 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shadow-2xl group-hover:scale-110 active:scale-95 transition-transform">
              <Play className="w-10 h-10 ml-1.5" />
            </div>
          </button>
        )}
      </div>

      {/* Timer Controls Bar */}
      <div className="p-4 md:p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 space-y-4">
        
        {/* Progress scrub bar */}
        <div className="relative">
          <input
            type="range"
            min="0"
            max={duration || 75.4}
            step="0.1"
            value={currentTime}
            onChange={(e) => {
              const newTime = parseFloat(e.target.value);
              setCurrentTime(newTime);
              if (videoRef.current) {
                videoRef.current.currentTime = newTime;
              }
            }}
            className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>

        {/* Main Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Main Playback & Seek */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black transition-all shadow-md active:scale-95 text-sm ${
                isPlaying
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                  : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>{t.pause}</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>{t.startMatch}</span>
                </>
              )}
            </button>

            {/* Reset (0 key) */}
            <button
              type="button"
              onClick={handleReset}
              className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all border border-slate-200 dark:border-slate-700"
              title="Reset to 0 (Key: 0)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Rewind 5s */}
            <button
              type="button"
              onClick={() => handleSeekDelta(-5)}
              className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-1 text-xs font-mono font-bold"
              title="Back 5s (← key)"
            >
              <Rewind className="w-4 h-4" />
              <span>-5s</span>
            </button>

            {/* FastForward 5s */}
            <button
              type="button"
              onClick={() => handleSeekDelta(5)}
              className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-1 text-xs font-mono font-bold"
              title="Forward 5s (→ key)"
            >
              <span>+5s</span>
              <FastForward className="w-4 h-4" />
            </button>

            {/* Stop Time capture button */}
            <button
              type="button"
              onClick={handleCaptureStopTime}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 hover:bg-amber-500/25 font-bold text-xs active:scale-95 transition-all"
              title="Record remaining seconds"
            >
              <Flag className="w-3.5 h-3.5 text-amber-500" />
              <span>{t.recordStopTime} ({matchRemaining}s)</span>
            </button>
          </div>

          {/* Volume & Fullscreen */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100"
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-cyan-500" />}
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 active:scale-95 transition-all"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen (F)"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Shortcuts Helper Text */}
        <div className="text-[11px] text-slate-400 text-center font-mono">
          {t.timerShortcuts}
        </div>

        {/* Toast confirmation */}
        {showRecordedToast && (
          <div className="p-3 bg-amber-50 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-500/40 rounded-2xl flex items-center justify-between text-amber-800 dark:text-amber-300 text-xs animate-fade-in font-medium">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{t.stopTime}: <strong>{lastRecordedSeconds}s</strong> đã được chuyển sang máy tính điểm!</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
