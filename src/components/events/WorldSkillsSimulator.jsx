import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  Target, 
  Award, 
  Sparkles, 
  TrendingUp, 
  Gamepad2, 
  Code2, 
  ArrowRight, 
  ChevronRight, 
  Info, 
  X, 
  Flame, 
  Zap, 
  CheckCircle2, 
  HelpCircle, 
  RotateCcw, 
  Sliders, 
  ShieldAlert,
  ArrowUpRight,
  Medal,
  RefreshCw
} from 'lucide-react';
import { getSeasonSkills, DEFAULT_SEASON_ID } from '../../utils/eventsApi';

// Default benchmark baseline distribution for VIQRC Level Up (Season 203)
// Derived from official season skills distribution patterns (used when offline or API empty)
export const BENCHMARK_SKILLS_DISTRIBUTION = Object.freeze([
  { rank: 1, totalScore: 212, progScore: 106, driverScore: 106, teamNumber: '79813J', percentile: 'Top 0.1%' },
  { rank: 5, totalScore: 188, progScore: 94, driverScore: 94, teamNumber: 'BENCH_5', percentile: 'Top 0.5%' },
  { rank: 10, totalScore: 168, progScore: 84, driverScore: 84, teamNumber: 'BENCH_10', percentile: 'Top 1%' },
  { rank: 25, totalScore: 142, progScore: 70, driverScore: 72, teamNumber: 'BENCH_25', percentile: 'Top 2.5%' },
  { rank: 50, totalScore: 122, progScore: 58, driverScore: 64, teamNumber: 'BENCH_50', percentile: 'Top 5%' },
  { rank: 100, totalScore: 98, progScore: 44, driverScore: 54, teamNumber: 'BENCH_100', percentile: 'Top 10%' },
  { rank: 250, totalScore: 74, progScore: 30, driverScore: 44, teamNumber: 'BENCH_250', percentile: 'Top 25%' },
  { rank: 500, totalScore: 52, progScore: 18, driverScore: 34, teamNumber: 'BENCH_500', percentile: 'Top 50%' },
  { rank: 750, totalScore: 34, progScore: 8, driverScore: 26, teamNumber: 'BENCH_750', percentile: 'Top 75%' },
  { rank: 1000, totalScore: 18, progScore: 0, driverScore: 18, teamNumber: 'BENCH_1000', percentile: 'Top 90%' }
]);

export const TOTAL_BENCHMARK_TEAMS = 1250;

