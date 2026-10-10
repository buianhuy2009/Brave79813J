import React from 'react';
import { X, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';
import { GAME_INFO } from '../constants/rules';

export default function RulesModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-cyan-400" />
            <div>
              <h3 className="font-extrabold text-white text-lg md:text-xl">
                {GAME_INFO.name} — Scoring & Game Rules
              </h3>
              <p className="text-xs text-slate-400">
                Official Manual Version {GAME_INFO.manualVersion} ({GAME_INFO.season})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scoring Table Summary */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">
            Point Values by Goal Level
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center font-mono text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-yellow-500/40">
              <span className="text-yellow-400 font-bold block text-sm">L4 Goal</span>
              <span className="text-xl font-black text-white block mt-1">16 PTS</span>
              <span className="text-[10px] text-yellow-300">Yellow ONLY</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-cyan-500/40">
              <span className="text-cyan-400 font-bold block text-sm">L3 Goal</span>
              <span className="text-xl font-black text-white block mt-1">12 PTS</span>
              <span className="text-[10px] text-slate-400">Red, Blue, Yellow</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-blue-500/40">
              <span className="text-blue-400 font-bold block text-sm">L2 Goal</span>
              <span className="text-xl font-black text-white block mt-1">6 PTS</span>
              <span className="text-[10px] text-slate-400">Red, Blue, Yellow</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-emerald-500/40">
              <span className="text-emerald-400 font-bold block text-sm">L1 Goal</span>
              <span className="text-xl font-black text-white block mt-1">3 PTS</span>
              <span className="text-[10px] text-slate-400">Red, Blue, Yellow</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-700 col-span-2 sm:col-span-1">
              <span className="text-slate-300 font-bold block text-sm">Floor Goal</span>
              <span className="text-xl font-black text-white block mt-1">1 PT</span>
              <span className="text-[10px] text-slate-400">In colored boundary</span>
            </div>
          </div>
        </div>

        {/* Bean Bag Distribution */}
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">
            Game Pieces (38 Total Bean Bags)
          </h4>
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300">
              <strong className="block text-base font-black text-white">16 Red</strong>
              <span>Scored in Red Goals</span>
            </div>
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-300">
              <strong className="block text-base font-black text-white">16 Blue</strong>
              <span>Scored in Blue Goals</span>
            </div>
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-300">
              <strong className="block text-base font-black text-white">6 Yellow</strong>
              <span>Any Goal (Only on L4)</span>
            </div>
          </div>
        </div>

        {/* Key Rules Highlights */}
        <div className="space-y-3 text-xs text-slate-300">
          <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">
            Critical Official Rules
          </h4>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <strong className="text-yellow-400">&lt;SC5&gt; L4 Top Goal Restriction:</strong>
            <p>A Bean Bag on L4 is ONLY scored if it is <em>yellow</em>. Red or blue Bean Bags placed on L4 do NOT score any points.</p>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <strong className="text-cyan-400">&lt;SC4&gt; Higher Level Precedence:</strong>
            <p>If a Bean Bag touches multiple levels (e.g. resting on L2 stack while touching L3), it receives points for the <em>higher level only</em>.</p>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <strong className="text-emerald-400">&lt;GG11&gt; Driver Switch Window:</strong>
            <p>In Teamwork and Driving Skills, drivers must switch controller around the 35–25 second mark. The timer provides an audiovisual cue during this window.</p>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <strong className="text-amber-400">&lt;RSC8&gt; Skills Stop Time:</strong>
            <p>If a team finishes an Autonomous or Driving Skills run before 60 seconds and signals "Stop", the remaining seconds are recorded as the Skills Stop Time for tournament tiebreakers.</p>
          </div>
        </div>

        {/* Close Button */}
        <div className="pt-2 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 text-sm"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
