import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Trash2, 
  Edit3, 
  Download, 
  Upload, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  RotateCcw,
  Cpu,
  Gamepad2,
  Users,
  X
} from 'lucide-react';
import { 
  getSavedMatches, 
  deleteSavedMatch, 
  updateSavedMatch, 
  clearAllSavedMatches, 
  calculateStats 
} from '../utils/storage';
import { translations } from '../constants/translations';

export default function MatchHistory({ onLoadMatchIntoCalculator, onNewMatchSaved, lang = 'en' }) {
  const t = translations[lang] || translations.en;

  const [matches, setMatches] = useState([]);
  const [stats, setStats] = useState(null);

  // Filters & sorting
  const [filterType, setFilterType] = useState('all');
  const [filterTag, setFilterTag] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Expansion state
  const [expandedMatchId, setExpandedMatchId] = useState(null);

  // Edit modal
  const [editingMatch, setEditingMatch] = useState(null);

  const loadData = () => {
    const list = getSavedMatches();
    setMatches(list);
    setStats(calculateStats(list));
  };

  useEffect(() => {
    loadData();
  }, [onNewMatchSaved]);

  const handleDelete = (id) => {
    if (window.confirm(t.deleteConfirm)) {
      deleteSavedMatch(id);
      loadData();
    }
  };

  const handleClearAll = () => {
    if (window.confirm(t.clearConfirm)) {
      clearAllSavedMatches();
      loadData();
    }
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingMatch) return;
    updateSavedMatch(editingMatch.id, {
      teamName: editingMatch.teamName,
      sessionTag: editingMatch.sessionTag,
      matchType: editingMatch.matchType,
      matchNotes: editingMatch.matchNotes,
      matchDate: editingMatch.matchDate,
      dateStr: editingMatch.matchDate,
      minorViolations: Number(editingMatch.minorViolations) || 0,
      majorViolations: Number(editingMatch.majorViolations) || 0,
      robotType: editingMatch.robotType || '',
      skillsStopTime: Number(editingMatch.skillsStopTime) || 0
    });
    setEditingMatch(null);
    loadData();
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(matches, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `vexiq_levelup_matches_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result);
        if (Array.isArray(imported)) {
          const current = getSavedMatches();
          const existingIds = new Set(current.map(m => m.id));
          const newEntries = imported.filter(m => !existingIds.has(m.id));
          const combined = [...newEntries, ...current];
          localStorage.setItem('vexiq_levelup_saved_matches_v1', JSON.stringify(combined));
          loadData();
          alert(`Imported ${newEntries.length} matches!`);
        }
      } catch (err) {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  // Filter & Sort
  const filteredMatches = matches.filter(m => {
    if (filterType !== 'all' && m.matchType !== filterType) return false;
    if (filterTag !== 'all' && m.sessionTag !== filterTag) return false;
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const matchInNotes = (m.matchNotes || '').toLowerCase().includes(term);
      const matchInTeam = (m.teamName || '').toLowerCase().includes(term);
      const matchInDate = (m.dateStr || '').toLowerCase().includes(term);
      if (!matchInNotes && !matchInTeam && !matchInDate) return false;
    }
    return true;
  });

  const sortedMatches = [...filteredMatches].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    if (sortBy === 'oldest') return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    if (sortBy === 'highest') return (b.score || 0) - (a.score || 0);
    if (sortBy === 'lowest') return (a.score || 0) - (b.score || 0);
    if (sortBy === 'stopTime') return (b.skillsStopTime || 0) - (a.skillsStopTime || 0);
    return 0;
  });

  const getMatchIcon = (type) => {
    switch (type) {
      case 'auton': return <Cpu className="w-4 h-4 text-purple-500" />;
      case 'driving': return <Gamepad2 className="w-4 h-4 text-cyan-500" />;
      default: return <Users className="w-4 h-4 text-blue-500" />;
    }
  };

  const getTagBadge = (tagId) => {
    const label = t[tagId] || tagId;
    return (
      <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
        {label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">{t.totalMatches}</span>
            <span className="text-2xl lg:text-3xl font-mono font-black text-slate-900 dark:text-white mt-1 block">
              {stats.totalMatches}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">{t.avgScore}</span>
            <span className="text-2xl lg:text-3xl font-mono font-black text-cyan-600 dark:text-cyan-400 mt-1 block">
              {stats.avgScore} <span className="text-xs font-normal text-slate-400">{t.pts}</span>
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">{t.highScore}</span>
            <span className="text-2xl lg:text-3xl font-mono font-black text-amber-500 mt-1 block">
              {stats.highScore} <span className="text-xs font-normal text-slate-400">{t.pts}</span>
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-500/30 p-4 rounded-2xl shadow-sm">
            <span className="text-xs text-purple-600 dark:text-purple-400 block font-medium">{t.highAuton}</span>
            <span className="text-2xl lg:text-3xl font-mono font-black text-purple-600 dark:text-purple-300 mt-1 block">
              {stats.highAuton} <span className="text-xs font-normal text-slate-400">{t.pts}</span>
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-500/30 p-4 rounded-2xl shadow-sm">
            <span className="text-xs text-blue-600 dark:text-blue-400 block font-medium">{t.highDriving}</span>
            <span className="text-2xl lg:text-3xl font-mono font-black text-blue-600 dark:text-blue-300 mt-1 block">
              {stats.highDriving} <span className="text-xs font-normal text-slate-400">{t.pts}</span>
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-500/30 p-4 rounded-2xl shadow-sm">
            <span className="text-xs text-emerald-600 dark:text-emerald-400 block font-medium">{t.highTeamwork}</span>
            <span className="text-2xl lg:text-3xl font-mono font-black text-emerald-600 dark:text-emerald-300 mt-1 block">
              {stats.highTeamwork} <span className="text-xs font-normal text-slate-400">{t.pts}</span>
            </span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
              {t.historyTitle}
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <button
              type="button"
              onClick={handleExportJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.exportJSON}</span>
            </button>

            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-semibold cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>{t.importJSON}</span>
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>

            {matches.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.clearAll}</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">{t.allTypes}</option>
              <option value="driving">{t.driving}</option>
              <option value="auton">{t.auton}</option>
              <option value="teamwork">{t.teamwork}</option>
            </select>
          </div>

          <div>
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">{t.allTags}</option>
              <option value="practice">{t.practice}</option>
              <option value="testing">{t.testing}</option>
              <option value="debugging">{t.debugging}</option>
              <option value="building">{t.building}</option>
              <option value="official">{t.official}</option>
              <option value="scrimmage">{t.scrimmage}</option>
            </select>
          </div>

          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
            >
              <option value="newest">{t.sortNewest}</option>
              <option value="oldest">{t.sortOldest}</option>
              <option value="highest">{t.sortHighest}</option>
              <option value="lowest">{t.sortLowest}</option>
              <option value="stopTime">{t.sortStopTime}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Matches List */}
      <div className="space-y-3">
        {sortedMatches.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center text-slate-400 shadow-sm">
            <Trophy className="w-10 h-10 mx-auto text-slate-400 mb-2" />
            <p className="font-bold text-slate-700 dark:text-slate-300">{t.noMatches}</p>
            <p className="text-xs text-slate-400 mt-1">{t.noMatchesSub}</p>
          </div>
        ) : (
          sortedMatches.map(item => {
            const isExpanded = expandedMatchId === item.id;

            return (
              <div 
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 md:p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-800">
                        {getMatchIcon(item.matchType)}
                        <span>{t[item.matchType] || item.matchType}</span>
                      </span>

                      {item.sessionTag && getTagBadge(item.sessionTag)}

                      <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {item.matchDate || item.dateStr} {item.timeStr}
                      </span>

                      {item.robotType && (
                        <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          🤖 {t[item.robotType] || item.robotType}
                        </span>
                      )}

                      {item.minorViolations > 0 && (
                        <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          ⚠️ {item.minorViolations} Minor
                        </span>
                      )}

                      {item.majorViolations > 0 && (
                        <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          🚨 {item.majorViolations} Major
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-2">
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-base">
                        {item.teamName || 'My Robot'}
                      </h4>
                      {item.matchNotes && (
                        <span className="text-xs text-slate-500 italic">
                          — "{item.matchNotes}"
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-right">
                      <div className="text-3xl font-black font-mono text-cyan-600 dark:text-cyan-400">
                        {item.score} <span className="text-xs font-bold text-slate-400">{t.pts}</span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center justify-end gap-2 font-mono">
                        <span>{item.totalBags || 0} {t.bags}</span>
                        {item.skillsStopTime > 0 && (
                          <span className="text-amber-500 font-bold">
                            • {item.skillsStopTime}s stop
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onLoadMatchIntoCalculator(item)}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                        title={t.loadMatch}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingMatch(item)}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        title={t.editMatch}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                        title={t.deleteMatch}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setExpandedMatchId(isExpanded ? null : item.id)}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-2xl space-y-2">
                    {item.mode === 'detailed' && item.details ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                        <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-amber-300 dark:border-yellow-500/30">
                          <strong className="text-amber-600 dark:text-yellow-400">L4 Top:</strong> {item.details.l4Yellow || 0} bags ({(item.details.l4Yellow || 0) * 16} pts)
                        </div>
                        <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                          <strong className="text-cyan-600 dark:text-cyan-400">L3:</strong> Red {item.details.l3Red || 0}, Blue {item.details.l3Blue || 0}, Yellow {item.details.l3Yellow || 0}
                        </div>
                        <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                          <strong className="text-blue-600 dark:text-blue-400">L2:</strong> Red {item.details.l2Red || 0}, Blue {item.details.l2Blue || 0}, Yellow {item.details.l2Yellow || 0}
                        </div>
                        <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                          <strong className="text-emerald-600 dark:text-emerald-400">L1:</strong> Red {item.details.l1Red || 0}, Blue {item.details.l1Blue || 0}, Yellow {item.details.l1Yellow || 0}
                        </div>
                      </div>
                    ) : item.details ? (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono">
                        <div>L4: {item.details.l4}</div>
                        <div>L3: {item.details.l3}</div>
                        <div>L2: {item.details.l2}</div>
                        <div>L1: {item.details.l1}</div>
                        <div>Floor: {item.details.floor}</div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Edit Match Modal */}
      {editingMatch && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                {t.editMatch}
              </h3>
              <button
                type="button"
                onClick={() => setEditingMatch(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">{t.modalTeam}</label>
                <input
                  type="text"
                  value={editingMatch.teamName}
                  onChange={(e) => setEditingMatch({ ...editingMatch, teamName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Match Date */}
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">{t.matchDate}</label>
                <input
                  type="date"
                  value={editingMatch.matchDate || editingMatch.dateStr || ''}
                  onChange={(e) => setEditingMatch({ ...editingMatch, matchDate: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              {/* Robot Type */}
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">{t.robotType}</label>
                <select
                  value={editingMatch.robotType || 'hero'}
                  onChange={(e) => setEditingMatch({ ...editingMatch, robotType: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                >
                  <option value="hero">{t.heroBot}</option>
                  <option value="lift">{t.liftBot}</option>
                  <option value="catapult">{t.catapultBot}</option>
                  <option value="claw">{t.clawBot}</option>
                  <option value="custom">{t.customBot}</option>
                </select>
              </div>

              {/* Violations */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-amber-600 dark:text-amber-400 block mb-1">{t.minorViolations}</label>
                  <input
                    type="number"
                    min="0"
                    value={editingMatch.minorViolations || 0}
                    onChange={(e) => setEditingMatch({ ...editingMatch, minorViolations: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-amber-600 dark:text-amber-400 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-rose-600 dark:text-rose-400 block mb-1">{t.majorViolations}</label>
                  <input
                    type="number"
                    min="0"
                    value={editingMatch.majorViolations || 0}
                    onChange={(e) => setEditingMatch({ ...editingMatch, majorViolations: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-rose-600 dark:text-rose-400 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">{t.stopTime}</label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={editingMatch.skillsStopTime || 0}
                  onChange={(e) => setEditingMatch({ ...editingMatch, skillsStopTime: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-amber-600 dark:text-amber-400 font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">{t.modalNotes}</label>
                <textarea
                  rows="2"
                  value={editingMatch.matchNotes}
                  onChange={(e) => setEditingMatch({ ...editingMatch, matchNotes: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMatch(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-semibold"
                >
                  {t.modalCancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-sm"
                >
                  {t.modalSaveButton}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