const I18N = {
  en: {
    modalTitle: 'World Skills Simulator',
    modalSubtitle: 'Interactive "Where would I place?" rank simulator for VIQRC Level Up',
    driverSkills: 'Driver Skills',
    driverDesc: '60-second human driver challenge score',
    autoSkills: 'Autonomous Coding',
    autoDesc: '60-second autonomous program challenge score',
    totalSimulated: 'Simulated Total Skills',
    points: 'pts',
    globalRank: 'Global Skills Rank',
    eventRank: 'Event Skills Rank',
    percentileBadge: 'Percentile Standing',
    gapToFirst: 'Gap to World #1',
    gapToNextTier: 'Next Milestone',
    eventHighComparison: 'Current Event Comparison',
    howToLevelUp: 'How to Level Up: Strategy Coaching',
    tierLadderTitle: 'Season Skills Score Ladder',
    tierRank: 'Rank Tier',
    tierScore: 'Score Range',
    tierPercentile: 'Percentile',
    quickPresets: 'Quick Presets',
    presetBronze: 'Bronze (50)',
    presetSilver: 'Silver (90)',
    presetGold: 'Gold (130)',
    presetWorld: 'World Class (170)',
    presetEventHigh: 'Event Leader',
    presetReset: 'Reset (0)',
    worldNumberOne: 'Leading the World!',
    worldNumberOneSub: 'Your score equals or exceeds the current World #1 Skills score!',
    ptsNeeded: 'pts needed for',
    ptsAhead: 'pts ahead of',
    ptsBehind: 'pts behind',
    inThisEvent: 'in this event',
    eventLeaderIs: 'Event leader',
    noEventSkills: 'No event skills scores recorded yet.',
    loadingSeasonData: 'Loading current global season leaderboard...',
    usingRealData: 'Evaluated against live RobotEvents Season standings',
    usingBenchmarkData: 'Evaluated against official Level Up season benchmark baseline',
    close: 'Close',
    autoWarningTitle: 'Autonomous Coding Score is 0!',
    autoWarningDesc: 'Autonomous runs account for 50% of your Total Skills score. Writing even a basic autonomous routine to score preload bean bags into Level 1 or 2 can quickly net 15-30 points with minimal coding.',
    imbalanceDriverTitle: 'Driver-Heavy Split',
    imbalanceDriverDesc: 'Your Driver score is carrying your total score. Because Driver and Programming have equal 1:1 weight, spending 2 practice sessions improving your autonomous code will boost your World Rank significantly faster than pushing for marginal driver gains.',
    imbalanceAutoTitle: 'Autonomous-Heavy Split',
    imbalanceAutoDesc: 'Great programming routine! Your autonomous code outscores your driving. Focus on driver practice, especially rapid bag extraction from pyramids and smooth driver switches at 35s-25s.',
    balancedTitle: 'Well-Balanced Alliance',
    balancedDesc: 'Excellent balance between Driver and Autonomous skills! To break into the next tier, focus on scoring yellow bean bags into Level 4 (16 pts each) and clearing all floor goals.',
    eliteTitle: 'World Championship Caliber!',
    eliteDesc: 'Outstanding score! You are performing in the top echelon globally. At this competitive tier, ties are very common — ensure your team utilizes Skills Stop Time (<RSC3>) to secure tiebreaker advantage.',
    beginnerTitle: 'Building Fundamentals',
    beginnerDesc: 'Focus on consistent intake mechanics and pushing bags into the floor goal. Always keep the 1-bag possession rule (<SG6>) in mind during cycling.'
  },
  vi: {
    modalTitle: 'Mô Phỏng Xếp Hạng Kỹ Năng Thế Giới',
    modalSubtitle: 'Công cụ mô phỏng "Tôi sẽ xếp thứ mấy?" cho mùa giải VEX IQ Level Up',
    driverSkills: 'Kỹ Năng Lái Tay (Driver)',
    driverDesc: 'Điểm thử thách lái tay 60 giây',
    autoSkills: 'Lập Trình Tự Hành (Autonomous)',
    autoDesc: 'Điểm thử thách lập trình tự hành 60 giây',
    totalSimulated: 'Tổng Điểm Kỹ Năng Dự Tính',
    points: 'điểm',
    globalRank: 'Hạng Kỹ Năng Thế Giới',
    eventRank: 'Hạng Trong Giải Đấu',
    percentileBadge: 'Nhóm Phần Trăm (Percentile)',
    gapToFirst: 'Khoảng cách tới Top 1 Thế giới',
    gapToNextTier: 'Mục tiêu tiếp theo',
    eventHighComparison: 'So sánh với kỷ lục giải hiện tại',
    howToLevelUp: 'Bí Quyết Lên Cấp (How to Level Up)',
    tierLadderTitle: 'Thang Điểm Kỹ Năng Mùa Giải',
    tierRank: 'Phân hạng',
    tierScore: 'Khoảng điểm',
    tierPercentile: 'Tỉ lệ %',
    quickPresets: 'Mức điểm mẫu',
    presetBronze: 'Đồng (50)',
    presetSilver: 'Bạc (90)',
    presetGold: 'Vàng (130)',
    presetWorld: 'Đẳng cấp thế giới (170)',
    presetEventHigh: 'Dẫn đầu giải',
    presetReset: 'Đặt lại (0)',
    worldNumberOne: 'Dẫn Đầu Thế Giới!',
    worldNumberOneSub: 'Điểm của bạn bằng hoặc vượt điểm Top 1 Skills thế giới hiện tại!',
    ptsNeeded: 'điểm nữa để đạt',
    ptsAhead: 'điểm cao hơn',
    ptsBehind: 'điểm sau',
    inThisEvent: 'trong giải đấu này',
    eventLeaderIs: 'Đội dẫn đầu giải',
    noEventSkills: 'Chưa có kết quả Skills nào tại giải.',
    loadingSeasonData: 'Đang tải bảng xếp hạng mùa giải toàn cầu...',
    usingRealData: 'Tính toán dựa trên bảng xếp hạng RobotEvents mùa giải trực tiếp',
    usingBenchmarkData: 'Tính toán dựa trên chuẩn phân phối điểm Level Up mùa giải',
    close: 'Đóng',
    autoWarningTitle: 'Điểm Lập Trình Tự Hành đang là 0!',
    autoWarningDesc: 'Lập trình tự hành chiếm tới 50% tổng điểm Skills của bạn. Chỉ cần viết một đoạn code cơ bản để đẩy các túi hạt nạp sẵn vào tầng 1 hoặc tầng 2 là bạn đã có ngay 15-30 điểm cực kỳ dễ dàng.',
    imbalanceDriverTitle: 'Điểm Lái Tay Chiếm Áp Đảo',
    imbalanceDriverDesc: 'Điểm lái tay đang gánh phần lớn tổng điểm của bạn. Vì Driver và Auto có tỉ trọng 1:1 ngang nhau, chỉ cần dành 2 buổi tập code tự hành sẽ giúp bạn nhảy vọt thứ hạng thế giới nhanh hơn nhiều so với việc cố gồng điểm lái.',
    imbalanceAutoTitle: 'Điểm Tự Hành Vượt Trội',
    imbalanceAutoDesc: 'Chương trình tự hành của bạn rất xuất sắc! Tuy nhiên kỹ năng lái tay đang hụt hơi. Hãy tập trung luyện chu kỳ lái, đặc biệt là kỹ năng gắp túi hạt từ kim tự tháp và phối hợp đổi tay lái chuẩn ở giây 35s-25s.',
    balancedTitle: 'Cân Bằng Hoàn Hảo',
    balancedDesc: 'Sự cân bằng tuyệt vời giữa Lái tay và Tự hành! Để vươn lên nấc thang tiếp theo, hãy tập trung đưa các túi hạt màu vàng lên tầng 4 (16 điểm/túi) và quét sạch các mục tiêu sàn.',
    eliteTitle: 'Đẳng Cấp Giải Vô Địch Thế Giới!',
    eliteDesc: 'Điểm số phi thường! Bạn đang đứng trong nhóm tinh anh hàng đầu thế giới. Ở đẳng cấp này các đội rất dễ bằng điểm nhau — hãy chú trọng ghi nhận Skills Stop Time (<RSC3>) để giành lợi thế phụ.',
    beginnerTitle: 'Xây Dựng Nền Tảng Cơ Bản',
    beginnerDesc: 'Hãy tập trung vào cơ cấu hút hạt ổn định và đẩy các túi hạt vào mục tiêu sàn. Luôn tuân thủ quy định giữ tối đa 1 túi hạt trên robot (<SG6>).'
  }
};

