import React, { useState } from 'react';
import { 
  Calculator, 
  Clock, 
  History, 
  Columns2, 
  BookOpen, 
  Cpu, 
  Bot, 
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import ScoreCalculator from './components/ScoreCalculator';
import MatchTimer from './components/MatchTimer';
import MatchHistory from './components/MatchHistory';
import RulesModal from './components/RulesModal';
import { GAME_INFO } from './constants/rules';

export default function App() {
  // Tabs: 'calculator', 'timer', 'split', 'history'
  const [activeTab, setActiveTab] = useState('split');
  const [skillsStopTime, setSkillsStopTime] = useState(0);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [externalLoadedState, setExternalLoadedState] = useState(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  // Callback when timer records a stop time
  const handleRecordStopTime = (secondsRemaining) => {
    setSkillsStopTime(secondsRemaining);
  };

  // Callback when user clicks "Load into Calculator" from History
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Top Navigation & Branding Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg text-white tracking-tight">
                  VEX IQ LEVEL UP
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {GAME_INFO.season}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official Online Calculator & Match Timer
              </p>
            </div>
          </div>

          {/* Navigation Tab Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 sm:py-0">
            <button
              type="button"
              onClick={() => setActiveTab('split')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === 'split'
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Columns2 className="w-4 h-4" />
              <span>Split View</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('calculator')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === 'calculator'
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>Calculator</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('timer')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === 'timer'
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Timer</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === 'history'
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Progress & History</span>
            </button>

            {/* Rules Button */}
            <button
              type="button"
              onClick={() => setIsRulesOpen(true)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-all ml-1"
              title="Official Game Rules Reference"
            >
              <BookOpen className="w-4 h-4 text-cyan-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Split View: Side-by-side or stacked Timer + Calculator */}
        {activeTab === 'split' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 lg:sticky lg:top-24">
              <MatchTimer onRecordStopTime={handleRecordStopTime} />
            </div>
            <div className="lg:col-span-7">
              <ScoreCalculator
                skillsStopTime={skillsStopTime}
                setSkillsStopTime={setSkillsStopTime}
                onMatchSaved={handleMatchSaved}
                externalLoadedState={externalLoadedState}
              />
            </div>
          </div>
        )}

        {/* Solo Calculator Tab */}
        {activeTab === 'calculator' && (
          <div className="max-w-4xl mx-auto">
            <ScoreCalculator
              skillsStopTime={skillsStopTime}
              setSkillsStopTime={setSkillsStopTime}
              onMatchSaved={handleMatchSaved}
              externalLoadedState={externalLoadedState}
            />
          </div>
        )}

        {/* Solo Timer Tab */}
        {activeTab === 'timer' && (
          <div className="max-w-3xl mx-auto">
            <MatchTimer onRecordStopTime={handleRecordStopTime} />
          </div>
        )}

        {/* Saved Match History & Progress Tab */}
        {activeTab === 'history' && (
          <div className="max-w-5xl mx-auto">
            <MatchHistory
              onLoadMatchIntoCalculator={handleLoadMatchIntoCalculator}
              onNewMatchSaved={historyRefreshKey}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>VEX IQ Robotics Competition • Level Up (Game Manual v1.1)</span>
          </div>
          <div>
            Built for competitive teams & drivers • Ready for Vercel deployment
          </div>
        </div>
      </footer>

      {/* Rules Reference Modal */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
    </div>
  );
}
