import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Clock, 
  History, 
  BookOpen, 
  Bot, 
  Sun, 
  Moon, 
  Globe
} from 'lucide-react';
import ScoreCalculator from './components/ScoreCalculator';
import MatchTimer from './components/MatchTimer';
import MatchHistory from './components/MatchHistory';
import GameManual from './components/GameManual';
import RulesModal from './components/RulesModal';
import { GAME_INFO } from './constants/rules';
import { translations } from './constants/translations';

export default function App() {
  // Tabs: 'calculator' (default), 'timer', 'history'
  const [activeTab, setActiveTab] = useState('calculator');
  const [skillsStopTime, setSkillsStopTime] = useState(0);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [externalLoadedState, setExternalLoadedState] = useState(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  // Theme: 'light' or 'dark' (Default to light for bright, clean UI)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('vexiq_theme') || 'light';
  });

  // Language: 'en' or 'vi' (Default to Vietnamese 'vi' if browser is in VN or user selects)
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('vexiq_lang') || 'vi';
  });

  const t = translations[lang] || translations.en;

  // Apply theme class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('vexiq_theme', theme);
  }, [theme]);

  // Save language preference
  useEffect(() => {
    localStorage.setItem('vexiq_lang', lang);
  }, [lang]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const toggleLang = () => {
    setLang(prev => prev === 'vi' ? 'en' : 'vi');
  };

  const handleRecordStopTime = (secondsRemaining) => {
    setSkillsStopTime(secondsRemaining);
  };

  const handleLoadMatchIntoCalculator = (matchItem) => {
    setExternalLoadedState({
      mode: matchItem.mode,
      quickState: matchItem.mode === 'quick' ? matchItem.details : null,
      detailedState: matchItem.mode === 'detailed' ? matchItem.details : null,
      matchType: matchItem.matchType,
      sessionTag: matchItem.sessionTag,
      skillsStopTime: matchItem.skillsStopTime || 0,
      matchNotes: matchItem.matchNotes || '',
      teamName: matchItem.teamName || ''
    });
    setActiveTab('calculator');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMatchSaved = () => {
    setHistoryRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-cyan-500/20">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">
                  {t.appTitle}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30">
                  {GAME_INFO.season}
                </span>
              </div>
            </div>
          </div>

          {/* Center Navigation Tabs (Calculator, Timer, History) */}
          <nav className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('calculator')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'calculator'
                  ? 'bg-white dark:bg-cyan-500 text-slate-900 dark:text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Calculator className="w-4 h-4 text-cyan-600 dark:text-cyan-900" />
              <span>{t.calculator}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('timer')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'timer'
                  ? 'bg-white dark:bg-cyan-500 text-slate-900 dark:text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-900" />
              <span>{t.timer}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'history'
                  ? 'bg-white dark:bg-cyan-500 text-slate-900 dark:text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <History className="w-4 h-4 text-cyan-600 dark:text-cyan-900" />
              <span>{t.history}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('manual')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'manual'
                  ? 'bg-white dark:bg-cyan-500 text-slate-900 dark:text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4 text-cyan-600 dark:text-cyan-900" />
              <span>{t.gameManual}</span>
            </button>
          </nav>

          {/* Right Action Icons (Rules / Manual, Theme, Language) */}
          <div className="flex items-center gap-1.5">
            {/* Quick manual button */}
            <button
              type="button"
              onClick={() => setActiveTab('manual')}
              className={`p-2 rounded-xl border transition-all ${
                activeTab === 'manual'
                  ? 'bg-cyan-500 text-slate-950 border-cyan-500 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
              }`}
              title={t.gameManual}
            >
              <BookOpen className="w-4 h-4" />
            </button>

            {/* Language Switcher (EN / VI) */}
            <button
              type="button"
              onClick={toggleLang}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-xs font-black transition-all"
              title="Toggle Language (EN / VI)"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>{lang.toUpperCase()}</span>
            </button>

            {/* Light / Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-all"
              title={theme === 'dark' ? t.lightMode : t.darkMode}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Calculator View */}
        {activeTab === 'calculator' && (
          <ScoreCalculator
            skillsStopTime={skillsStopTime}
            setSkillsStopTime={setSkillsStopTime}
            onMatchSaved={handleMatchSaved}
            externalLoadedState={externalLoadedState}
            lang={lang}
          />
        )}

        {/* Timer View */}
        {activeTab === 'timer' && (
          <div className="max-w-3xl mx-auto">
            <MatchTimer 
              onRecordStopTime={handleRecordStopTime} 
              lang={lang}
            />
          </div>
        )}

        {/* Saved Match History View */}
        {activeTab === 'history' && (
          <MatchHistory
            onLoadMatchIntoCalculator={handleLoadMatchIntoCalculator}
            onNewMatchSaved={historyRefreshKey}
            lang={lang}
          />
        )}

        {/* Game Manual View */}
        {activeTab === 'manual' && (
          <GameManual lang={lang} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-900 py-5 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>VEX IQ Robotics Competition • Level Up (Game Manual v2.1)</span>
          <span>Made for Teams, Referees & Coaches</span>
        </div>
      </footer>

      {/* Rules Modal */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} lang={lang} />
    </div>
  );
}