/**
 * Normalizes an array of skills entries into uniform { totalScore, progScore, driverScore, rank, teamNumber }
 */
export function extractSkillsArray(rawList = []) {
  if (!Array.isArray(rawList) || rawList.length === 0) return [];

  return rawList
    .map((item, idx) => {
      const teamObj = item.team || {};
      const teamNumber = String(teamObj.code || teamObj.name || teamObj.number || item.team_number || '').trim().toUpperCase();
      const driverScore = Number(item.driverScore ?? item.scores?.driver ?? item.scores?.maxDriver ?? item.driver ?? 0);
      const progScore = Number(item.progScore ?? item.scores?.programming ?? item.scores?.maxProgramming ?? item.programming ?? 0);
      const totalScore = Number(item.totalScore ?? item.score ?? item.scores?.score ?? (driverScore + progScore));

      return {
        id: item.id || idx,
        rank: Number(item.rank || idx + 1),
        teamNumber: teamNumber || `TEAM_${idx + 1}`,
        totalScore,
        progScore,
        driverScore
      };
    })
    .sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (b.progScore !== a.progScore) return b.progScore - a.progScore;
      return b.driverScore - a.driverScore;
    });
}

/**
 * Calculates simulated rank against a sorted skills leaderboard
 */
export function calculateSimulatedRank(simTotal, simProg, simDriver, sortedList, totalPopulation = sortedList.length) {
  if (!sortedList || sortedList.length === 0) {
    // Interpolate against benchmark formula
    return interpolateBenchmarkRank(simTotal, simProg, simDriver);
  }

  const effectivePop = Math.max(totalPopulation, sortedList.length);

  // Check if simulated score beats or ties leader
  const leader = sortedList[0];
  if (simTotal > leader.totalScore || (simTotal === leader.totalScore && simProg >= leader.progScore)) {
    return {
      rank: 1,
      percentile: 'Top 0.1%',
      percentileNumeric: 0.1,
      totalTeams: effectivePop,
      gapToFirst: 0,
      leaderScore: leader.totalScore,
      leaderTeam: leader.teamNumber,
      nextTier: null
    };
  }

  // Find placement in sorted array
  let rank = 1;
  for (let i = 0; i < sortedList.length; i++) {
    const item = sortedList[i];
    if (simTotal > item.totalScore) {
      rank = i + 1;
      break;
    } else if (simTotal === item.totalScore) {
      // Tie breaker: Programming, then Driver
      if (simProg > item.progScore || (simProg === item.progScore && simDriver >= item.driverScore)) {
        rank = i + 1;
        break;
      }
    }
    if (i === sortedList.length - 1) {
      rank = sortedList.length + 1;
    }
  }

  // If sortedList is a sample and effectivePop is larger, scale rank proportionally
  if (effectivePop > sortedList.length && rank > sortedList.length) {
    const ratio = Math.max(0, (sortedList[sortedList.length - 1].totalScore - simTotal) / 100);
    rank = Math.min(effectivePop, Math.round(sortedList.length + ratio * (effectivePop - sortedList.length)));
  }

  const rawPercentile = Math.max(0.1, Math.min(99.9, ((rank - 0.5) / effectivePop) * 100));
  let percentileBadge = `Top ${Math.ceil(rawPercentile)}%`;
  if (rawPercentile < 1) percentileBadge = 'Top 1%';
  else if (rawPercentile <= 5) percentileBadge = 'Top 5%';
  else if (rawPercentile <= 10) percentileBadge = 'Top 10%';
  else if (rawPercentile <= 25) percentileBadge = 'Top 25%';
  else if (rawPercentile <= 50) percentileBadge = 'Top 50%';

  // Determine next milestone tier
  let nextTier = null;
  const milestones = [1, 5, 10, 25, 50, 100, 250, 500];
  for (const m of milestones) {
    if (rank > m) {
      const targetItem = sortedList[Math.min(m - 1, sortedList.length - 1)];
      const targetScore = targetItem ? targetItem.totalScore + 1 : simTotal + 5;
      nextTier = {
        targetRank: m,
        pointsNeeded: Math.max(1, targetScore - simTotal),
        label: m === 1 ? 'World #1' : `Top ${m}`
      };
      break;
    }
  }

  return {
    rank,
    percentile: percentileBadge,
    percentileNumeric: rawPercentile,
    totalTeams: effectivePop,
    gapToFirst: Math.max(0, leader.totalScore - simTotal),
    leaderScore: leader.totalScore,
    leaderTeam: leader.teamNumber,
    nextTier
  };
}

