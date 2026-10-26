import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  X, 
  Plus, 
  Search, 
  Star, 
  GitCompare, 
  Trophy, 
  Flame, 
  Activity, 
  TrendingUp, 
  Target, 
  Award, 
  Users, 
  Percent, 
  Sparkles, 
  ChevronRight, 
  Check, 
  ShieldAlert,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { isFavorite, toggleFavorite, subscribeToStorage } from '../../utils/eventsStorage';
import { calculateOPR, parseMatch, normalizeTeamKey } from '../../utils/opr';
import SkillsBar from './charts/SkillsBar';
import { normalizeSkills } from './SkillsStandings';
import { extractMatchAlliance } from './MatchSchedule';

const I18N = {
  en: {
    compareTitle: 'Team Head-to-Head Comparison',
    compareSubtitle: 'Compare 2 to 4 teams head-to-head across OPR, scores, and skills',
    searchPlaceholder: 'Search team #, name, or city to add...',
    addTeam: 'Add Team',
    removeTeam: 'Remove',
    maxTeamsReached: 'Maximum 4 teams can be compared simultaneously',
    selectTeamsPrompt: 'Select at least 2 teams to view comparison',
    close: 'Close',
    viewProfile: 'View Profile',
    metric: 'Performance Metric',
    eventRank: 'Division Rank',
    opr: 'Cooperative OPR',
    avgScore: 'Avg Match Score',
    highScore: 'High Match Score',
    totalSkills: 'Total Skills',
    driverSkills: 'Driver Skills',
    progSkills: 'Autonomous Coding',
    autoRatio: 'Auto Ratio',
    record: 'Record (W-L-T)',
    winRate: 'Win Rate',
    matchesPlayed: 'Matches Played',
    awardsCount: 'Awards Won',
    pts: 'pts',
    leader: 'Leader',
    tabMatrix: 'Metric Matrix',
    tabVisuals: 'Visual Analytics',
    tabSynergy: 'Alliance Synergy',
    visualOpr: 'OPR Comparison',
    visualAvg: 'Avg Score Comparison',
    visualSkills: 'Skills Split Comparison',
    radarComparison: '6-Axis Multi-Team Radar Overlay',
    allianceSynergy: 'Alliance Compatibility & Synergy',
    projectedScore: 'Projected Alliance Score (Combined OPR)',
    projectedDesc: 'Predicted joint score if these teams form an alliance in finals',
    complementaryTitle: 'Skills Complementarity Insight',
    sharedMatchesTitle: 'Matches Played Together as Alliance Partners',
    noSharedMatches: 'These teams have not been paired together in this tournament yet.',
    matchedIn: 'Matched in',
    jointScore: 'Joint Score',
    highSynergyBadge: 'High Synergy',
    balancedBadge: 'Balanced',
    strongAutoPair: 'Elite Autonomous Alliance: High auto scoring potential from both teams',
    strongComplementaryPair: 'Complementary Specialties: Exceptional Driver + Auto combination',
    balancedPair: 'Balanced Pair: Solid all-around performance across match play and skills',
    teamPill: 'Team',
    noSearchResults: 'No teams match your search query',
    clearAll: 'Reset All Teams'
  },
  vi: {
    compareTitle: 'So Sánh Đối Đầu Đội Tuyển',
    compareSubtitle: 'So sánh trực diện 2 đến 4 đội về OPR, điểm thi đấu và kỹ năng',
    searchPlaceholder: 'Tìm số đội, tên đội hoặc thành phố để thêm...',
    addTeam: 'Thêm đội',
    removeTeam: 'Xóa',
    maxTeamsReached: 'Đã đạt giới hạn tối đa so sánh 4 đội cùng lúc',
    selectTeamsPrompt: 'Chọn ít nhất 2 đội để xem bảng so sánh',
    close: 'Đóng',
    viewProfile: 'Xem hồ sơ',
    metric: 'Chỉ số đánh giá',
    eventRank: 'Hạng bảng đấu',
    opr: 'OPR Liên minh',
    avgScore: 'Điểm đấu TB',
    highScore: 'Kỷ lục điểm',
    totalSkills: 'Tổng điểm Skills',
    driverSkills: 'Kỹ năng Lái tay',
    progSkills: 'Lập trình Tự hành',
    autoRatio: 'Tỉ lệ Tự hành',
    record: 'Thành tích (T-B-H)',
    winRate: 'Tỉ lệ Thắng',
    matchesPlayed: 'Số trận đã đấu',
    awardsCount: 'Số giải thưởng',
    pts: 'điểm',
    leader: 'Dẫn đầu',
    tabMatrix: 'Bảng đối chiếu',
    tabVisuals: 'Biểu đồ trực quan',
    tabSynergy: 'Tương thích liên minh',
    visualOpr: 'So sánh OPR',
    visualAvg: 'So sánh Điểm trung bình',
    visualSkills: 'So sánh Phân bổ Skills',
    radarComparison: 'Biểu đồ Radar đa giác đa đội',
    allianceSynergy: 'Mức Độ Ăn Ý & Tương Thích Liên Minh',
    projectedScore: 'Điểm liên minh dự kiến (Tổng OPR)',
    projectedDesc: 'Dự báo điểm chung khi hai đội bắt cặp liên minh trong vòng chung kết',
    complementaryTitle: 'Phân tích độ bổ trợ kỹ năng',
    sharedMatchesTitle: 'Các trận từng chung liên minh tại giải',
    noSharedMatches: 'Các đội này chưa từng được xếp cặp cùng nhau tại giải đấu này.',
    matchedIn: 'Thi đấu tại',
    jointScore: 'Điểm đạt được',
    highSynergyBadge: 'Rất ăn ý',
    balancedBadge: 'Cân bằng',
    strongAutoPair: 'Liên minh Tự hành vượt trội: Tiềm năng ghi điểm tự hành rất cao từ cả hai đội',
    strongComplementaryPair: 'Bổ trợ hoàn hảo: Một đội mạnh Lái tay kết hợp với một đội mạnh Tự hành',
    balancedPair: 'Liên minh cân bằng: Chỉ số ổn định đồng đều giữa lái tay và lập trình',
    teamPill: 'Đội',
    noSearchResults: 'Không tìm thấy đội nào phù hợp',
    clearAll: 'Đặt lại danh sách'
  }
};

