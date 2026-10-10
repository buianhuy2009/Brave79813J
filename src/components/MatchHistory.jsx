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
  Tag, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  ArrowUpDown, 
  BarChart3, 
  Layers, 
  Check, 
  X, 
  RotateCcw,
  Cpu,
  Gamepad2,
  Users
} from 'lucide-react';
import { 
  getSavedMatches, 
  deleteSavedMatch, 
  updateSavedMatch, 
  clearAllSavedMatches, 
  calculateStats 
} from '../utils/storage';
import { MATCH_TYPES, SESSION_TAGS } from '../constants/rules';

export default function MatchHistory({ onLoadMatchIntoCalculator, onNewMatchSaved }) {
  const [matches, setMatches] = useState([]);
  const [stats, setStats] = useState(null);

  // Filters & sorting
  const [filterType, setFilterType] = useState('all');
  const [filterTag, setFilterTag] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'highest', 'lowest', 'stopTime'

  // Expansion state for breakdowns
  const [expandedMatchId, setExpandedMatchId] = useState(null);

  // Edit modal state
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
    if (window.confirm("Are you sure you want to delete this saved match?")) {
      deleteSavedMatch(id);
      loadData();
    }
  };

  const handleClearAll = () => {
    if (window.confirm("⚠️ Are you sure you want to delete ALL saved matches? This cannot be undone.")) {
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
          // Merge unique by id
          const existingIds = new Set(current.map(m => m.id));
          const newEntries = imported.filter(m => !existingIds.has(m.id));
          const combined = [...newEntries, ...current];
          localStorage.setItem('vexiq_levelup_saved_matches_v1', JSON.stringify(combined));
          loadData();
          alert(`Successfully imported ${newEntries.length} new matches!`);
        }
      } catch (err) {
        alert("Invalid JSON match file");
      }
    };
    reader.readAsText(file);
  };

  // Filter and sort logic
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
      case 'auton': return <Cpu className="w-4 h-4 text-purple-400" />;
      case 'driving': return <Gamepad2 className="w-4 h-4 text-cyan-400" />;
      default: return <Users className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Analytics & Progress Overview Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <span className="text-xs text-slate-400 block font-medium">Total Matches</span>
            <span className="text-2xl lg:text-3xl font-mono font-black text-white mt-1 block">
              {stats.totalMatches}
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <span className="text-xs text-slate-400 block font-medium">Average Score</span>
            <span className="text-2xl lg:text-3xl font-mono font-black text-cyan-400 mt-1 block">
              {stats.avgScore} <span className="text-xs font-normal text-slate-500">pts</span>
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <span className="text-xs text-slate-400 block font-medium">High Score</span>
            <span className="text-2xl lg:text-3xl font-mono font-black text-yellow-400 mt-1 block">
              {stats.highScore} <span className="text-xs font-normal text-slate-500">pts</span>
            </span>
          </div>

          <div className="bg-slate-900 border border-purple-500/30 p-4 rounded-2xl">
            <span className="text-xs text-purple-400 block font-medium">High Auto Skills</span>
            <span className="text-2xl lg:text-3xl font-mono font-black text-purple-300 mt-1 block">
              {stats.highAuton} <span className="text-xs font-normal text-slate-500">pts</span>
            </span>
          </div>

          <div className="bg-slate-900 border border-blue-500/30 p-4 rounded-2xl">
            <span className="text-xs text-blue-400 block font-medium">High Driver Skills</span>
            <span className="text-2xl lg:text-3xl font-mono font-black text-blue-300 mt-1 block">
              {stats.highDriving} <span className="text-xs font-normal text-slate-500">pts</span>
            </span>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-2xl">
            <span className="text-xs text-emerald-400 block font-medium">High Teamwork</span>
            <span className="text-2xl lg:text-3xl font-mono font-black text-emerald-300 mt-1 block">
              {stats.highTeamwork} <span className="text-xs font-normal text-slate-500">pts</span>
            </span>
          </div>
        </div>
      )}

      {/* Filter, Search & Action Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-white text-base">Filter & Organize Saved Runs</h3>
          </div>

          {/* Export / Import & Clear buttons */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <button
              type="button"
              onClick={handleExportJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:bg-slate-700 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>

            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:bg-slate-700 transition-all cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Import</span>
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>

            {matches.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search text */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search by notes or team..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Match Type Filter */}
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Match Types</option>
              {MATCH_TYPES.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Session Tag Filter */}
          <div>
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Activities (Testing, Practicing...)</option>
              {SESSION_TAGS.map(tag => (
                <option key={tag.id} value={tag.id}>{tag.label}</option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="highest">Sort: Highest Score</option>
              <option value="lowest">Sort: Lowest Score</option>
              <option value="stopTime">Sort: Highest Stop Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Matches List */}
      <div className="space-y-3">
        {sortedMatches.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-slate-400">
            <Trophy className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="font-semibold text-slate-300">No saved matches match your filter</p>
            <p className="text-xs text-slate-500 mt-1">Score a run in the Calculator and press "Save Match" to see it here!</p>
          </div>
        ) : (
          sortedMatches.map(item => {
            const isExpanded = expandedMatchId === item.id;
            const tagObj = SESSION_TAGS.find(t => t.id === item.sessionTag);
            const typeObj = MATCH_TYPES.find(t => t.id === item.matchType);

            return (
              <div 
                key={item.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 hover:border-slate-700 transition-all shadow-md"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  
                  {/* Left: Metadata & Team */}
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-950 text-slate-300 border border-slate-800 text-xs font-semibold">
                        {getMatchIcon(item.matchType)}
                        <span>{typeObj?.short || item.matchType}</span>
                      </span>

                      {tagObj && (
                        <span className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${tagObj.color}`}>
                          {tagObj.label}
                        </span>
                      )}

                      <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {item.dateStr} {item.timeStr}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <h4 className="font-bold text-white text-base">
                        {item.teamName || 'My Robot'}
                      </h4>
                      {item.matchNotes && (
                        <span className="text-xs text-slate-400 italic">
                          — "{item.matchNotes}"
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Score & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-right">
                      <div className="text-3xl font-black font-mono text-cyan-400">
                        {item.score} <span className="text-xs font-bold text-slate-400">PTS</span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center justify-end gap-2 font-mono">
                        <span>{item.totalBags || 0} bags</span>
                        {item.skillsStopTime > 0 && (
                          <span className="text-amber-400 font-bold">
                            • {item.skillsStopTime}s stop
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Load into calculator */}
                      <button
                        type="button"
                        onClick={() => onLoadMatchIntoCalculator(item)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 border border-slate-700"
                        title="Load this match setup into the calculator"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>

                      {/* Edit details */}
                      <button
                        type="button"
                        onClick={() => setEditingMatch(item)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
                        title="Edit match notes, tag, or team name"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 border border-slate-700"
                        title="Delete this match"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {/* Expand breakdown toggle */}
                      <button
                        type="button"
                        onClick={() => setExpandedMatchId(isExpanded ? null : item.id)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700"
                        title="Show score breakdown"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details Breakdown */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl space-y-2">
                    <div className="font-semibold text-slate-400 uppercase tracking-wider text-[11px]">
                      Scoring Details ({item.mode === 'detailed' ? 'Detailed Mode' : 'Quick Mode'})
                    </div>
                    {item.mode === 'detailed' && item.details ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                        <div className="p-2 bg-slate-900 rounded border border-yellow-500/30">
                          <strong className="text-yellow-400">L4 (Top):</strong> {item.details.l4Yellow || 0} bags ({ (item.details.l4Yellow || 0) * 16 } pts)
                        </div>
                        <div className="p-2 bg-slate-900 rounded border border-slate-800">
                          <strong className="text-cyan-400">L3:</strong> Red {item.details.l3Red || 0}, Blue {item.details.l3Blue || 0}, Yellow {item.details.l3Yellow || 0}
                        </div>
                        <div className="p-2 bg-slate-900 rounded border border-slate-800">
                          <strong className="text-blue-400">L2:</strong> Red {item.details.l2Red || 0}, Blue {item.details.l2Blue || 0}, Yellow {item.details.l2Yellow || 0}
                        </div>
                        <div className="p-2 bg-slate-900 rounded border border-slate-800">
                          <strong className="text-emerald-400">L1:</strong> Red {item.details.l1Red || 0}, Blue {item.details.l1Blue || 0}, Yellow {item.details.l1Yellow || 0}
                        </div>
                        <div className="p-2 bg-slate-900 rounded border border-slate-800 col-span-2">
                          <strong className="text-slate-300">Floor Goals:</strong> Red {item.details.floorRed || 0}, Blue {item.details.floorBlue || 0}, Yellow {item.details.floorYellow || 0}
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

      {/* Edit Match Details Modal */}
      {editingMatch && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-cyan-400" />
                <span>Edit Match Information</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingMatch(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Team / Robot Label
                </label>
                <input
                  type="text"
                  value={editingMatch.teamName}
                  onChange={(e) => setEditingMatch({ ...editingMatch, teamName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Session / Activity Tag
                </label>
                <select
                  value={editingMatch.sessionTag}
                  onChange={(e) => setEditingMatch({ ...editingMatch, sessionTag: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  {SESSION_TAGS.map(tag => (
                    <option key={tag.id} value={tag.id}>{tag.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Match Category
                </label>
                <select
                  value={editingMatch.matchType}
                  onChange={(e) => setEditingMatch({ ...editingMatch, matchType: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  {MATCH_TYPES.map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Skills Stop Time (seconds remaining)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={editingMatch.skillsStopTime || 0}
                  onChange={(e) => setEditingMatch({ ...editingMatch, skillsStopTime: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Notes
                </label>
                <textarea
                  rows="3"
                  value={editingMatch.matchNotes}
                  onChange={(e) => setEditingMatch({ ...editingMatch, matchNotes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMatch(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 text-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