/**
 * Fallback benchmark rank interpolation when offline or during early season
 */
function interpolateBenchmarkRank(total, prog, driver) {
  const bench = BENCHMARK_SKILLS_DISTRIBUTION;
  const pop = TOTAL_BENCHMARK_TEAMS;

  if (total >= bench[0].totalScore) {
    return {
      rank: 1,
      percentile: 'Top 0.1%',
      percentileNumeric: 0.1,
      totalTeams: pop,
      gapToFirst: 0,
      leaderScore: bench[0].totalScore,
      leaderTeam: bench[0].teamNumber,
      nextTier: null
    };
  }

  for (let i = 0; i < bench.length; i++) {
    if (total >= bench[i].totalScore) {
      const current = bench[i];
      const prev = bench[i - 1] || bench[0];
      const fraction = (prev.totalScore - total) / (prev.totalScore - current.totalScore || 1);
      const estimatedRank = Math.round(prev.rank + fraction * (current.rank - prev.rank));

      const rawPct = (estimatedRank / pop) * 100;
      let pct = current.percentile;

      let nextTier = null;
      if (i > 0) {
        nextTier = {
          targetRank: prev.rank,
          pointsNeeded: Math.max(1, prev.totalScore - total),
          label: prev.rank === 1 ? 'World #1' : `Top ${prev.rank}`
        };
      }

      return {
        rank: estimatedRank,
        percentile: pct,
        percentileNumeric: rawPct,
        totalTeams: pop,
        gapToFirst: Math.max(0, bench[0].totalScore - total),
        leaderScore: bench[0].totalScore,
        leaderTeam: bench[0].teamNumber,
        nextTier
      };
    }
  }

  // Below lowest benchmark tier
  const last = bench[bench.length - 1];
  const rank = Math.min(pop, last.rank + Math.round((last.totalScore - total) * 10));
  return {
    rank,
    percentile: 'Top 95%',
    percentileNumeric: 95,
    totalTeams: pop,
    gapToFirst: bench[0].totalScore - total,
    leaderScore: bench[0].totalScore,
    leaderTeam: bench[0].teamNumber,
    nextTier: {
      targetRank: last.rank,
      pointsNeeded: Math.max(1, last.totalScore - total),
      label: `Top ${last.rank}`
    }
  };
}