// 4 Distinct Team Theme Palettes
const TEAM_THEMES = [
  {
    key: 'cyan',
    name: 'Cyan',
    hex: '#06b6d4',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500',
    text: 'text-cyan-600 dark:text-cyan-400',
    ring: 'ring-cyan-500',
    badge: 'bg-cyan-500 text-white',
    barFill: 'bg-cyan-500'
  },
  {
    key: 'violet',
    name: 'Violet',
    hex: '#8b5cf6',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500',
    text: 'text-violet-600 dark:text-violet-400',
    ring: 'ring-violet-500',
    badge: 'bg-violet-500 text-white',
    barFill: 'bg-violet-500'
  },
  {
    key: 'amber',
    name: 'Amber',
    hex: '#f59e0b',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    ring: 'ring-amber-500',
    badge: 'bg-amber-500 text-white',
    barFill: 'bg-amber-500'
  },
  {
    key: 'emerald',
    name: 'Emerald',
    hex: '#10b981',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    ring: 'ring-emerald-500',
    badge: 'bg-emerald-500 text-white',
    barFill: 'bg-emerald-500'
  }
];

/**
 * TeamCompareModal.jsx - Side-by-side comparison modal for 2 to 4 teams
 * 
 * Features:
 * - Search autocomplete selector with quick add/remove
 * - Comparative metric matrix with automatic leader badge highlighting
 * - Visual bar comparison normalized to maximum
 * - Multi-team overlaid 6-axis SVG Radar chart
 * - Stacked Driver vs Programming SkillsBar comparison
 * - Alliance Synergy / Compatibility analyzer with projected score & shared match history
 * - Fully responsive, dark/light theme, keyboard dismiss (ESC), and WCAG compliant
 */
