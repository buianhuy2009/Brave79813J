import React, { useState, useMemo } from 'react';
import { 
  Target, 
  Search, 
  X, 
  Trophy, 
  Code2, 
  Gamepad2, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  ArrowUpDown,
  Download,
  Filter,
  CheckCircle2,
  Clock
} from 'lucide-react';
import SkillsBar from './charts/SkillsBar';

const I18N = {
  en: {
    skillsTitle: 'Robot Skills Standings',
    skillsSubtitle: 'Combined Autonomous Coding & Driver Skills leaderboard',
    searchPlaceholder: 'Filter team # or name...',
    allTeams: 'All Teams',
    bothRuns: 'Both Completed',
    driverOnly: 'Driver Only',
    autoOnly: 'Autonomous Only',
    rank: 'Rank',
    team: 'Team',
    totalScore: 'Total Score',
    driverScore: 'Driver Skills',
    autoScore: 'Autonomous Coding',
    attempts: 'Attempts',
    used: 'used',
    left: 'left',
    ratio: 'Skills Split',
    exportCsv: 'Export CSV',
    noSkillsTitle: 'No Skills Scores Recorded Yet',
    noSkillsDesc: 'Skills challenge results will appear here as teams complete their Driver and Autonomous Coding runs at the skills fields.',
    noMatchesTitle: 'No teams match your search',
    noMatchesDesc: 'Try adjusting your search query or run filter.',
    clearFilter: 'Clear filter',
    showingTeams: 'Showing {count} of {total} teams',
    points: 'pts',
    simulateSkills: 'Where Would I Place?'
  },
  vi: {
    skillsTitle: 'Bảng Điểm Kỹ Năng (Skills)',
    skillsSubtitle: 'Bảng xếp hạng tổng hợp Lập trình Tự hành & Lái tay',
    searchPlaceholder: 'Tìm số đội hoặc tên đội...',
    allTeams: 'Tất cả các đội',
    bothRuns: 'Đã chạy cả hai',
    driverOnly: 'Chỉ Lái tay',
    autoOnly: 'Chỉ Tự hành',
    rank: 'Hạng',
    team: 'Đội',
    totalScore: 'Tổng điểm',
    driverScore: 'Kỹ năng Lái tay',
    autoScore: 'Lập trình Tự hành',
    attempts: 'Lượt chạy',
    used: 'đã chạy',
    left: 'còn lại',
    ratio: 'Tỉ lệ điểm',
    exportCsv: 'Xuất CSV',
    noSkillsTitle: 'Chưa có điểm Skills nào được ghi nhận',
    noSkillsDesc: 'Kết quả phần thi kỹ năng sẽ hiển thị tại đây khi các đội hoàn thành lượt chạy Lái tay và Tự hành tại sân Skills.',
    noMatchesTitle: 'Không tìm thấy đội nào phù hợp',
    noMatchesDesc: 'Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc lượt thi.',
    clearFilter: 'Xóa bộ lọc',
    showingTeams: 'Hiển thị {count} / {total} đội',
    points: 'điểm',
    simulateSkills: 'Tôi Xếp Thứ Mấy?'
  }
};

/**
 * Normalizes raw RobotEvents skills data into a clean, uniform array
 */