/**
 * Intelligent strategy coaching recommendation generator
 */
export function getStrategyCoaching(driverScore, progScore, t) {
  const total = driverScore + progScore;

  if (total === 0) {
    return {
      type: 'beginner',
      title: t.beginnerTitle,
      desc: t.beginnerDesc,
      icon: Target,
      color: 'slate'
    };
  }

  if (progScore === 0) {
    return {
      type: 'auto_zero',
      title: t.autoWarningTitle,
      desc: t.autoWarningDesc,
      icon: ShieldAlert,
      color: 'amber'
    };
  }

  if (progScore < driverScore * 0.35) {
    return {
      type: 'imbalance_driver',
      title: t.imbalanceDriverTitle,
      desc: t.imbalanceDriverDesc,
      icon: Zap,
      color: 'amber'
    };
  }

  if (driverScore < progScore * 0.35) {
    return {
      type: 'imbalance_auto',
      title: t.imbalanceAutoTitle,
      desc: t.imbalanceAutoDesc,
      icon: Gamepad2,
      color: 'sky'
    };
  }

  if (total >= 160) {
    return {
      type: 'elite',
      title: t.eliteTitle,
      desc: t.eliteDesc,
      icon: Trophy,
      color: 'emerald'
    };
  }

  return {
    type: 'balanced',
    title: t.balancedTitle,
    desc: t.balancedDesc,
    icon: Sparkles,
    color: 'emerald'
  };
}