export default function TeamCompareModal({
  isOpen = true,
  onClose,
  initialTeams = [],
  event = null,
  division = null,
  matches = [],
  rankings = [],
  skills = [],
  teams = [],
  awards = [],
  oprMap = null,
  onSelectTeam = null,
  lang = 'en'
}) {
  const t = I18N[lang] || I18N.en;
  const isVi = lang === 'vi';

  // State: selected teams list (array of strings, e.g. ['79813J', '12345A'])
  const [selectedTeams, setSelectedTeams] = useState(() => {
    const list = Array.isArray(initialTeams) 
      ? initialTeams.map(t => normalizeTeamKey(t)).filter(Boolean)
      : [];
    const deduped = Array.from(new Set(list)).slice(0, 4);
    return deduped;
  });

  // State: active sub-tab ('matrix' | 'visuals' | 'synergy')
  const [activeTab, setActiveTab] = useState('matrix');

  // State: autocomplete search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef(null);

  // Sync favorites reactively
  const [favorites, setFavorites] = useState([]);
  useEffect(() => {
    const unsub = subscribeToStorage(detail => {
      if (detail.key === 'vexiq_live_favorites') {
        // Trigger re-render
        setSelectedTeams(prev => [...prev]);
      }
    });
    return unsub;
  }, []);

  // Keyboard Escape listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scrolling
  useEffect(() => {
    if (!isOpen) return;
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = origOverflow;
    };
  }, [isOpen]);

  // Normalize Skills List
  const normalizedSkillsList = useMemo(() => {
    return normalizeSkills(skills, teams);
  }, [skills, teams]);

  // Resolve OPR map
  const resolvedOprMap = useMemo(() => {
    if (oprMap && Object.keys(oprMap).length > 0) return oprMap;
    return calculateOPR(teams, matches);
  }, [oprMap, teams, matches]);

  // Available Teams for Autocomplete Search
  const searchCandidates = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();

    // Pool from teams, rankings, or skills
    const candidates = [];
    const seen = new Set(selectedTeams);

    // Search teams roster
    if (Array.isArray(teams)) {
      for (const tm of teams) {
        const num = normalizeTeamKey(tm.number || tm.code || tm.team_name || tm.name || tm);
        if (!num || seen.has(num)) continue;

        const name = String(tm.team_name || tm.name || '').toLowerCase();
        const org = String(tm.organization || tm.school_name || '').toLowerCase();
        const city = String(tm.city || tm.location?.city || '').toLowerCase();

        if (num.toLowerCase().includes(q) || name.includes(q) || org.includes(q) || city.includes(q)) {
          candidates.push({
            number: num,
            name: tm.team_name || tm.name || '',
            organization: tm.organization || tm.school_name || '',
            city: tm.city || tm.location?.city || ''
          });
          seen.add(num);
        }
      }
    }

    // Search rankings
    if (Array.isArray(rankings)) {
      for (const r of rankings) {
        const num = normalizeTeamKey(r.team?.name || r.team?.code || r.team_number || r.team);
        if (!num || seen.has(num)) continue;
        if (num.toLowerCase().includes(q)) {
          candidates.push({
            number: num,
            name: r.team?.name || '',
            organization: '',
            city: ''
          });
          seen.add(num);
        }
      }
    }

    return candidates.slice(0, 8);
  }, [searchQuery, selectedTeams, teams, rankings]);

  // Add a team to comparison
  const handleAddTeam = useCallback((teamNum) => {
    const clean = normalizeTeamKey(teamNum);
    if (!clean || selectedTeams.includes(clean) || selectedTeams.length >= 4) return;
    setSelectedTeams(prev => [...prev, clean]);
    setSearchQuery('');
    setIsSearchOpen(false);
  }, [selectedTeams]);

  // Remove a team from comparison
  const handleRemoveTeam = useCallback((teamNum) => {
    setSelectedTeams(prev => prev.filter(tItem => tItem !== teamNum));
  }, []);

  // Compute Full Metrics for Each Selected Team
  const comparedData = useMemo(() => {
    return selectedTeams.map((teamNum, idx) => {
      const theme = TEAM_THEMES[idx % TEAM_THEMES.length];

      // Team Metadata
      const teamObj = teams.find(tm => normalizeTeamKey(tm.number || tm.code || tm.name) === teamNum) || {};
      const teamName = teamObj.team_name || teamObj.name || teamNum;
      const organization = teamObj.organization || teamObj.school_name || '';
      const city = teamObj.city || teamObj.location?.city || '';
      const grade = teamObj.grade || 'Middle School';

      // Ranking Record
      const rankEntry = rankings.find(r => normalizeTeamKey(r.team?.name || r.team?.code || r.team_number || r.team) === teamNum);
      const rank = rankEntry?.rank ?? '-';
      const wins = rankEntry?.wins ?? 0;
      const losses = rankEntry?.losses ?? 0;
      const ties = rankEntry?.ties ?? 0;
      const matchesPlayed = rankEntry?.played ?? (wins + losses + ties);
      const winRatePct = matchesPlayed > 0 ? Math.round(((wins + ties * 0.5) / matchesPlayed) * 100) : 0;
      const avgScore = rankEntry?.average_points !== undefined 
        ? Number(rankEntry.average_points)
        : (rankEntry?.avg_score !== undefined ? Number(rankEntry.avg_score) : 0);
      const highScore = rankEntry?.high_score !== undefined ? Number(rankEntry.high_score) : 0;

      // OPR
      const opr = typeof resolvedOprMap[teamNum] === 'number' ? resolvedOprMap[teamNum] : 0;

      // Skills Record
      const skillEntry = normalizedSkillsList.find(s => s.teamNumber === teamNum);
      const driverScore = skillEntry?.driverScore ?? 0;
      const progScore = skillEntry?.progScore ?? 0;
      const totalSkills = skillEntry?.totalScore ?? (driverScore + progScore);
      const autoRatioPct = totalSkills > 0 ? Math.round((progScore / totalSkills) * 100) : 0;

      // Awards Count
      const teamAwards = awards.filter(a => {
        const winners = a.teamWinners || [];
        return winners.some(w => normalizeTeamKey(w.team?.number || w.team?.code || w.team?.name || w.team) === teamNum);
      });

      const isFav = isFavorite('teams', teamNum);

      return {
        teamNumber: teamNum,
        teamName,
        organization,
        city,
        grade,
        theme,
        rank,
        wins,
        losses,
        ties,
        matchesPlayed,
        winRatePct,
        avgScore,
        highScore,
        opr,
        totalSkills,
        driverScore,
        progScore,
        autoRatioPct,
        awardsCount: teamAwards.length,
        isFav
      };
    });
  }, [selectedTeams, teams, rankings, resolvedOprMap, normalizedSkillsList, awards]);

  // Determine Leader / Maximum for Each Numeric Metric
  const leaders = useMemo(() => {
    if (comparedData.length === 0) return {};
    const maxOpr = Math.max(...comparedData.map(d => d.opr));
    const maxAvg = Math.max(...comparedData.map(d => d.avgScore));
    const maxHigh = Math.max(...comparedData.map(d => d.highScore));
    const maxSkills = Math.max(...comparedData.map(d => d.totalSkills));
    const maxDriver = Math.max(...comparedData.map(d => d.driverScore));
    const maxProg = Math.max(...comparedData.map(d => d.progScore));
    const maxWinRate = Math.max(...comparedData.map(d => d.winRatePct));
    const maxAwards = Math.max(...comparedData.map(d => d.awardsCount));

    return {
      opr: maxOpr > 0 ? maxOpr : null,
      avgScore: maxAvg > 0 ? maxAvg : null,
      highScore: maxHigh > 0 ? maxHigh : null,
      totalSkills: maxSkills > 0 ? maxSkills : null,
      driverScore: maxDriver > 0 ? maxDriver : null,
      progScore: maxProg > 0 ? maxProg : null,
      winRatePct: maxWinRate > 0 ? maxWinRate : null,
      awardsCount: maxAwards > 0 ? maxAwards : null
    };
  }, [comparedData]);

  // Alliance Synergy & Shared Matches Analysis
  const synergyData = useMemo(() => {
    if (selectedTeams.length < 2) return null;

    // 1. Shared Matches: pairs of selected teams playing together
    const sharedMatches = [];
    const teamSet = new Set(selectedTeams);

    for (const m of matches) {
      const alliance = extractMatchAlliance(m);
      const participating = alliance.teams
        .map(tItem => tItem.number)
        .filter(num => teamSet.has(num));

      if (participating.length >= 2) {
        sharedMatches.push({
          matchName: alliance.matchName,
          roundName: alliance.roundName,
          teams: participating,
          score: alliance.score,
          isScored: alliance.isScored
        });
      }
    }

    // 2. Head-to-Head Pair Insights (first 2 teams)
    const t1 = comparedData[0];
    const t2 = comparedData[1];
    let projectedScore = 0;
    let synergyType = 'balanced';
    let synergyExplanation = t.balancedPair;

    if (t1 && t2) {
      projectedScore = Math.round((t1.opr + t2.opr) * 10) / 10;

      const t1DriverHeavy = t1.driverScore > t1.progScore * 1.5;
      const t2ProgHeavy = t2.progScore > t2.driverScore * 0.8;
      const t2DriverHeavy = t2.driverScore > t2.progScore * 1.5;
      const t1ProgHeavy = t1.progScore > t1.driverScore * 0.8;

      if ((t1DriverHeavy && t2ProgHeavy) || (t2DriverHeavy && t1ProgHeavy)) {
        synergyType = 'complementary';
        synergyExplanation = t.strongComplementaryPair;
      } else if (t1.progScore >= 35 && t2.progScore >= 35) {
        synergyType = 'auto_elite';
        synergyExplanation = t.strongAutoPair;
      } else {
        synergyType = 'balanced';
        synergyExplanation = t.balancedPair;
      }
    }

    return {
      sharedMatches,
      projectedScore,
      synergyType,
      synergyExplanation
    };
  }, [selectedTeams, matches, comparedData, t]);

  // Multi-Team Radar Coordinates Calculation
  const radarData = useMemo(() => {
    const axisDefs = [
      { key: 'avgScore', en: 'Avg Score', vi: 'Điểm TB', max: 120 },
      { key: 'highScore', en: 'High Score', vi: 'Kỷ lục', max: 140 },
      { key: 'opr', en: 'OPR', vi: 'OPR', max: 70 },
      { key: 'totalSkills', en: 'Skills', vi: 'Skills', max: 150 },
      { key: 'autoRatioPct', en: 'Auto Ratio', vi: 'Tỉ lệ Auto', max: 100 },
      { key: 'winRatePct', en: 'Win Rate', vi: 'Tỉ lệ Thắng', max: 100 }
    ];

    const cx = 170;
    const cy = 170;
    const R = 105;

    function getAngle(index) {
      return -Math.PI / 2 + (index * 2 * Math.PI) / 6;
    }

    const teamPolygons = comparedData.map(team => {
      const points = axisDefs.map((axis, i) => {
        const val = Number(team[axis.key]) || 0;
        const pct = Math.min(100, Math.max(6, (val / axis.max) * 100));
        const r = (pct / 100) * R;
        const angle = getAngle(i);
        return {
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle),
          val
        };
      });

      return {
        teamNumber: team.teamNumber,
        theme: team.theme,
        polygonStr: points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
        points
      };
    });

    return { axisDefs, cx, cy, R, teamPolygons, getAngle };
  }, [comparedData]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="team-compare-heading"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[94vh] flex flex-col overflow-hidden my-auto animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* ================================================================= */}
        {/* Header & Team Selection Pills                                    */}
        {/* ================================================================= */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20 space-y-4">
          
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-black shrink-0 border border-cyan-500/20">
                <GitCompare className="w-5 h-5" />
              </div>
              <div>
                <h2 id="team-compare-heading" className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {t.compareTitle}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t.compareSubtitle}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label={t.close}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Selected Teams Badges & Autocomplete Search Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            
            {/* Team Badges */}
            {comparedData.map((tm) => (
              <div 
                key={tm.teamNumber}
                className={`flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-2xl border text-xs font-bold transition-all shadow-sm ${tm.theme.bg} ${tm.theme.border}`}
              >
                <button
                  type="button"
                  onClick={() => onSelectTeam && onSelectTeam(tm.teamNumber)}
                  className={`font-black font-mono hover:underline ${tm.theme.text}`}
                  title={t.viewProfile}
                >
                  {tm.teamNumber}
                </button>
                {tm.teamName !== tm.teamNumber && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[100px] hidden sm:inline">
                    {tm.teamName}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveTeam(tm.teamNumber)}
                  className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800 transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center"
                  aria-label={`${t.removeTeam} ${tm.teamNumber}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {/* Add Team Dropdown / Search */}
            {selectedTeams.length < 4 && (
              <div className="relative">
                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsSearchOpen(true);
                      }}
                      onFocus={() => setIsSearchOpen(true)}
                      placeholder={t.searchPlaceholder}
                      className="w-48 sm:w-64 pl-8 pr-3 py-1.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-sm"
                    />
                  </div>
                </div>

                {/* Autocomplete Dropdown List */}
                {isSearchOpen && searchCandidates.length > 0 && (
                  <div className="absolute left-0 top-full mt-2 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-30 overflow-hidden py-1 divide-y divide-slate-100 dark:divide-slate-700/50">
                    {searchCandidates.map((c) => (
                      <button
                        key={c.number}
                        type="button"
                        onClick={() => handleAddTeam(c.number)}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-cyan-50 dark:hover:bg-slate-700/60 transition-colors flex items-center justify-between group"
                      >
                        <div className="min-w-0">
                          <span className="font-black font-mono text-cyan-600 dark:text-cyan-400 text-xs">
                            {c.number}
                          </span>
                          {c.name && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                              {c.name}
                            </p>
                          )}
                          {c.city && (
                            <p className="text-[10px] text-slate-400 truncate">
                              {c.city}
                            </p>
                          )}
                        </div>
                        <Plus className="w-4 h-4 text-slate-400 group-hover:text-cyan-500 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Clear All Button */}
            {selectedTeams.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedTeams([])}
                className="text-[11px] font-bold text-slate-400 hover:text-rose-500 underline ml-auto px-2 py-1"
              >
                {t.clearAll}
              </button>
            )}

          </div>

          {/* Sub-Tab Navigation Bar */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setActiveTab('matrix')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[38px] flex items-center gap-1.5 ${
                activeTab === 'matrix'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{t.tabMatrix}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('visuals')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[38px] flex items-center gap-1.5 ${
                activeTab === 'visuals'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{t.tabVisuals}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('synergy')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[38px] flex items-center gap-1.5 ${
                activeTab === 'synergy'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{t.tabSynergy}</span>
            </button>
          </div>

        </div>

        {/* ================================================================= */}
        {/* Scrollable Comparison Content                                    */}
        {/* ================================================================= */}
        <div className="p-4 sm:p-6 overflow-y-auto">
          
          {selectedTeams.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs rounded-3xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 space-y-2">
              <GitCompare className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="font-bold text-sm text-slate-700 dark:text-slate-300">{t.selectTeamsPrompt}</p>
              <p>{t.searchPlaceholder}</p>
            </div>
          ) : (
            <>
              {/* TAB 1: METRIC MATRIX TABLE */}
              {activeTab === 'matrix' && (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    
                    {/* Header: Teams Column Badges */}
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                        <th className="p-3.5 text-xs font-black uppercase text-slate-500 dark:text-slate-400 w-1/4">
                          {t.metric}
                        </th>
                        {comparedData.map(tm => (
                          <th key={tm.teamNumber} className="p-3.5 text-center">
                            <div className="flex flex-col items-center">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black font-mono border ${tm.theme.bg} ${tm.theme.text} ${tm.theme.border}`}>
                                {tm.teamNumber}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[120px] mt-0.5">
                                {tm.teamName}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs font-medium">
                      
                      {/* Row: Division Rank */}
                      <tr>
                        <td className="p-3.5 font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5 text-amber-500" />
                          {t.eventRank}
                        </td>
                        {comparedData.map(tm => (
                          <td key={tm.teamNumber} className="p-3.5 text-center font-black font-mono text-sm text-slate-900 dark:text-white">
                            {tm.rank !== '-' ? `#${tm.rank}` : '-'}
                          </td>
                        ))}
                      </tr>

                      {/* Row: Cooperative OPR */}
                      <tr className="bg-slate-50/50 dark:bg-slate-800/20">
                        <td className="p-3.5 font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-cyan-500" />
                          {t.opr}
                        </td>
                        {comparedData.map(tm => {
                          const isLeader = leaders.opr && tm.opr === leaders.opr;
                          return (
                            <td key={tm.teamNumber} className="p-3.5 text-center font-mono">
                              <span className={`text-sm font-black ${isLeader ? 'text-cyan-600 dark:text-cyan-400 font-extrabold underline decoration-cyan-400 decoration-2' : 'text-slate-900 dark:text-white'}`}>
                                {tm.opr.toFixed(1)}
                              </span>
                              {isLeader && comparedData.length > 1 && (
                                <span className="ml-1.5 px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[9px] font-bold uppercase">
                                  {t.leader}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Row: Avg Match Score */}
                      <tr>
                        <td className="p-3.5 font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-blue-500" />
                          {t.avgScore}
                        </td>
                        {comparedData.map(tm => {
                          const isLeader = leaders.avgScore && tm.avgScore === leaders.avgScore;
                          return (
                            <td key={tm.teamNumber} className="p-3.5 text-center font-mono">
                              <span className={`text-sm font-black ${isLeader ? 'text-blue-600 dark:text-blue-400 font-extrabold' : 'text-slate-900 dark:text-white'}`}>
                                {tm.avgScore}
                              </span>
                              {isLeader && comparedData.length > 1 && (
                                <span className="ml-1.5 px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9px] font-bold uppercase">
                                  {t.leader}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Row: High Match Score */}
                      <tr className="bg-slate-50/50 dark:bg-slate-800/20">
                        <td className="p-3.5 font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                          {t.highScore}
                        </td>
                        {comparedData.map(tm => {
                          const isLeader = leaders.highScore && tm.highScore === leaders.highScore;
                          return (
                            <td key={tm.teamNumber} className="p-3.5 text-center font-mono">
                              <span className={`text-sm font-black ${isLeader ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-slate-900 dark:text-white'}`}>
                                {tm.highScore}
                              </span>
                              {isLeader && comparedData.length > 1 && (
                                <span className="ml-1.5 px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold uppercase">
                                  {t.leader}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Row: Total Skills */}
                      <tr>
                        <td className="p-3.5 font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-indigo-500" />
                          {t.totalSkills}
                        </td>
                        {comparedData.map(tm => {
                          const isLeader = leaders.totalSkills && tm.totalSkills === leaders.totalSkills;
                          return (
                            <td key={tm.teamNumber} className="p-3.5 text-center font-mono">
                              <span className={`text-sm font-black ${isLeader ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'text-slate-900 dark:text-white'}`}>
                                {tm.totalSkills}
                              </span>
                              {isLeader && comparedData.length > 1 && (
                                <span className="ml-1.5 px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold uppercase">
                                  {t.leader}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Row: Driver Skills */}
                      <tr className="bg-slate-50/50 dark:bg-slate-800/20">
                        <td className="p-3.5 font-bold text-slate-700 dark:text-slate-300 pl-7">
                          • {t.driverSkills}
                        </td>
                        {comparedData.map(tm => (
                          <td key={tm.teamNumber} className="p-3.5 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                            {tm.driverScore}
                          </td>
                        ))}
                      </tr>

                      {/* Row: Autonomous Coding Skills */}
                      <tr>
                        <td className="p-3.5 font-bold text-slate-700 dark:text-slate-300 pl-7">
                          • {t.progSkills}
                        </td>
                        {comparedData.map(tm => (
                          <td key={tm.teamNumber} className="p-3.5 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                            {tm.progScore}
                          </td>
                        ))}
                      </tr>

                      {/* Row: Auto Ratio % */}
                      <tr className="bg-slate-50/50 dark:bg-slate-800/20">
                        <td className="p-3.5 font-bold text-slate-700 dark:text-slate-300 pl-7">
                          • {t.autoRatio}
                        </td>
                        {comparedData.map(tm => (
                          <td key={tm.teamNumber} className="p-3.5 text-center font-mono font-bold text-slate-600 dark:text-slate-400">
                            {tm.autoRatioPct}%
                          </td>
                        ))}
                      </tr>

                      {/* Row: Record & Win Rate */}
                      <tr>
                        <td className="p-3.5 font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Percent className="w-3.5 h-3.5 text-amber-500" />
                          {t.winRate}
                        </td>
                        {comparedData.map(tm => (
                          <td key={tm.teamNumber} className="p-3.5 text-center font-mono">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {tm.winRatePct}%
                            </span>
                            <span className="block text-[10px] text-slate-400 mt-0.5">
                              {tm.wins}W - {tm.losses}L - {tm.ties}T
                            </span>
                          </td>
                        ))}
                      </tr>

                      {/* Row: Awards Won */}
                      <tr className="bg-slate-50/50 dark:bg-slate-800/20">
                        <td className="p-3.5 font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          {t.awardsCount}
                        </td>
                        {comparedData.map(tm => (
                          <td key={tm.teamNumber} className="p-3.5 text-center font-mono font-bold text-slate-900 dark:text-white">
                            {tm.awardsCount}
                          </td>
                        ))}
                      </tr>

                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 2: VISUAL ANALYTICS & CHARTS */}
              {activeTab === 'visuals' && (
                <div className="space-y-6">
                  
                  {/* Visual 1: Multi-Team Radar Chart Overlay */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 flex flex-col items-center">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white mb-3 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-cyan-500" />
                      {t.radarComparison}
                    </h3>

                    <div className="relative w-full max-w-[340px] aspect-square">
                      <svg
                        viewBox="0 0 340 340"
                        className="w-full h-full overflow-visible"
                        role="img"
                        aria-label="Multi-team comparative radar chart overlay"
                      >
                        {/* Concentric Hexagonal Grid */}
                        {[0.2, 0.4, 0.6, 0.8, 1.0].map((lvl, lvlIdx) => {
                          const r = lvl * radarData.R;
                          const pts = [0, 1, 2, 3, 4, 5].map(i => {
                            const a = radarData.getAngle(i);
                            return `${(radarData.cx + r * Math.cos(a)).toFixed(1)},${(radarData.cy + r * Math.sin(a)).toFixed(1)}`;
                          }).join(' ');
                          return (
                            <polygon
                              key={lvlIdx}
                              points={pts}
                              className="fill-none stroke-slate-200 dark:stroke-slate-700/60"
                              strokeWidth="1"
                            />
                          );
                        })}

                        {/* Radial Spokes */}
                        {[0, 1, 2, 3, 4, 5].map(i => {
                          const a = radarData.getAngle(i);
                          const x2 = radarData.cx + radarData.R * Math.cos(a);
                          const y2 = radarData.cy + radarData.R * Math.sin(a);
                          return (
                            <line
                              key={i}
                              x1={radarData.cx}
                              y1={radarData.cy}
                              x2={x2.toFixed(1)}
                              y2={y2.toFixed(1)}
                              className="stroke-slate-200 dark:stroke-slate-700/60"
                              strokeWidth="1"
                            />
                          );
                        })}

                        {/* Overlaid Team Polygons */}
                        {radarData.teamPolygons.map(tp => (
                          <g key={tp.teamNumber}>
                            <polygon
                              points={tp.polygonStr}
                              fill={tp.theme.hex}
                              fillOpacity="0.2"
                              stroke={tp.theme.hex}
                              strokeWidth="2.5"
                            />
                            {tp.points.map((pt, pIdx) => (
                              <circle
                                key={pIdx}
                                cx={pt.x.toFixed(1)}
                                cy={pt.y.toFixed(1)}
                                r="3.5"
                                fill={tp.theme.hex}
                                stroke="white"
                                strokeWidth="1.5"
                              />
                            ))}
                          </g>
                        ))}

                        {/* Axis Labels */}
                        {radarData.axisDefs.map((axis, i) => {
                          const a = radarData.getAngle(i);
                          const labelR = radarData.R + 24;
                          const lx = radarData.cx + labelR * Math.cos(a);
                          const ly = radarData.cy + labelR * Math.sin(a);
                          let textAnchor = 'middle';
                          let dy = '0.3em';
                          if (i === 0) dy = '-0.4em';
                          else if (i === 3) dy = '0.9em';
                          else if (i === 1 || i === 2) textAnchor = 'start';
                          else if (i === 4 || i === 5) textAnchor = 'end';

                          return (
                            <text
                              key={i}
                              x={lx.toFixed(1)}
                              y={ly.toFixed(1)}
                              textAnchor={textAnchor}
                              dy={dy}
                              className="text-[10px] font-black fill-slate-600 dark:fill-slate-300 tracking-tight"
                            >
                              {isVi ? axis.vi : axis.en}
                            </text>
                          );
                        })}
                      </svg>
                    </div>

                    {/* Chart Legend */}
                    <div className="flex flex-wrap items-center justify-center gap-4 mt-3 text-xs font-semibold">
                      {comparedData.map(tm => (
                        <div key={tm.teamNumber} className="flex items-center gap-1.5">
                          <span 
                            className="w-3 h-3 rounded-full inline-block border border-white dark:border-slate-800"
                            style={{ backgroundColor: tm.theme.hex }}
                          />
                          <span className={tm.theme.text}>{tm.teamNumber}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Visual 2: Comparative Progress Bars (OPR, Avg Score, Skills) */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-5">
                    
                    {/* OPR Comparative Bars */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-cyan-500" />
                          {t.visualOpr}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {comparedData.map(tm => {
                          const maxGroupOpr = leaders.opr || 1;
                          const barPct = Math.max(5, Math.min(100, (tm.opr / maxGroupOpr) * 100));
                          return (
                            <div key={tm.teamNumber} className="flex items-center gap-3">
                              <span className="text-xs font-mono font-bold w-16 text-slate-600 dark:text-slate-300 shrink-0">
                                {tm.teamNumber}
                              </span>
                              <div className="flex-1 h-3 rounded-full bg-slate-200 dark:bg-slate-700/60 overflow-hidden">
                                <div 
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{ width: `${barPct}%`, backgroundColor: tm.theme.hex }}
                                />
                              </div>
                              <span className="text-xs font-mono font-black text-slate-900 dark:text-white w-12 text-right">
                                {tm.opr.toFixed(1)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Avg Score Comparative Bars */}
                    <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-700/60">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-blue-500" />
                          {t.visualAvg}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {comparedData.map(tm => {
                          const maxGroupAvg = leaders.avgScore || 1;
                          const barPct = Math.max(5, Math.min(100, (tm.avgScore / maxGroupAvg) * 100));
                          return (
                            <div key={tm.teamNumber} className="flex items-center gap-3">
                              <span className="text-xs font-mono font-bold w-16 text-slate-600 dark:text-slate-300 shrink-0">
                                {tm.teamNumber}
                              </span>
                              <div className="flex-1 h-3 rounded-full bg-slate-200 dark:bg-slate-700/60 overflow-hidden">
                                <div 
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{ width: `${barPct}%`, backgroundColor: tm.theme.hex }}
                                />
                              </div>
                              <span className="text-xs font-mono font-black text-slate-900 dark:text-white w-12 text-right">
                                {tm.avgScore}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>

                  {/* Visual 3: Skills Breakdown Bars for Each Team */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-4">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-indigo-500" />
                      {t.visualSkills}
                    </h3>

                    <div className="space-y-4">
                      {comparedData.map(tm => (
                        <div key={tm.teamNumber} className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black font-mono text-cyan-600 dark:text-cyan-400">
                              {tm.teamNumber} {tm.teamName !== tm.teamNumber && `(${tm.teamName})`}
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                              {tm.totalSkills} {t.pts}
                            </span>
                          </div>
                          <SkillsBar
                            driverScore={tm.driverScore}
                            programmingScore={tm.progScore}
                            totalScore={tm.totalSkills}
                            showLabels={true}
                            showBadge={false}
                            showPercentages={true}
                            lang={lang}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 3: ALLIANCE SYNERGY & COMPATIBILITY */}
              {activeTab === 'synergy' && synergyData && (
                <div className="space-y-6">
                  
                  {/* Projected Alliance Score Card */}
                  {selectedTeams.length === 2 && (
                    <div className="p-6 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 space-y-2 text-center">
                      <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
                        <Flame className="w-4 h-4" />
                        {t.projectedScore}
                      </span>
                      <p className="text-4xl sm:text-5xl font-black font-mono text-cyan-600 dark:text-cyan-400">
                        {synergyData.projectedScore} <span className="text-base font-bold">{t.pts}</span>
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                        {t.projectedDesc} ({comparedData[0].teamNumber}: {comparedData[0].opr.toFixed(1)} + {comparedData[1].teamNumber}: {comparedData[1].opr.toFixed(1)})
                      </p>
                    </div>
                  )}

                  {/* Skills Complementarity Insight Card */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        {t.complementaryTitle}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        {synergyData.synergyType === 'complementary' ? t.highSynergyBadge : t.balancedBadge}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                      {synergyData.synergyExplanation}
                    </p>
                  </div>

                  {/* Shared Matches Played Together */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-sky-500" />
                      {t.sharedMatchesTitle}
                    </h3>

                    {synergyData.sharedMatches.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800">
                        <p>{t.noSharedMatches}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {synergyData.sharedMatches.map((sm, smIdx) => (
                          <div 
                            key={smIdx}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 flex items-center justify-between shadow-sm"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-slate-900 dark:text-white">
                                {sm.matchName}
                              </span>
                              <span className="text-xs text-slate-400">
                                ({sm.teams.join(' & ')})
                              </span>
                            </div>

                            <div className="text-right">
                              {sm.isScored ? (
                                <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800">
                                  {sm.score} {t.pts}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400 italic">Scheduled</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </>
          )}

        </div>

      </div>
    </div>
  );
}
