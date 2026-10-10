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
  AlertCircle,
  Bell,
  Sparkles
} from 'lucide-react';

export default function MatchTimer({ onRecordStopTime }) {
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

  // Video timing breakdown:
  // Usually the video has ~3-5s intro countdown ("3, 2, 1, Go!"),
  // then exactly 60s match (from 60 down to 0), then post-match horn.
  // We calculate match seconds remaining accurately:
  // Match active starts around t = 5.0s and ends at t = 65.0s.
  const MATCH_START_OFFSET = 5.0; // Seconds into video when match officially starts
  const MATCH_LENGTH = 60.0;

  const getMatchTimeRemaining = () => {
    if (currentTime < MATCH_START_OFFSET) return 60;
    const elapsed = currentTime - MATCH_START_OFFSET;
    const remaining = Math.max(0, Math.ceil(MATCH_LENGTH - elapsed));
    return remaining;
  };

  const matchRemaining = getMatchTimeRemaining();

  // Match phase detection
  const getMatchPhase = () => {
    if (currentTime < MATCH_START_OFFSET) {
      return { label: 'STARTING COUNTDOWN', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40', pulse: true };
    }
    if (matchRemaining > 35) {
      return { label: 'DRIVER 1 ACTIVE', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', pulse: false };
    }
    if (matchRemaining >= 25 && matchRemaining <= 35) {
      return { label: '⚠️ DRIVER SWITCH WINDOW', color: 'bg-amber-500 text-slate-950 font-black border-amber-400', pulse: true };
    }
    if (matchRemaining > 10) {
      return { label: 'DRIVER 2 ACTIVE', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40', pulse: false };
    }
    if (matchRemaining > 0) {
      return { label: 'FINAL COUNTDOWN', color: 'bg-rose-500 text-white font-black border-rose-400', pulse: true };
    }
    return { label: 'MATCH COMPLETE', color: 'bg-slate-800 text-slate-300 border-slate-700', pulse: false };
  };

  const phase = getMatchPhase();

  // Time update event handler
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

  const handleSpeedChange = (rate) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
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

  // Keyboard shortcut: Spacebar for play/pause
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  // Handle capture skills stop time
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
      className={`bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none bg-black flex flex-col justify-between p-6' : ''
      }`}
    >
      {/* Header bar */}
      <div className="p-4 md:px-6 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
          <h2 className="font-bold text-white text-base md:text-lg flex items-center gap-2">
            <span>Official VEX IQ Match Timer</span>
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

        {/* Large Digital Overlay HUD in Top Corner */}
        <div className="absolute top-4 right-4 pointer-events-none bg-slate-950/85 backdrop-blur-md border border-slate-700/80 px-4 py-2 rounded-2xl shadow-xl flex items-center gap-3">
          <Clock className="w-5 h-5 text-cyan-400" />
          <div className="text-right">
            <span className="text-xs uppercase tracking-wider text-slate-400 block font-semibold">
              Time Left
            </span>
            <span className="text-2xl md:text-3xl font-black font-mono tracking-tight text-white">
              {matchRemaining}s
            </span>
          </div>
        </div>

        {/* Driver Switch Banner Alert (during 25s - 35s window) */}
        {matchRemaining >= 25 && matchRemaining <= 35 && currentTime >= MATCH_START_OFFSET && (
          <div className="absolute inset-x-4 top-16 md:top-20 flex justify-center pointer-events-none animate-bounce">
            <div className="bg-amber-500 text-slate-950 font-black px-5 py-2 rounded-xl shadow-2xl flex items-center gap-2 text-sm md:text-base border-2 border-white">
              <Bell className="w-5 h-5 animate-spin" />
              <span>DRIVER SWITCH CONTROLLER WINDOW!</span>
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
      <div className="p-4 md:p-6 bg-slate-950 border-t border-slate-800 space-y-4">
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
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        {/* Buttons Row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Main Playback Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-md active:scale-95 ${
                isPlaying
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                  : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-5 h-5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>Start Match</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all active:scale-95 border border-slate-700"
              title="Reset timer to beginning"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            {/* Stop Early Button for Skills Runs */}
            <button
              type="button"
              onClick={handleCaptureStopTime}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 font-semibold text-xs md:text-sm active:scale-95 transition-all"
              title="Stop match early and transfer remaining time to calculator"
            >
              <Flag className="w-4 h-4 text-amber-400" />
              <span>Record Skills Stop Time ({matchRemaining}s)</span>
            </button>
          </div>

          {/* Speed & Audio & Fullscreen */}
          <div className="flex items-center gap-3">
            {/* Speed selector */}
            <div className="hidden sm:flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
              {[1, 1.25, 0.75].map(rate => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => handleSpeedChange(rate)}
                  className={`px-2 py-1 rounded-lg font-mono ${
                    playbackRate === rate
                      ? 'bg-slate-800 text-cyan-400 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            {/* Volume toggle */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMute}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400 hidden sm:block"
              />
            </div>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95 transition-all"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Timer View"}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Confirmation Toast */}
        {showRecordedToast && (
          <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl flex items-center justify-between text-amber-300 text-xs md:text-sm animate-fade-in">
            <span className="flex items-center gap-2 font-medium">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Recorded Skills Stop Time of <strong>{lastRecordedSeconds} seconds</strong> to calculator!
            </span>
            <span className="text-xs text-amber-400/80">Transferred</span>
          </div>
        )}
      </div>
    </div>
  );
}