// ============================================================================
// Main Component: WorldSkillsSimulator
// ============================================================================
export default function WorldSkillsSimulator({
  isOpen = true,
  onClose,
  event = null,
  eventSkills = [],
  initialDriverScore = 40,
  initialProgScore = 30,
  lang = 'en'
}) {
  const t = I18N[lang] || I18N.en;

  // Score Input States
  const [driverScore, setDriverScore] = useState(initialDriverScore);
  const [progScore, setProgScore] = useState(initialProgScore);

  // Global Season Standings State
  const [seasonSkillsList, setSeasonSkillsList] = useState([]);
  const [loadingSeason, setLoadingSeason] = useState(true);
  const [dataSource, setDataSource] = useState('benchmark'); // 'real' | 'benchmark'

  // Fetch Season Skills from API on mount
  useEffect(() => {
    let isMounted = true;

    async function fetchLeaderboard() {
      try {
        setLoadingSeason(true);
        const res = await getSeasonSkills(DEFAULT_SEASON_ID, { per_page: 250 });
        const list = res?.data || (Array.isArray(res) ? res : []);
        if (isMounted) {
          if (list.length > 0) {
            const normalized = extractSkillsArray(list);
            setSeasonSkillsList(normalized);
            setDataSource('real');
          } else {
            setDataSource('benchmark');
          }
        }
      } catch (err) {
        if (isMounted) {
          setDataSource('benchmark');
        }
      } finally {
        if (isMounted) {
          setLoadingSeason(false);
        }
      }
    }

    fetchLeaderboard();
    return () => { isMounted = false; };
  }, []);

  // Total Score & Split
  const totalScore = driverScore + progScore;
  const driverRatio = totalScore > 0 ? Math.round((driverScore / totalScore) * 100) : 50;
  const progRatio = totalScore > 0 ? 100 - driverRatio : 50;

  // Global Simulation
  const globalSim = useMemo(() => {
    return calculateSimulatedRank(
      totalScore,
      progScore,
      driverScore,
      seasonSkillsList,
      seasonSkillsList.length || TOTAL_BENCHMARK_TEAMS
    );
  }, [totalScore, progScore, driverScore, seasonSkillsList]);

  // Event Simulation (if inside an active event)
  const normalizedEventSkills = useMemo(() => {
    return extractSkillsArray(eventSkills);
  }, [eventSkills]);

  const eventSim = useMemo(() => {
    if (!normalizedEventSkills || normalizedEventSkills.length === 0) return null;
    return calculateSimulatedRank(
      totalScore,
      progScore,
      driverScore,
      normalizedEventSkills,
      normalizedEventSkills.length
    );
  }, [totalScore, progScore, driverScore, normalizedEventSkills]);

  // Strategy Coaching Advice
  const coaching = useMemo(() => {
    return getStrategyCoaching(driverScore, progScore, t);
  }, [driverScore, progScore, t]);

  // Quick Preset Handlers
  const handlePreset = (driver, prog) => {
    setDriverScore(Math.max(0, driver));
    setProgScore(Math.max(0, prog));
  };

  const handleStepDriver = (delta) => {
    setDriverScore(prev => Math.max(0, Math.min(190, prev + delta)));
  };

  const handleStepProg = (delta) => {
    setProgScore(prev => Math.max(0, Math.min(190, prev + delta)));
  };

  // Event High Preset
  const eventLeader = normalizedEventSkills[0];

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="skills-simulator-title"
    >
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full p-5 sm:p-7 space-y-6 my-auto text-slate-800 dark:text-slate-100"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-cyan-500/20">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 id="skills-simulator-title" className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                {t.modalTitle}
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300">
                  VIQRC Level Up
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t.modalSubtitle}
              </p>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={t.close}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Data Source Notice */}
        <div className="flex items-center justify-between text-xs px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            {dataSource === 'real' ? t.usingRealData : t.usingBenchmarkData}
          </span>
          {loadingSeason && (
            <span className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 font-medium">
              <RefreshCw className="w-3 h-3 animate-spin" />
              {t.loadingSeasonData}
            </span>
          )}
        </div>

        {/* Dual Score Input Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Driver Skills Input */}
          <div className="p-4 rounded-2xl bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-100 dark:border-cyan-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
                <Gamepad2 className="w-4 h-4 text-cyan-500" />
                {t.driverSkills}
              </span>
              <span className="text-xl font-black text-cyan-600 dark:text-cyan-400 font-mono">
                {driverScore} <span className="text-xs font-bold text-slate-400">{t.points}</span>
              </span>
            </div>

            {/* Range Slider */}
            <input
              type="range"
              min="0"
              max="160"
              value={driverScore}
              onChange={(e) => setDriverScore(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer min-h-[36px]"
              aria-label={t.driverSkills}
            />

            {/* Steppers */}
            <div className="flex items-center justify-between gap-1.5 pt-1">
              {[-10, -1, +1, +10].map((step) => (
                <button
                  key={`driver-step-${step}`}
                  type="button"
                  onClick={() => handleStepDriver(step)}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors min-h-[44px]"
                >
                  {step > 0 ? `+${step}` : step}
                </button>
              ))}
            </div>
          </div>

          {/* Autonomous Coding Input */}
          <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                <Code2 className="w-4 h-4 text-indigo-500" />
                {t.autoSkills}
              </span>
              <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                {progScore} <span className="text-xs font-bold text-slate-400">{t.points}</span>
              </span>
            </div>

            {/* Range Slider */}
            <input
              type="range"
              min="0"
              max="160"
              value={progScore}
              onChange={(e) => setProgScore(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer min-h-[36px]"
              aria-label={t.autoSkills}
            />

            {/* Steppers */}
            <div className="flex items-center justify-between gap-1.5 pt-1">
              {[-10, -1, +1, +10].map((step) => (
                <button
                  key={`auto-step-${step}`}
                  type="button"
                  onClick={() => handleStepProg(step)}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors min-h-[44px]"
                >
                  {step > 0 ? `+${step}` : step}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Quick Presets Bar */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5" />
            {t.quickPresets}:
          </span>
          <button
            type="button"
            onClick={() => handlePreset(28, 22)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 min-h-[36px]"
          >
            {t.presetBronze}
          </button>
          <button
            type="button"
            onClick={() => handlePreset(50, 40)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 min-h-[36px]"
          >
            {t.presetSilver}
          </button>
          <button
            type="button"
            onClick={() => handlePreset(70, 60)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 min-h-[36px]"
          >
            {t.presetGold}
          </button>
          <button
            type="button"
            onClick={() => handlePreset(92, 78)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 min-h-[36px]"
          >
            {t.presetWorld}
          </button>
          {eventLeader && (
            <button
              type="button"
              onClick={() => handlePreset(eventLeader.driverScore, eventLeader.progScore)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 hover:bg-cyan-100 min-h-[36px]"
            >
              {t.presetEventHigh} ({eventLeader.totalScore})
            </button>
          )}
          <button
            type="button"
            onClick={() => handlePreset(0, 0)}
            className="px-2 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 min-h-[36px]"
          >
            {t.presetReset}
          </button>
        </div>

        {/* Primary Results Hero Dashboard */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Trophy className="w-48 h-48" />
          </div>

          <div className="relative z-10 space-y-4">
            
            {/* Top Row: Total Score & World Rank */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-300">
                  {t.totalSimulated}
                </span>
                <div className="text-4xl sm:text-5xl font-black tracking-tight text-white font-mono flex items-baseline gap-2 mt-0.5">
                  {totalScore}
                  <span className="text-sm font-bold text-indigo-300">{t.points}</span>
                </div>
              </div>

              {/* Simulated Global Rank & Percentile Pill */}
              <div className="flex items-center gap-3">
                <div className="text-left sm:text-right">
                  <span className="text-xs uppercase font-extrabold tracking-widest text-cyan-300 block">
                    {t.globalRank}
                  </span>
                  <div className="text-3xl sm:text-4xl font-black text-cyan-400 font-mono">
                    #{globalSim.rank}
                  </div>
                </div>

                <div className="px-3 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center">
                  <span className="text-xs uppercase font-bold text-indigo-200 block">
                    {t.percentileBadge}
                  </span>
                  <span className="text-base font-black text-emerald-400">
                    {globalSim.percentile}
                  </span>
                </div>
              </div>
            </div>

            {/* Split Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1 text-cyan-400">
                  <Gamepad2 className="w-3.5 h-3.5" />
                  Driver: {driverScore} pts ({driverRatio}%)
                </span>
                <span className="flex items-center gap-1 text-indigo-400">
                  <Code2 className="w-3.5 h-3.5" />
                  Auto: {progScore} pts ({progRatio}%)
                </span>
              </div>
              <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden flex">
                <div 
                  className="bg-cyan-500 transition-all duration-300"
                  style={{ width: `${driverRatio}%` }}
                />
                <div 
                  className="bg-indigo-500 transition-all duration-300"
                  style={{ width: `${progRatio}%` }}
                />
              </div>
            </div>

            {/* Gaps & Comparison Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              
              {/* Gap to World #1 */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                  <Medal className="w-4 h-4" />
                </div>
                <div className="text-xs leading-snug">
                  <span className="text-slate-400 block">{t.gapToFirst}</span>
                  {globalSim.rank === 1 ? (
                    <span className="font-bold text-amber-400">{t.worldNumberOne}</span>
                  ) : (
                    <span className="font-bold text-white">
                      -{globalSim.gapToFirst} pts ({globalSim.leaderScore} by #{globalSim.leaderTeam})
                    </span>
                  )}
                </div>
              </div>

              {/* Gap to Next Rank Tier */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="text-xs leading-snug">
                  <span className="text-slate-400 block">{t.gapToNextTier}</span>
                  {globalSim.nextTier ? (
                    <span className="font-bold text-cyan-300">
                      +{globalSim.nextTier.pointsNeeded} {t.ptsNeeded} {globalSim.nextTier.label}
                    </span>
                  ) : (
                    <span className="font-bold text-emerald-400">{t.worldNumberOne}</span>
                  )}
                </div>
              </div>

            </div>

            {/* Event Comparison (if inside an active event with skills data) */}
            {eventSim && (
              <div className="p-3 rounded-xl bg-cyan-950/60 border border-cyan-800/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span className="text-slate-300">
                    {t.eventRank}: <strong className="text-cyan-300 font-mono text-sm">#{eventSim.rank}</strong> {t.inThisEvent}
                  </span>
                </div>
                <div className="font-bold text-cyan-400">
                  {eventLeader ? `${t.eventLeaderIs} ${eventLeader.teamNumber} (${eventLeader.totalScore} pts)` : ''}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Strategy Coaching Advice ("How to Level Up") */}
        <div className={`p-4 rounded-2xl border ${
          coaching.color === 'emerald' 
            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100'
            : coaching.color === 'amber'
            ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-100'
            : 'bg-sky-50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800 text-sky-950 dark:text-sky-100'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl flex-shrink-0 ${
              coaching.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
              coaching.color === 'amber' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' :
              'bg-sky-500/20 text-sky-600 dark:text-sky-400'
            }`}>
              <coaching.icon className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black flex items-center gap-2">
                {coaching.title}
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/60 dark:bg-slate-800/80">
                  {t.howToLevelUp}
                </span>
              </h4>
              <p className="text-xs leading-relaxed opacity-90">
                {coaching.desc}
              </p>
            </div>
          </div>
        </div>

        {/* Tier Ladder Mini-Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 px-1">
            <span className="flex items-center gap-1">
              <Award className="w-3.5 h-3.5" />
              {t.tierLadderTitle}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: 'Top 1%', range: '168+ pts', active: totalScore >= 168 },
              { label: 'Top 5%', range: '122 - 167', active: totalScore >= 122 && totalScore < 168 },
              { label: 'Top 10%', range: '98 - 121', active: totalScore >= 98 && totalScore < 122 },
              { label: 'Top 25%', range: '74 - 97', active: totalScore >= 74 && totalScore < 98 }
            ].map((tier) => (
              <div 
                key={tier.label}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  tier.active
                    ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-500 text-cyan-800 dark:text-cyan-200 ring-2 ring-cyan-500/30 font-black'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="text-xs font-extrabold">{tier.label}</div>
                <div className="text-[11px] font-mono opacity-80 mt-0.5">{tier.range}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Close Button Footer */}
        {onClose && (
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs shadow-md transition-all min-h-[44px]"
            >
              {t.close}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