export function normalizeSkills(skillsRaw = [], teamsList = []) {
  if (!Array.isArray(skillsRaw) || skillsRaw.length === 0) return [];

  const teamMap = new Map();
  if (Array.isArray(teamsList)) {
    for (const t of teamsList) {
      const num = String(t.number || t.code || t.team_name || t.name || '').trim().toUpperCase();
      if (num) teamMap.set(num, t);
    }
  }

  // Detect if records are split by type: 'driver' | 'programming'
  const hasTypeField = skillsRaw.some(s => s?.type === 'driver' || s?.type === 'programming');

  if (hasTypeField) {
    const grouped = new Map();

    for (const item of skillsRaw) {
      if (!item) continue;
      const teamObj = item.team || {};
      const teamNumber = String(teamObj.code || teamObj.name || teamObj.number || item.team_number || '').trim().toUpperCase();
      if (!teamNumber) continue;

      if (!grouped.has(teamNumber)) {
        const meta = teamMap.get(teamNumber) || {};
        grouped.set(teamNumber, {
          id: item.id || teamNumber,
          teamNumber,
          teamName: teamObj.name || meta.team_name || meta.name || '',
          organization: meta.organization || meta.school_name || '',
          driverScore: 0,
          driverAttempts: 0,
          progScore: 0,
          progAttempts: 0,
          totalScore: 0,
          rank: item.rank || 0
        });
      }

      const entry = grouped.get(teamNumber);
      const score = Number(item.score) || 0;
      const attempts = Number(item.attempts) || (score > 0 ? 1 : 0);

      if (item.type === 'driver') {
        if (score > entry.driverScore) entry.driverScore = score;
        entry.driverAttempts = Math.max(entry.driverAttempts, attempts);
      } else if (item.type === 'programming') {
        if (score > entry.progScore) entry.progScore = score;
        entry.progAttempts = Math.max(entry.progAttempts, attempts);
      } else {
        entry.totalScore = Math.max(entry.totalScore, score);
      }
    }

    const result = Array.from(grouped.values()).map(entry => {
      entry.totalScore = entry.totalScore || (entry.driverScore + entry.progScore);
      return entry;
    });

    // VIQRC Tiebreakers: Higher programming score, then higher driver score
    result.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (b.progScore !== a.progScore) return b.progScore - a.progScore;
      return b.driverScore - a.driverScore;
    });

    return result.map((entry, idx) => ({
      ...entry,
      rank: entry.rank || (idx + 1)
    }));
  }

  // Already aggregated records
  const result = skillsRaw.map((s, idx) => {
    const teamObj = s?.team || {};
    const teamNumber = String(teamObj.code || teamObj.name || teamObj.number || s?.team_number || '').trim().toUpperCase();
    const meta = teamMap.get(teamNumber) || {};

    const driverScore = Number(s?.scores?.driver ?? s?.scores?.maxDriver ?? s?.driver ?? 0);
    const progScore = Number(s?.scores?.programming ?? s?.scores?.maxProgramming ?? s?.programming ?? 0);
    const totalScore = Number(s?.score ?? s?.scores?.score ?? (driverScore + progScore));

    const driverAttempts = Number(
      s?.scores?.driverAttempts ?? 
      s?.driver_attempts ?? 
      s?.driverAttempts ?? 
      (driverScore > 0 ? (s?.attempts ? Math.min(s.attempts, 3) : 1) : 0)
    );

    const progAttempts = Number(
      s?.scores?.programmingAttempts ?? 
      s?.programming_attempts ?? 
      s?.progAttempts ?? 
      (progScore > 0 ? 1 : 0)
    );

    return {
      id: s?.id || teamNumber || idx,
      rank: s?.rank || (idx + 1),
      teamNumber: teamNumber || 'TBD',
      teamName: teamObj.name || meta.team_name || meta.name || '',
      organization: meta.organization || meta.school_name || '',
      totalScore,
      driverScore,
      driverAttempts: Math.min(Math.max(driverAttempts, 0), 3),
      progScore,
      progAttempts: Math.min(Math.max(progAttempts, 0), 3)
    };
  });

  result.sort((a, b) => (a.rank || 0) - (b.rank || 0));
  return result;
}

/**
 * Attempts Dots Counter (displays max 3 dots)
 */
