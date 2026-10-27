import React, { useState, useMemo, useCallback } from 'react';
import { 
  Trophy, 
  Search, 
  X, 
  Download, 
  ArrowUpDown, 
  ChevronUp, 
  ChevronDown, 
  HelpCircle,
  Users,
  Flame,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { calculateOPR, normalizeTeamKey } from '../../utils/opr';

// ============================================================================
// Bilingual Dictionary
// ============================================================================
const I18N = {
  en: {
    rankingsTitle: 'Qualification Standings',
    showingCount: 'Showing {count} of {total} teams',
    searchPlaceholder: 'Search team # or name...',
    exportCsv: 'Export CSV',
    exportCsvTooltip: 'Download rankings in RFC 4180 CSV format',
    colRank: 'Rank',
    colTeam: 'Team',
    colRecord: 'W-L-T',
    colAvgScore: 'Avg Score',
    colHighScore: 'High Score',
    colPlayed: 'Matches',
    colOpr: 'Cooperative OPR',
    oprTooltip: 'Calculated Offensive Power Rating: team scoring contribution in teamwork matches',
    noRankingsTitle: 'No qualification rankings published yet',
    noRankingsDesc: 'Standings will appear as soon as the first teamwork matches are officially scored.',
    noSearchTitle: 'No teams match your search',
    noSearchDesc: 'Try adjusting your team number or keyword filter.',
    clearSearch: 'Clear search',
    podiumGold: '1st Place',
    podiumSilver: '2nd Place',
    podiumBronze: '3rd Place',
    pts: 'pts',
    compareTeams: 'Compare Teams'
  },
  vi: {
    rankingsTitle: 'Bảng Xếp Hạng Vòng Loại',
    showingCount: 'Hiển thị {count} / {total} đội',
    searchPlaceholder: 'Tìm số đội hoặc tên...',
    exportCsv: 'Xuất CSV',
    exportCsvTooltip: 'Tải bảng xếp hạng theo định dạng chuẩn RFC 4180 CSV',
    colRank: 'Hạng',
    colTeam: 'Đội',
    colRecord: 'T-B-H',
    colAvgScore: 'Điểm TB',
    colHighScore: 'Kỷ lục',
    colPlayed: 'Số trận',
    colOpr: 'OPR Liên Minh',
    oprTooltip: 'Chỉ số OPR hợp tác: đóng góp điểm trung bình vào liên minh mỗi trận',
    noRankingsTitle: 'Chưa có bảng xếp hạng vòng loại',
    noRankingsDesc: 'Bảng xếp hạng sẽ tự động hiển thị sau khi các trận đấu đầu tiên có điểm chính thức.',
    noSearchTitle: 'Không tìm thấy đội phù hợp',
    noSearchDesc: 'Thử tìm kiếm với số đội hoặc từ khóa khác.',
    clearSearch: 'Xóa tìm kiếm',
    podiumGold: 'Hạng Nhất',
    podiumSilver: 'Hạng Nhì',
    podiumBronze: 'Hạng Ba',
    pts: 'điểm',
    compareTeams: 'So Sánh Đội'
  }
};

// ============================================================================
// RFC 4180 CSV Helpers
// ============================================================================

export function escapeCsvField(val) {
  if (val == null) return '';
  const str = String(val).trim();
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function formatRankingsToCsv(items = []) {
  const headers = ['Rank', 'Team', 'Name', 'W', 'L', 'T', 'AvgScore', 'HighScore', 'OPR'];
  const lines = [headers.join(',')];

  for (const item of items) {
    const row = [
      escapeCsvField(item.rank),
      escapeCsvField(item.teamNumber),
      escapeCsvField(item.teamName),
      escapeCsvField(item.wins),
      escapeCsvField(item.losses),
      escapeCsvField(item.ties),
      escapeCsvField(item.avgScore != null ? Number(item.avgScore).toFixed(1) : '0.0'),
      escapeCsvField(item.highScore != null ? item.highScore : 0),
      escapeCsvField(item.opr != null ? Number(item.opr).toFixed(1) : '')
    ];
    lines.push(row.join(','));
  }

  return lines.join('\r\n');
}

export function downloadCsvFile(csvContent, filename = 'VIQRC_Rankings.csv') {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// Main Component: RankingsTable
// ============================================================================
export default function RankingsTable({
  rankings = [],
  teams = [],
  matches = [],
  oprMap: propOprMap = null,
  division = null,
  event = null,
  onSelectTeam = null,
  onOpenTeamCompare = null,
  onCompareTeam = null,
  loading = false,
  lang: propLang = null
}) {
  const [lang] = useState(() => {
    if (propLang) return propLang;
    if (typeof localStorage !== 'undefined') {
      try {
        return localStorage.getItem('vexiq_lang') || 'en';
      } catch (e) {
        return 'en';
      }
    }
    return 'en';
  });
  const t = I18N[lang] || I18N.en;

  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState('rank');
  const [sortDirection, setSortDirection] = useState('asc');

  const teamsMap = useMemo(() => {
    const map = new Map();
    if (Array.isArray(teams)) {
      for (const tm of teams) {
        const key = normalizeTeamKey(tm.number || tm.code || tm.team_name || tm.name || tm);
        if (key) {
          map.set(key, tm);
        }
      }
    }
    return map;
  }, [teams]);

  const oprMap = useMemo(() => {
    if (propOprMap && Object.keys(propOprMap).length > 0) {
      return propOprMap;
    }
    return calculateOPR(teams, matches);
  }, [propOprMap, teams, matches]);

  const normalizedRankings = useMemo(() => {
    if (!Array.isArray(rankings)) return [];

    return rankings.map((r, idx) => {
      const teamNumber = normalizeTeamKey(r.team?.name || r.team?.code || r.team_number || r.team) || '';
      const teamMeta = teamsMap.get(teamNumber) || {};
      
      const teamName = teamMeta.team_name || teamMeta.name || r.team?.team_name || 
        (r.team?.name && r.team?.name !== teamNumber ? r.team?.name : '') || '';
      
      const organization = teamMeta.organization || teamMeta.affiliation || '';

      const wins = typeof r.wins === 'number' ? r.wins : 0;
      const losses = typeof r.losses === 'number' ? r.losses : 0;
      const ties = typeof r.ties === 'number' ? r.ties : 0;
      const matchesPlayed = typeof r.played === 'number' ? r.played : (wins + losses + ties);

      const avgScore = r.average_points !== undefined 
        ? Number(r.average_points) 
        : (r.avg_score !== undefined ? Number(r.avg_score) : 0);

      const highScore = r.high_score !== undefined 
        ? Number(r.high_score) 
        : 0;

      const oprVal = oprMap[teamNumber];
      const opr = typeof oprVal === 'number' && Number.isFinite(oprVal) ? oprVal : null;

      const rank = typeof r.rank === 'number' ? r.rank : idx + 1;

      return {
        raw: r,
        rank,
        teamNumber,
        teamName,
        organization,
        wins,
        losses,
        ties,
        matchesPlayed,
        avgScore,
        highScore,
        opr
      };
    });
  }, [rankings, teamsMap, oprMap]);

  const handleSort = useCallback((columnId) => {
    if (sortColumn === columnId) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(columnId);
      if (['avgScore', 'highScore', 'matchesPlayed', 'opr', 'record'].includes(columnId)) {
        setSortDirection('desc');
      } else {
        setSortDirection('asc');
      }
    }
  }, [sortColumn]);

  const processedRankings = useMemo(() => {
    let result = [...normalizedRankings];

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(item => {
        return (
          item.teamNumber.toLowerCase().includes(q) ||
          item.teamName.toLowerCase().includes(q) ||
          item.organization.toLowerCase().includes(q)
        );
      });
    }

    result.sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'rank':
          comparison = (a.rank ?? 9999) - (b.rank ?? 9999);
          break;
        case 'team':
          comparison = a.teamNumber.localeCompare(b.teamNumber, undefined, { numeric: true, sensitivity: 'base' });
          break;
        case 'record':
          comparison = (a.wins - b.wins) || (a.ties - b.ties) || (b.losses - a.losses);
          break;
        case 'avgScore':
          comparison = (a.avgScore ?? -1) - (b.avgScore ?? -1);
          break;
        case 'highScore':
          comparison = (a.highScore ?? -1) - (b.highScore ?? -1);
          break;
        case 'matchesPlayed':
          comparison = (a.matchesPlayed ?? 0) - (b.matchesPlayed ?? 0);
          break;
        case 'opr':
          comparison = (a.opr ?? -9999) - (b.opr ?? -9999);
          break;
        default:
          comparison = (a.rank ?? 9999) - (b.rank ?? 9999);
      }

      if (comparison === 0) {
        return (a.rank ?? 9999) - (b.rank ?? 9999);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [normalizedRankings, searchQuery, sortColumn, sortDirection]);

  const handleExportCsv = useCallback(() => {
    const filenamePrefix = event?.sku || event?.name || 'VIQRC';
    const divisionSuffix = division?.name || 'Division';
    const rawFilename = `${filenamePrefix}_${divisionSuffix}_Rankings.csv`;
    const cleanFilename = rawFilename.replace(/[^a-zA-Z0-9_\-\.]/g, '_');

    const csvData = formatRankingsToCsv(processedRankings.length > 0 ? processedRankings : normalizedRankings);
    downloadCsvFile(csvData, cleanFilename);
  }, [event, division, processedRankings, normalizedRankings]);

  const renderSortIcon = (columnId) => {
    if (sortColumn !== columnId) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
    );
  };

  const renderRankBadge = (rank) => {
    if (rank === 1) {
      return (
        <span 
          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 font-black text-xs shadow-sm ring-2 ring-amber-400/40"
          title={t.podiumGold}
        >
          1
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span 
          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-slate-200 to-slate-400 dark:from-slate-600 dark:to-slate-800 text-slate-900 dark:text-white font-black text-xs shadow-sm ring-2 ring-slate-300/40 dark:ring-slate-600/40"
          title={t.podiumSilver}
        >
          2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span 
          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-amber-700/60 to-amber-900/60 text-amber-100 dark:text-amber-200 font-black text-xs shadow-sm ring-2 ring-amber-700/30"
          title={t.podiumBronze}
        >
          3
        </span>
      );
    }
    return (
      <span className="font-bold text-slate-500 dark:text-slate-400 pl-1.5 text-xs">
        {rank}
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
      
      {/* Table Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {t.rankingsTitle}
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t.showingCount
              .replace('{count}', processedRankings.length)
              .replace('{total}', normalizedRankings.length)}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full h-11 pl-10 pr-9 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="min-w-[44px] min-h-[44px] absolute right-0 top-0 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title={t.clearSearch}
                aria-label={t.clearSearch}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={handleExportCsv}
            disabled={normalizedRankings.length === 0}
            title={t.exportCsvTooltip}
            className="min-h-[44px] px-3.5 sm:px-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-cyan-500/50 bg-slate-50 dark:bg-slate-800/80 hover:bg-cyan-50 dark:hover:bg-cyan-950/20 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all hover:scale-102 active:scale-98 flex items-center gap-1.5 shrink-0 shadow-sm disabled:opacity-40 disabled:pointer-events-none"
          >
            <Download className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>{t.exportCsv}</span>
          </button>

          {(onOpenTeamCompare || onCompareTeam) && (
            <button
              type="button"
              onClick={() => (onOpenTeamCompare || onCompareTeam)({})}
              title={lang === 'vi' ? 'So sánh các đội' : 'Compare teams head-to-head'}
              className="min-h-[44px] px-3.5 sm:px-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500/50 bg-slate-50 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all hover:scale-102 active:scale-98 flex items-center gap-1.5 shrink-0 shadow-sm"
            >
              <Users className="w-4 h-4 text-indigo-500" />
              <span>{t.compareTeams}</span>
            </button>
          )}
        </div>
      </div>

      {/* Table & Empty States */}
      {normalizedRankings.length === 0 ? (
        <div className="text-center py-16 px-4 space-y-3">
          <div className="w-14 h-14 rounded-3xl bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mx-auto">
            <Trophy className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h4 className="font-black text-sm text-slate-900 dark:text-white">
              {t.noRankingsTitle}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {t.noRankingsDesc}
            </p>
          </div>
        </div>
      ) : processedRankings.length === 0 ? (
        <div className="text-center py-12 px-4 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
              {t.noSearchTitle}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.noSearchDesc}
            </p>
          </div>
          <button
            onClick={() => setSearchQuery('')}
            className="min-h-[44px] px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors inline-flex items-center justify-center"
          >
            {t.clearSearch}
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse min-w-[620px]">
            <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 shadow-sm">
              <tr className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider select-none">
                
                <th scope="col" className="p-0">
                  <button
                    onClick={() => handleSort('rank')}
                    className="w-full min-h-[44px] pl-3 pr-2 flex items-center gap-1.5 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors group"
                    aria-label="Sort by rank"
                  >
                    <span>{t.colRank}</span>
                    {renderSortIcon('rank')}
                  </button>
                </th>

                <th scope="col" className="p-0">
                  <button
                    onClick={() => handleSort('team')}
                    className="w-full min-h-[44px] px-2 flex items-center gap-1.5 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors group"
                    aria-label="Sort by team"
                  >
                    <span>{t.colTeam}</span>
                    {renderSortIcon('team')}
                  </button>
                </th>

                <th scope="col" className="p-0">
                  <button
                    onClick={() => handleSort('record')}
                    className="w-full min-h-[44px] px-2 flex items-center justify-center gap-1.5 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors group"
                    aria-label="Sort by record"
                  >
                    <span>{t.colRecord}</span>
                    {renderSortIcon('record')}
                  </button>
                </th>

                <th scope="col" className="p-0">
                  <button
                    onClick={() => handleSort('matchesPlayed')}
                    className="w-full min-h-[44px] px-2 flex items-center justify-end gap-1.5 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors group"
                    aria-label="Sort by matches played"
                  >
                    <span>{t.colPlayed}</span>
                    {renderSortIcon('matchesPlayed')}
                  </button>
                </th>

                <th scope="col" className="p-0">
                  <button
                    onClick={() => handleSort('avgScore')}
                    className="w-full min-h-[44px] px-2 flex items-center justify-end gap-1.5 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors group"
                    aria-label="Sort by average score"
                  >
                    <span>{t.colAvgScore}</span>
                    {renderSortIcon('avgScore')}
                  </button>
                </th>

                <th scope="col" className="p-0">
                  <button
                    onClick={() => handleSort('highScore')}
                    className="w-full min-h-[44px] px-2 flex items-center justify-end gap-1.5 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors group"
                    aria-label="Sort by high score"
                  >
                    <span>{t.colHighScore}</span>
                    {renderSortIcon('highScore')}
                  </button>
                </th>

                <th scope="col" className="p-0">
                  <button
                    onClick={() => handleSort('opr')}
                    className="w-full min-h-[44px] pl-2 pr-3 flex items-center justify-end gap-1.5 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors group"
                    title={t.oprTooltip}
                    aria-label="Sort by cooperative OPR"
                  >
                    <span>{t.colOpr}</span>
                    {renderSortIcon('opr')}
                  </button>
                </th>

              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {processedRankings.map((row) => (
                <tr
                  key={row.teamNumber || row.rank}
                  onClick={() => onSelectTeam && onSelectTeam(row.teamNumber)}
                  className="hover:bg-cyan-50/40 dark:hover:bg-cyan-950/20 cursor-pointer transition-colors group"
                >
                  <td className="py-3 pl-3 pr-2 whitespace-nowrap">
                    {renderRankBadge(row.rank)}
                  </td>

                  <td className="py-3 px-2">
                    <div className="flex flex-col min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectTeam) onSelectTeam(row.teamNumber);
                        }}
                        className="font-black text-cyan-600 dark:text-cyan-400 hover:underline text-left text-xs sm:text-sm tracking-tight"
                      >
                        {row.teamNumber}
                      </button>
                      {row.teamName && (
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[130px] sm:max-w-[200px]">
                          {row.teamName}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-2 text-center whitespace-nowrap">
                    <span className="font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md">
                      {row.wins}-{row.losses}-{row.ties}
                    </span>
                  </td>

                  <td className="py-3 px-2 text-right whitespace-nowrap text-slate-600 dark:text-slate-400 font-medium">
                    {row.matchesPlayed}
                  </td>

                  <td className="py-3 px-2 text-right whitespace-nowrap font-black text-slate-900 dark:text-white">
                    {row.avgScore > 0 ? row.avgScore.toFixed(1) : '-'}
                  </td>

                  <td className="py-3 px-2 text-right whitespace-nowrap font-semibold text-slate-700 dark:text-slate-300">
                    {row.highScore > 0 ? row.highScore : '-'}
                  </td>

                  <td className="py-3 pl-2 pr-3 text-right whitespace-nowrap">
                    {row.opr != null ? (
                      <span className="inline-flex items-center gap-1 font-mono font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/60 dark:border-cyan-800/60 px-2 py-0.5 rounded-lg text-xs">
                        {row.opr.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-mono text-xs">-</span>
                    )}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
