import React from 'react';
import { 
  X, 
  Printer, 
  Award, 
  Calendar, 
  CheckCircle2, 
  Bot, 
  AlertTriangle 
} from 'lucide-react';
import { translations } from '../constants/translations';

export default function NotebookReportModal({ isOpen, onClose, matches = [], lang = 'en' }) {
  const t = translations[lang] || translations.en;
  const isVi = lang === 'vi';

  if (!isOpen) return null;

  const totalMatches = matches.length;
  const highScore = matches.reduce((max, m) => Math.max(max, Number(m.score) || 0), 0);
  const totalScore = matches.reduce((sum, m) => sum + (Number(m.score) || 0), 0);
  const avgScore = totalMatches > 0 ? Math.round(totalScore / totalMatches) : 0;
  
  const cleanMatches = matches.filter(m => (Number(m.minorViolations) || 0) === 0 && (Number(m.majorViolations) || 0) === 0).length;
  const cleanRate = totalMatches > 0 ? Math.round((cleanMatches / totalMatches) * 100) : 100;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-white text-slate-900 rounded-3xl p-6 md:p-8 max-w-4xl w-full shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto print:max-h-none print:p-0 print:shadow-none print:rounded-none">
        
        {/* Top Control Bar (Hidden during Print) */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <span>{t.exportNotebook}</span>
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 font-bold text-slate-600">
              Team Brave 79813J
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-sm transition-all hover:scale-105"
            >
              <Printer className="w-4 h-4" />
              <span>{t.printReport}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE REPORT SHEET CONTENT */}
        <div className="space-y-6 print:space-y-4">
          
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🇻🇳</span>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">
                  TEAM BRAVE #79813J
                </h1>
                <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded">
                  VIQRC 2026–2027
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-700 mt-1">
                {t.notebookTitle}
              </h2>
              <p className="text-xs text-slate-500">
                {t.notebookSubtitle}
              </p>
            </div>
            
            <div className="text-right text-xs text-slate-500 font-mono">
              <div>Date Generated: {new Date().toLocaleDateString()}</div>
              <div>Game Manual: v2.1 Level Up</div>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Runs Logged</span>
              <span className="text-2xl font-black font-mono text-slate-900">{totalMatches}</span>
            </div>

            <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50">
              <span className="text-[10px] font-bold uppercase text-amber-700 block">High Score</span>
              <span className="text-2xl font-black font-mono text-amber-700">{highScore} PTS</span>
            </div>

            <div className="p-3.5 rounded-xl border border-cyan-200 bg-cyan-50/50">
              <span className="text-[10px] font-bold uppercase text-cyan-700 block">Average Score</span>
              <span className="text-2xl font-black font-mono text-cyan-700">{avgScore} PTS</span>
            </div>

            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50">
              <span className="text-[10px] font-bold uppercase text-emerald-700 block">{t.notebookCleanRate}</span>
              <span className="text-2xl font-black font-mono text-emerald-700">{cleanRate}%</span>
            </div>
          </div>

          {/* Test Runs Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Robot Mechanism</th>
                  <th className="py-2.5 px-3 text-right">Score</th>
                  <th className="py-2.5 px-3 text-right">Bags</th>
                  <th className="py-2.5 px-3 text-right">Stop Time</th>
                  <th className="py-2.5 px-3">Violations</th>
                  <th className="py-2.5 px-3">Test Notes & Observations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matches.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-6 text-center text-slate-400">
                      No practice runs recorded yet.
                    </td>
                  </tr>
                ) : (
                  matches.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-3 font-mono">{item.matchDate || item.dateStr}</td>
                      <td className="py-2 px-3 font-semibold capitalize">
                        {t[item.matchType] || item.matchType}
                      </td>
                      <td className="py-2 px-3">
                        {item.robotType ? (t[item.robotType] || item.robotType) : '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-black font-mono text-slate-900">
                        {item.score}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">
                        {item.totalBags || 0}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-amber-600 font-bold">
                        {item.skillsStopTime > 0 ? `${item.skillsStopTime}s` : '—'}
                      </td>
                      <td className="py-2 px-3">
                        {(item.minorViolations > 0 || item.majorViolations > 0) ? (
                          <span className="text-rose-600 font-bold">
                            {item.minorViolations > 0 && `${item.minorViolations} Min `}
                            {item.majorViolations > 0 && `${item.majorViolations} Maj`}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-semibold">Clean</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-600 italic max-w-xs truncate">
                        {item.matchNotes || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Sign-off for Judges */}
          <div className="pt-4 border-t border-slate-200 grid grid-cols-2 text-xs text-slate-500 font-mono">
            <div>
              <span>Driver / Coder Signature: _______________________</span>
            </div>
            <div className="text-right">
              <span>Coach / Mentor Verification: _______________________</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