export function AttemptsBadge({ used = 0, max = 3, label = "Runs", color = "cyan" }) {
  const safeUsed = Math.min(Math.max(used, 0), max);
  const remaining = max - safeUsed;

  const dotColor = color === 'cyan' ? 'bg-cyan-500' : 'bg-indigo-500';

  return (
    <div className="inline-flex items-center gap-1.5" title={`${label}: ${safeUsed}/${max} ${I18N.en.used} (${remaining} ${I18N.en.left})`}>
      <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300">
        {safeUsed}/{max}
      </span>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: max }).map((_, i) => (
          <span 
            key={i} 
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              i < safeUsed ? dotColor : 'bg-slate-200 dark:bg-slate-700'
            }`} 
          />
        ))}
      </div>
    </div>
  );
}

export default function SkillsStandings({
  skills = [],
  teams = [],
  onSelectTeam = null,
  onOpenSimulator = null,
  lang = 'en'
}) {
  const t = I18N[lang] || I18N.en;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterRun, setFilterRun] = useState('all'); // 'all' | 'both' | 'driver' | 'auto'
  const [sortField, setSortField] = useState('rank'); // 'rank' | 'total' | 'driver' | 'prog' | 'team'
  const [sortDir, setSortDir] = useState('asc'); // 'asc' | 'desc'

  // Normalize data
  const normalizedData = useMemo(() => {
    return normalizeSkills(skills, teams);
  }, [skills, teams]);

  // Filtered and sorted data
  const processedData = useMemo(() => {
    let list = [...normalizedData];

    // Filter by run presence
    if (filterRun === 'both') {
      list = list.filter(item => item.driverScore > 0 && item.progScore > 0);
    } else if (filterRun === 'driver') {
      list = list.filter(item => item.driverScore > 0 && item.progScore === 0);
    } else if (filterRun === 'auto') {
      list = list.filter(item => item.progScore > 0 && item.driverScore === 0);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(item => 
        item.teamNumber.toLowerCase().includes(q) ||
        item.teamName.toLowerCase().includes(q) ||
        item.organization.toLowerCase().includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      let valA;
      let valB;

      switch (sortField) {
        case 'total':
          valA = a.totalScore;
          valB = b.totalScore;
          break;
        case 'driver':
          valA = a.driverScore;
          valB = b.driverScore;
          break;
        case 'prog':
          valA = a.progScore;
          valB = b.progScore;
          break;
        case 'team':
          valA = a.teamNumber;
          valB = b.teamNumber;
          return sortDir === 'asc' 
            ? valA.localeCompare(valB, undefined, { numeric: true }) 
            : valB.localeCompare(valA, undefined, { numeric: true });
        case 'rank':
        default:
          valA = a.rank;
          valB = b.rank;
          break;
      }

      if (sortDir === 'asc') {
        return (valA ?? 0) - (valB ?? 0);
      }
      return (valB ?? 0) - (valA ?? 0);
    });

    return list;
  }, [normalizedData, filterRun, searchQuery, sortField, sortDir]);

  // Handle Sort Toggle
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      // Default total, driver, prog to desc
      setSortDir(['total', 'driver', 'prog'].includes(field) ? 'desc' : 'asc');
    }
  };

  // CSV Export with UTF-8 BOM
  const handleExportCsv = () => {
    if (processedData.length === 0) return;
    const headers = ['Rank', 'Team', 'Name', 'TotalScore', 'DriverScore', 'DriverAttempts', 'AutoScore', 'AutoAttempts'];
    const rows = processedData.map(d => [
      d.rank,
      `"${d.teamNumber}"`,
      `"${(d.teamName || '').replace(/"/g, '""')}"`,
      d.totalScore,
      d.driverScore,
      d.driverAttempts,
      d.progScore,
      d.progAttempts
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `skills_standings_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm space-y-5 animate-fade-in">
      
      {/* Top Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              {t.skillsTitle} ({normalizedData.length})
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t.skillsSubtitle}
          </p>
        </div>

        {/* Action Controls: Search & CSV Export */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              aria-label={t.searchPlaceholder}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl pl-9 pr-8 py-2 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 min-h-[44px]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-0 top-0 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={handleExportCsv}
            disabled={processedData.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 bg-slate-50 dark:bg-slate-800/60 hover:bg-cyan-50 dark:hover:bg-cyan-950/20 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all disabled:opacity-40 min-h-[44px]"
            title={t.exportCsv}
          >
            <Download className="w-3.5 h-3.5 text-cyan-500" />
            <span className="hidden sm:inline">{t.exportCsv}</span>
          </button>

          {onOpenSimulator && (
            <button
              type="button"
              onClick={() => onOpenSimulator({})}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 text-xs font-bold transition-all hover:scale-105 active:scale-95 min-h-[44px]"
              title={lang === 'vi' ? 'Mô phỏng vị trí của bạn trên bảng xếp hạng thế giới' : 'Simulate your ranking on world skills leaderboard'}
            >
              <Target className="w-3.5 h-3.5 text-cyan-500" />
              <span>{t.simulateSkills}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {[
          { key: 'all', label: t.allTeams },
          { key: 'both', label: t.bothRuns },
          { key: 'driver', label: t.driverOnly },
          { key: 'auto', label: t.autoOnly }
        ].map(btn => (
          <button
            key={btn.key}
            onClick={() => setFilterRun(btn.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all min-h-[38px] ${
              filterRun === btn.key
                ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20'
                : 'bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Main Standings Table */}
      {normalizedData.length === 0 ? (
        <div className="text-center py-12 px-4 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Target className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-black text-slate-800 dark:text-slate-200">
            {t.noSkillsTitle}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {t.noSkillsDesc}
          </p>
        </div>
      ) : processedData.length === 0 ? (
        <div className="text-center py-10 px-4 space-y-3">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {t.noMatchesTitle}
          </p>
          <p className="text-xs text-slate-500">
            {t.noMatchesDesc}
          </p>
          <button
            onClick={() => { setSearchQuery(''); setFilterRun('all'); }}
            className="min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors inline-flex items-center justify-center"
          >
            {t.clearFilter}
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0 rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs min-w-[620px]">
            <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 shadow-sm">
              <tr className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                <th 
                  onClick={() => handleSort('rank')}
                  className="pb-3 pl-4 sm:pl-3 cursor-pointer hover:text-cyan-500 transition-colors min-h-[44px]"
                >
                  <div className="flex items-center gap-1 min-h-[44px]">
                    <span>{t.rank}</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('team')}
                  className="pb-3 cursor-pointer hover:text-cyan-500 transition-colors min-h-[44px]"
                >
                  <div className="flex items-center gap-1 min-h-[44px]">
                    <span>{t.team}</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('total')}
                  className="pb-3 text-right cursor-pointer hover:text-cyan-500 transition-colors min-h-[44px]"
                >
                  <div className="flex items-center justify-end gap-1 min-h-[44px]">
                    <span>{t.totalScore}</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('prog')}
                  className="pb-3 text-right cursor-pointer hover:text-cyan-500 transition-colors min-h-[44px]"
                >
                  <div className="flex items-center justify-end gap-1 min-h-[44px]">
                    <Code2 className="w-3 h-3 text-cyan-500" />
                    <span>{t.autoScore}</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('driver')}
                  className="pb-3 text-right cursor-pointer hover:text-cyan-500 transition-colors min-h-[44px]"
                >
                  <div className="flex items-center justify-end gap-1 min-h-[44px]">
                    <Gamepad2 className="w-3 h-3 text-indigo-500" />
                    <span>{t.driverScore}</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="pb-3 pr-4 sm:pr-3 pl-4 text-center hidden md:table-cell min-h-[44px]">
                  <div className="flex items-center justify-center min-h-[44px]">
                    {t.ratio}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {processedData.map((s, i) => {
                const isTop1 = s.rank === 1;
                const isTop2 = s.rank === 2;
                const isTop3 = s.rank === 3;

                return (
                  <tr 
                    key={s.id || s.teamNumber || i}
                    onClick={() => onSelectTeam && onSelectTeam(s.teamNumber)}
                    className="hover:bg-cyan-50/40 dark:hover:bg-cyan-950/20 cursor-pointer transition-colors group"
                  >
                    {/* Rank with Medal Badges */}
                    <td className="py-3 pl-4 sm:pl-3 whitespace-nowrap">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black ${
                        isTop1 
                          ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30' 
                          : isTop2 
                            ? 'bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white' 
                            : isTop3 
                              ? 'bg-amber-700/30 text-amber-700 dark:text-amber-400' 
                              : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        {s.rank}
                      </span>
                    </td>

                    {/* Team Number & Name */}
                    <td className="py-3 pr-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectTeam) onSelectTeam(s.teamNumber);
                        }}
                        className="font-black text-xs sm:text-sm text-cyan-600 dark:text-cyan-400 hover:underline tracking-tight text-left block"
                      >
                        {s.teamNumber}
                      </button>
                      {s.teamName && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[150px] sm:max-w-xs">
                          {s.teamName}
                        </p>
                      )}
                    </td>

                    {/* Total Skills Score */}
                    <td className="py-3 text-right whitespace-nowrap">
                      <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                        {s.totalScore}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 block">
                        {t.points}
                      </span>
                    </td>

                    {/* Autonomous Coding Score + Attempts Counter */}
                    <td className="py-3 text-right whitespace-nowrap">
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                          {s.progScore}
                        </span>
                        <AttemptsBadge 
                          used={s.progAttempts} 
                          max={3} 
                          label="Auto" 
                          color="cyan" 
                        />
                      </div>
                    </td>

                    {/* Driver Skills Score + Attempts Counter */}
                    <td className="py-3 text-right whitespace-nowrap">
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                          {s.driverScore}
                        </span>
                        <AttemptsBadge 
                          used={s.driverAttempts} 
                          max={3} 
                          label="Driver" 
                          color="indigo" 
                        />
                      </div>
                    </td>

                    {/* Visual Split Bar (Integrated SkillsBar) */}
                    <td className="py-3 pr-4 sm:pr-3 pl-4 hidden md:table-cell w-48">
                      <SkillsBar 
                        driverScore={s.driverScore} 
                        programmingScore={s.progScore} 
                        totalScore={s.totalScore}
                        compact={true}
                        lang={lang}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer Info */}
      {processedData.length > 0 && (
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span>
            {t.showingTeams.replace('{count}', processedData.length).replace('{total}', normalizedData.length)}
          </span>
          <span className="hidden sm:inline">
            Official VIQRC Skills: Max 3 Driver + 3 Auto runs
          </span>
        </div>
      )}

    </div>
  );
}
