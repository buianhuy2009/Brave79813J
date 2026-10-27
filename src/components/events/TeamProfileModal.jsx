import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  X, 
  Star, 
  Award, 
  Trophy, 
  Target, 
  TrendingUp, 
  Activity, 
  Users, 
  MapPin, 
  School, 
  ExternalLink, 
  GitCompare, 
  Bell, 
  Sparkles, 
  Clock, 
  ChevronRight, 
  Info, 
  Percent, 
  Flame,
  CheckCircle2,
  Calendar,
  FileText,
  Check,
  Tag,
  Trash2
} from 'lucide-react';
import { isFavorite, toggleFavorite, subscribeToStorage, getTeamNotes, setTeamNotes, toggleScoutingTag } from '../../utils/eventsStorage';
import { calculateOPR, parseMatch, normalizeTeamKey } from '../../utils/opr';
import { getTeam, getTeamSkills } from '../../utils/eventsApi';
import RadarChart from './charts/RadarChart';
import SkillsBar from './charts/SkillsBar';
import TrendChart from './charts/TrendChart';
import { normalizeSkills } from './SkillsStandings';
import { getAwardCategory } from './AwardsList';
import { extractMatchAlliance } from './MatchSchedule';

const I18N = {
  en: {
    teamProfile: 'Team Scouting Profile',
    grade: 'Grade',
    location: 'Location',
    organization: 'School / Organization',
    oprTitle: 'Cooperative OPR',
    oprDesc: 'Offensive Power Rating (measured scoring contribution)',
    avgScore: 'Avg Match Score',
    highScore: 'High Score',
    eventRank: 'Division Rank',
    worldSkillsRank: 'World Skills Rank',
    countrySkillsRank: 'Country Skills Rank',
    winRate: 'Win Rate',
    record: 'W-L-T Record',
    matchesPlayed: 'Matches Played',
    skillsBreakdown: 'Skills Split & Attempts',
    performanceRadar: 'Performance Radar vs Division Median',
    scoreProgression: 'Match-by-Match Score Progression',
    matchHistory: 'Event Match History',
    awardsWon: 'Awards & Accolades',
    noAwardsYet: 'No official awards published for this team at this event yet.',
    noMatchesYet: 'No matches recorded for this team yet.',
    partner: 'Partner',
    score: 'Score',
    compareTeam: 'Compare',
    setQueueAlert: 'Queue Alert',
    robotEventsProfile: 'RobotEvents Page',
    close: 'Close',
    scheduled: 'Scheduled',
    played: 'Played',
    onField: 'On Field',
    pts: 'pts',
    attemptsUsed: 'Used',
    attemptsLeft: 'Left',
    driverSkills: 'Driver',
    progSkills: 'Autonomous Coding',
    totalSkills: 'Total Skills',
    qualMatch: 'Qual',
    finalsMatch: 'Finals',
    divisionMedian: 'Division Median',
    soloAlliance: 'Solo Alliance',
    loadingSeason: 'Fetching world standing...',
    unranked: 'Unranked',
    scoutingNotesTitle: 'Pit Scouting Notes',
    scoutingNotesDesc: 'Tactical observations, robot mechanisms, and alliance strategy',
    scoutingNotesPlaceholder: 'Record scouting observations for Team {team} (intake speed, autonomous reliability, Level 3-4 scoring, parking strategy)...',
    notesSaved: 'Saved to device',
    quickTags: 'Quick Pit Tags',
    clearNotes: 'Clear Notes'
  },
  vi: {
    teamProfile: 'Hồ Sơ Do Thám Đội Tuyển',
    grade: 'Cấp học',
    location: 'Khu vực',
    organization: 'Trường / Tổ chức',
    oprTitle: 'OPR Liên Minh',
    oprDesc: 'Chỉ số đóng góp điểm trung bình trong trận liên minh',
    avgScore: 'Điểm đấu TB',
    highScore: 'Kỷ lục điểm',
    eventRank: 'Hạng bảng đấu',
    worldSkillsRank: 'Hạng Skills Thế giới',
    countrySkillsRank: 'Hạng Skills Quốc gia',
    winRate: 'Tỉ lệ Thắng',
    record: 'Thành tích (T-B-H)',
    matchesPlayed: 'Số trận đã đấu',
    skillsBreakdown: 'Phân Bổ Kỹ Năng & Lượt Chạy',
    performanceRadar: 'Biểu Đồ Radar So Với Trung Vị',
    scoreProgression: 'Tiến Độ Điểm Số Từng Trận',
    matchHistory: 'Lịch Sử Thi Đấu Tại Giải',
    awardsWon: 'Giải Thưởng & Danh Hiệu',
    noAwardsYet: 'Chưa có giải thưởng chính thức nào cho đội tại sự kiện này.',
    noMatchesYet: 'Đội chưa thi đấu trận nào tại sự kiện này.',
    partner: 'Đồng đội',
    score: 'Điểm',
    compareTeam: 'So sánh',
    setQueueAlert: 'Báo giờ xếp hàng',
    robotEventsProfile: 'Trang RobotEvents',
    close: 'Đóng',
    scheduled: 'Sắp diễn ra',
    played: 'Đã đấu',
    onField: 'Đang đấu',
    pts: 'điểm',
    attemptsUsed: 'Đã chạy',
    attemptsLeft: 'Còn lại',
    driverSkills: 'Lái tay',
    progSkills: 'Lập trình Tự hành',
    totalSkills: 'Tổng điểm Skills',
    qualMatch: 'Vòng loại',
    finalsMatch: 'Chung kết',
    divisionMedian: 'Trung vị bảng',
    soloAlliance: 'Đấu đơn',
    loadingSeason: 'Đang tải hạng thế giới...',
    unranked: 'Chưa xếp hạng',
    scoutingNotesTitle: 'Ghi Chú Do Thám Khu Thi Đấu',
    scoutingNotesDesc: 'Đánh giá chiến thuật, cơ cấu robot và độ ăn ý khi chọn liên minh',
    scoutingNotesPlaceholder: 'Ghi chú do thám cho đội {team} (tốc độ nạp, độ ổn định auto, ghi điểm Level 3-4, kỹ năng đỗ xe)...',
    notesSaved: 'Đã lưu trên thiết bị',
    quickTags: 'Thẻ đánh giá nhanh',
    clearNotes: 'Xóa ghi chú'
  }
};

/**
 * Calculates the statistical median of a numeric array
 */
function calculateMedian(numbers = []) {
  const clean = numbers.filter(n => typeof n === 'number' && Number.isFinite(n)).sort((a, b) => a - b);
  if (clean.length === 0) return 0;
  const mid = Math.floor(clean.length / 2);
  return clean.length % 2 !== 0 ? clean[mid] : (clean[mid - 1] + clean[mid]) / 2;
}

/**
 * TeamProfileModal.jsx - Comprehensive Team Scouting & Performance Profile Dialog
 * 
 * Displays deep performance metrics, pure SVG charts (Radar, SkillsBar, Trend),
 * cooperative match history with alliance partners, awards, and quick actions.
 */
export default function TeamProfileModal({
  isOpen = true,
  onClose,
  teamIdentifier,
  event = null,
  division = null,
  matches = [],
  rankings = [],
  skills = [],
  teams = [],
  awards = [],
  oprMap = null,
  onSelectTeam = null,
  onOpenCompare = null,
  onOpenQueueAlert = null,
  onOpenSimulator = null,
  lang = 'en'
}) {
  const t = I18N[lang] || I18N.en;
  const isVi = lang === 'vi';

  // Normalize team number string (e.g. "79813J")
  const teamNumber = useMemo(() => {
    return normalizeTeamKey(teamIdentifier) || String(teamIdentifier || '').trim().toUpperCase();
  }, [teamIdentifier]);

  // Favorite Star State
  const [isFav, setIsFav] = useState(() => isFavorite('teams', teamNumber));

  // Background fetched Season World Skills details
  const [seasonDetails, setSeasonDetails] = useState({
    loading: false,
    worldRank: null,
    countryRank: null,
    seasonSkills: null
  });

  // Keep favorite and scouting notes in sync with storage updates
  useEffect(() => {
    setIsFav(isFavorite('teams', teamNumber));
    setScoutingNotes(getTeamNotes(teamNumber));
    const unsub = subscribeToStorage(detail => {
      if (detail.key === 'vexiq_live_favorites' || !detail.key) {
        setIsFav(isFavorite('teams', teamNumber));
      }
      if (detail.key === 'vexiq_live_scouting_notes' || !detail.key) {
        setScoutingNotes(getTeamNotes(teamNumber));
      }
    });
    return unsub;
  }, [teamNumber]);

  // Handle ESC key to dismiss modal
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

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = origOverflow;
    };
  }, [isOpen]);

  // 1. Resolve Team Metadata from registered teams list
  const teamMeta = useMemo(() => {
    if (!teamNumber) return {};
    const found = teams.find(tm => {
      const num = normalizeTeamKey(tm.number || tm.code || tm.team_name || tm.name || tm);
      return num === teamNumber;
    });
    return found || {};
  }, [teams, teamNumber]);

  const teamName = teamMeta.team_name || teamMeta.name || teamNumber;
  const organization = teamMeta.organization || teamMeta.school_name || teamMeta.affiliation || '';
  const city = teamMeta.location?.city || teamMeta.city || '';
  const region = teamMeta.location?.region || teamMeta.region || '';
  const country = teamMeta.location?.country || teamMeta.country || '';
  const locationStr = [city, region, country].filter(Boolean).join(', ');
  const grade = teamMeta.grade || 'Middle School';

  // 2. Resolve Team Division Qualification Ranking
  const rankingEntry = useMemo(() => {
    if (!Array.isArray(rankings) || !teamNumber) return null;
    return rankings.find(r => {
      const num = normalizeTeamKey(r.team?.name || r.team?.code || r.team_number || r.team);
      return num === teamNumber;
    }) || null;
  }, [rankings, teamNumber]);

  // 3. Resolve Team Skills Standings
  const normalizedSkillsList = useMemo(() => {
    return normalizeSkills(skills, teams);
  }, [skills, teams]);

  const skillsEntry = useMemo(() => {
    if (!teamNumber) return null;
    return normalizedSkillsList.find(s => s.teamNumber === teamNumber) || null;
  }, [normalizedSkillsList, teamNumber]);

  // 4. Resolve Cooperative OPR
  const resolvedOprMap = useMemo(() => {
    if (oprMap && Object.keys(oprMap).length > 0) return oprMap;
    return calculateOPR(teams, matches);
  }, [oprMap, teams, matches]);

  const teamOpr = typeof resolvedOprMap[teamNumber] === 'number' 
    ? resolvedOprMap[teamNumber] 
    : 0;

  // 5. Resolve Team Match History at this event
  const teamMatches = useMemo(() => {
    if (!Array.isArray(matches) || !teamNumber) return [];

    const list = [];
    for (const m of matches) {
      const alliance = extractMatchAlliance(m);
      const isMyMatch = alliance.teams.some(tItem => tItem.number === teamNumber);
      if (!isMyMatch) continue;

      const partnerItem = alliance.teams.find(tItem => tItem.number !== teamNumber);
      const partnerNumber = partnerItem ? partnerItem.number : null;
      const partnerName = partnerItem ? partnerItem.name : '';

      list.push({
        raw: m,
        matchName: alliance.matchName,
        roundName: alliance.roundName,
        field: alliance.field,
        scheduledTime: alliance.scheduledTime,
        isScored: alliance.isScored,
        score: alliance.score,
        isOnField: alliance.isOnField,
        partnerNumber,
        partnerName,
        breakdown: alliance.breakdown
      });
    }

    return list;
  }, [matches, teamNumber]);

  // 6. Trend Chart Progression Data
  const trendData = useMemo(() => {
    return teamMatches
      .filter(m => m.isScored)
      .map(m => ({
        label: m.matchName,
        score: m.score,
        partner: m.partnerNumber || t.soloAlliance
      }));
  }, [teamMatches, t.soloAlliance]);

  // 7. Calculate Statistical Metrics
  const wins = rankingEntry?.wins ?? 0;
  const losses = rankingEntry?.losses ?? 0;
  const ties = rankingEntry?.ties ?? 0;
  const matchesPlayed = rankingEntry?.played ?? (wins + losses + ties);
  const winRatePct = matchesPlayed > 0 ? Math.round(((wins + ties * 0.5) / matchesPlayed) * 100) : 0;

  const avgMatchScore = rankingEntry?.average_points !== undefined 
    ? Number(rankingEntry.average_points)
    : (rankingEntry?.avg_score !== undefined 
        ? Number(rankingEntry.avg_score)
        : (trendData.length > 0 ? Math.round((trendData.reduce((acc, d) => acc + d.score, 0) / trendData.length) * 10) / 10 : 0));

  const highMatchScore = rankingEntry?.high_score !== undefined 
    ? Number(rankingEntry.high_score)
    : (trendData.length > 0 ? Math.max(...trendData.map(d => d.score)) : 0);

  const eventRank = rankingEntry?.rank ?? '-';
  const totalTeamsCount = rankings.length > 0 ? rankings.length : (teams.length > 0 ? teams.length : 0);

  const driverScore = skillsEntry?.driverScore ?? 0;
  const progScore = skillsEntry?.progScore ?? 0;
  const totalSkillsScore = skillsEntry?.totalScore ?? (driverScore + progScore);
  const driverAttempts = skillsEntry?.driverAttempts ?? 0;
  const progAttempts = skillsEntry?.progAttempts ?? 0;
  const skillsRank = skillsEntry?.rank ?? '-';
  const autoRatioPct = totalSkillsScore > 0 ? Math.round((progScore / totalSkillsScore) * 100) : 0;

  // 8. Calculate Division Median & Max for 6-Axis Radar Chart
  const radarMetrics = useMemo(() => {
    const avgScores = [];
    const highScores = [];
    const oprValues = Object.values(resolvedOprMap).filter(v => typeof v === 'number' && Number.isFinite(v));
    const skillScores = [];
    const autoRatios = [];
    const winRates = [];

    if (Array.isArray(rankings)) {
      for (const r of rankings) {
        if (r.average_points !== undefined) avgScores.push(Number(r.average_points) || 0);
        if (r.high_score !== undefined) highScores.push(Number(r.high_score) || 0);
        const w = Number(r.wins) || 0;
        const l = Number(r.losses) || 0;
        const ti = Number(r.ties) || 0;
        const p = Number(r.played) || (w + l + ti);
        if (p > 0) winRates.push(((w + ti * 0.5) / p) * 100);
      }
    }

    if (Array.isArray(normalizedSkillsList)) {
      for (const s of normalizedSkillsList) {
        if (s.totalScore !== undefined) skillScores.push(s.totalScore);
        if (s.totalScore > 0) {
          autoRatios.push((s.progScore / s.totalScore) * 100);
        }
      }
    }

    const medAvg = calculateMedian(avgScores) || 50;
    const medHigh = calculateMedian(highScores) || 70;
    const medOpr = calculateMedian(oprValues) || 30;
    const medSkills = calculateMedian(skillScores) || 60;
    const medAutoRatio = calculateMedian(autoRatios) || 30;
    const medWinRate = calculateMedian(winRates) || 50;

    const maxAvg = Math.max(100, ...(avgScores.length ? avgScores : [100]));
    const maxHigh = Math.max(120, ...(highScores.length ? highScores : [120]));
    const maxOpr = Math.max(60, ...(oprValues.length ? oprValues : [60]));
    const maxSkills = Math.max(150, ...(skillScores.length ? skillScores : [150]));

    return {
      team: {
        avgScore: avgMatchScore,
        maxScore: highMatchScore,
        opr: teamOpr,
        skillsScore: totalSkillsScore,
        autoRatio: autoRatioPct,
        winRate: winRatePct
      },
      median: {
        avgScore: Math.round(medAvg),
        maxScore: Math.round(medHigh),
        opr: Math.round(medOpr * 10) / 10,
        skillsScore: Math.round(medSkills),
        autoRatio: Math.round(medAutoRatio),
        winRate: Math.round(medWinRate)
      },
      max: {
        avgScore: maxAvg,
        maxScore: maxHigh,
        opr: maxOpr,
        skillsScore: maxSkills,
        autoRatio: 100,
        winRate: 100
      }
    };
  }, [resolvedOprMap, rankings, normalizedSkillsList, avgMatchScore, highMatchScore, teamOpr, totalSkillsScore, autoRatioPct, winRatePct]);

  // 9. Resolve Awards won by this team
  const teamAwards = useMemo(() => {
    if (!Array.isArray(awards) || !teamNumber) return [];

    return awards.filter(award => {
      const winners = award.teamWinners || [];
      return winners.some(w => {
        const num = normalizeTeamKey(w.team?.number || w.team?.code || w.team?.name || w.team);
        return num === teamNumber;
      });
    });
  }, [awards, teamNumber]);

  // 10. Background Season Ranking Enrichment (Optional, non-blocking)
  useEffect(() => {
    let isCancelled = false;
    async function fetchSeasonRank() {
      if (!teamNumber) return;
      try {
        setSeasonDetails(prev => ({ ...prev, loading: true }));
        const teamObj = await getTeam(teamNumber);
        if (isCancelled || !teamObj?.id) {
          setSeasonDetails(prev => ({ ...prev, loading: false }));
          return;
        }

        const skillsRes = await getTeamSkills(teamObj.id);
        if (isCancelled) return;

        const bestSkills = skillsRes?.data?.[0] || null;
        setSeasonDetails({
          loading: false,
          worldRank: bestSkills?.rank || null,
          countryRank: null,
          seasonSkills: bestSkills?.score || null
        });
      } catch (err) {
        if (!isCancelled) {
          setSeasonDetails(prev => ({ ...prev, loading: false }));
        }
      }
    }

    fetchSeasonRank();
    return () => { isCancelled = true; };
  }, [teamNumber]);

  // Toggle favorite click handler
  const handleToggleFav = useCallback((e) => {
    e.stopPropagation();
    const newState = toggleFavorite('teams', teamNumber);
    setIsFav(newState);
  }, [teamNumber]);

  // Scouting notes state & auto-persistence
  const [scoutingNotes, setScoutingNotes] = useState(() => getTeamNotes(teamNumber));
  const [notesSavedIndicator, setNotesSavedIndicator] = useState(false);
  const notesTimerRef = useRef(null);

  useEffect(() => {
    setScoutingNotes(getTeamNotes(teamNumber));
  }, [teamNumber]);

  useEffect(() => {
    return () => {
      if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    };
  }, []);

  const triggerSavedToast = () => {
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    setNotesSavedIndicator(true);
    notesTimerRef.current = setTimeout(() => {
      setNotesSavedIndicator(false);
    }, 2000);
  };

  const handleNotesChange = (e) => {
    const val = e.target.value;
    setScoutingNotes(val);
    setTeamNotes(teamNumber, val);
    triggerSavedToast();
  };

  const handleToggleTag = (tag) => {
    const updated = toggleScoutingTag(scoutingNotes, tag);
    setScoutingNotes(updated);
    setTeamNotes(teamNumber, updated);
    triggerSavedToast();
  };

  const handleClearNotes = () => {
    setScoutingNotes('');
    setTeamNotes(teamNumber, '');
    triggerSavedToast();
  };

  if (!isOpen || !teamNumber) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="team-profile-heading"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* ================================================================= */}
        {/* Sticky Modal Header                                               */}
        {/* ================================================================= */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3">
          
          {/* Team Identification */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-black text-xl shrink-0 border border-cyan-500/20">
              <Activity className="w-6 h-6" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-wider mb-0.5">
                {t.teamProfile}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 
                  id="team-profile-heading" 
                  className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight"
                >
                  {teamNumber}
                </h2>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-200/80 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                  {grade}
                </span>
                {division?.name && (
                  <span className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
                    {division.name}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {teamName !== teamNumber && (
                  <span className="font-bold text-slate-700 dark:text-slate-200 truncate max-w-[200px]">
                    {teamName}
                  </span>
                )}
                {organization && (
                  <>
                    <span>•</span>
                    <span className="truncate max-w-[180px] flex items-center gap-1">
                      <School className="w-3 h-3 shrink-0" />
                      {organization}
                    </span>
                  </>
                )}
                {locationStr && (
                  <>
                    <span>•</span>
                    <span className="truncate max-w-[150px] flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {locationStr}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {/* Compare Button */}
            {onOpenCompare && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCompare(teamNumber);
                }}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 min-h-[44px]"
                title={t.compareTeam}
              >
                <GitCompare className="w-4 h-4 text-cyan-500" />
                <span className="hidden sm:inline">{t.compareTeam}</span>
              </button>
            )}

            {/* Queue Alert Button */}
            {onOpenQueueAlert && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenQueueAlert(teamNumber);
                }}
                className="px-3 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 text-xs font-bold transition-all flex items-center gap-1.5 min-h-[44px]"
                title={t.setQueueAlert}
              >
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">{t.setQueueAlert}</span>
              </button>
            )}

            {/* Favorite Star */}
            <button
              type="button"
              onClick={handleToggleFav}
              className={`p-2.5 rounded-xl border transition-all min-w-[44px] min-h-[44px] flex items-center justify-center ${
                isFav 
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-500' 
                  : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-400 hover:text-amber-400'
              }`}
              aria-label={`Favorite team ${teamNumber}`}
            >
              <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400' : ''}`} />
            </button>

            {/* External RobotEvents Link */}
            <a
              href={`https://www.robotevents.com/teams/VIQRC/${teamNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-cyan-500 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              title={t.robotEventsProfile}
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label={t.close}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* ================================================================= */}
        {/* Scrollable Body Content                                           */}
        {/* ================================================================= */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          
          {/* SECTION 1: Performance Metric Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            
            {/* Cooperative OPR */}
            <div className="p-3.5 rounded-2xl bg-cyan-500/5 dark:bg-cyan-500/10 border border-cyan-500/20 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" />
                {t.oprTitle}
              </span>
              <p className="text-2xl sm:text-3xl font-black font-mono text-cyan-600 dark:text-cyan-400 mt-1">
                {teamOpr.toFixed(1)}
              </p>
              <span className="text-[10px] text-slate-400 mt-1 truncate" title={t.oprDesc}>
                {isVi ? 'Đóng góp liên minh' : 'Cooperative rating'}
              </span>
            </div>

            {/* Event Rank */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                {t.eventRank}
              </span>
              <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white mt-1">
                #{eventRank}
              </p>
              <span className="text-[10px] text-slate-400 mt-1">
                {totalTeamsCount > 0 ? `${isVi ? 'trên' : 'of'} ${totalTeamsCount} ${isVi ? 'đội' : 'teams'}` : '-'}
              </span>
            </div>

            {/* Avg Match Score */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-blue-500" />
                {t.avgScore}
              </span>
              <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white mt-1">
                {avgMatchScore}
              </p>
              <span className="text-[10px] text-slate-400 mt-1">
                {t.pts} / {isVi ? 'trận' : 'match'}
              </span>
            </div>

            {/* High Score */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                {t.highScore}
              </span>
              <p className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {highMatchScore}
              </p>
              <span className="text-[10px] text-slate-400 mt-1">
                {isVi ? 'Kỷ lục vòng bảng' : 'Event match high'}
              </span>
            </div>

            {/* Total Skills Score */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-indigo-500" />
                {t.totalSkills}
              </span>
              <p className="text-2xl sm:text-3xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                {totalSkillsScore}
              </p>
              <span className="text-[10px] text-slate-400 mt-1">
                {isVi ? `Hạng #${skillsRank} Skills` : `Skills Rank #${skillsRank}`}
              </span>
            </div>

            {/* Win Rate & Record */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-amber-500" />
                {t.winRate}
              </span>
              <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white mt-1">
                {winRatePct}%
              </p>
              <span className="text-[10px] font-mono text-slate-400 mt-1">
                {wins}W - {losses}L - {ties}T
              </span>
            </div>

          </div>

          {/* SECTION 2: Charts Row (Radar Chart vs Skills Split) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left: 6-Axis Radar Chart */}
            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-2">
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-cyan-500" />
                  {t.performanceRadar}
                </h3>
              </div>
              
              <RadarChart
                teamMetrics={radarMetrics.team}
                medianMetrics={radarMetrics.median}
                maxMetrics={radarMetrics.max}
                teamNumber={teamNumber}
                divisionName={division?.name || ''}
                lang={lang}
              />
            </div>

            {/* Right: Skills Breakdown & Attempts */}
            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-indigo-500" />
                    {t.skillsBreakdown}
                  </h3>
                  <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                    {isVi ? `Tỉ lệ Auto: ${autoRatioPct}%` : `Auto Ratio: ${autoRatioPct}%`}
                  </span>
                </div>

                <SkillsBar
                  driverScore={driverScore}
                  programmingScore={progScore}
                  totalScore={totalSkillsScore}
                  showLabels={true}
                  showBadge={true}
                  showPercentages={true}
                  lang={lang}
                />
              </div>

              {/* Attempts Counters */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-slate-700/60">
                <div className="bg-white dark:bg-slate-900/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                      {t.driverSkills}
                    </span>
                    <p className="text-lg font-black font-mono text-slate-900 dark:text-white mt-0.5">
                      {driverScore} {t.pts}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                      {driverAttempts}/3 {t.attemptsUsed}
                    </span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" />
                      {t.progSkills}
                    </span>
                    <p className="text-lg font-black font-mono text-slate-900 dark:text-white mt-0.5">
                      {progScore} {t.pts}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300">
                      {progAttempts}/3 {t.attemptsUsed}
                    </span>
                  </div>
                </div>
              </div>

              {/* Global Season Skills Badge & Simulator Launcher */}
              <div className="p-3 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {t.worldSkillsRank}:
                  </span>
                  <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">
                    {seasonDetails.loading ? (
                      <span className="text-slate-400 text-[11px] animate-pulse">{t.loadingSeason}</span>
                    ) : seasonDetails.worldRank ? (
                      `#${seasonDetails.worldRank}`
                    ) : (
                      `#${skillsRank} (${isVi ? 'Tại giải' : 'Event'})`
                    )}
                  </span>
                </div>

                {onOpenSimulator && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onClose) onClose();
                      onOpenSimulator({
                        initialDriverScore: driverScore,
                        initialProgScore: progScore,
                        driverScore,
                        progScore,
                        teamNumber,
                        event,
                        eventSkills: skills
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 text-[11px] font-bold transition-all hover:scale-105 active:scale-95 self-start sm:self-auto"
                    title={isVi ? 'Mô phỏng vị trí của đội này trên bảng xếp hạng thế giới' : 'Simulate this team on world skills leaderboard'}
                  >
                    <Target className="w-3.5 h-3.5 text-cyan-500" />
                    <span>{isVi ? 'Giả lập Skills' : 'Simulate Skills'}</span>
                  </button>
                )}
              </div>

            </div>

          </div>

          {/* SECTION 3: Score Progression Trend Chart */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-cyan-500" />
                {t.scoreProgression}
              </h3>
              {trendData.length > 0 && (
                <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                  {trendData.length} {isVi ? 'trận' : 'matches'}
                </span>
              )}
            </div>

            <TrendChart
              data={trendData}
              metricKey="score"
              metricLabel={isVi ? 'Điểm trận' : 'Match Score'}
              showAverage={true}
              showMinMax={true}
              showArea={true}
              lang={lang}
            />
          </div>

          {/* SECTION: Pit Scouting Notes (LemonVEX Parity) */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-500" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  {t.scoutingNotesTitle}
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300">
                  {teamNumber}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {notesSavedIndicator && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/40 animate-fade-in">
                    <Check className="w-3 h-3" />
                    <span>{t.notesSaved}</span>
                  </span>
                )}
                {scoutingNotes && (
                  <button
                    type="button"
                    onClick={handleClearNotes}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors min-h-[36px]"
                    title={t.clearNotes || (isVi ? 'Xóa ghi chú' : 'Clear notes')}
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{t.clearNotes || (isVi ? 'Xóa' : 'Clear')}</span>
                  </button>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.scoutingNotesDesc}
            </p>

            {/* Quick Tag Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1">
                <Tag className="w-3 h-3" />
                <span>{t.quickTags}:</span>
              </span>
              {(isVi ? [
                '⚡ Nạp bóng nhanh',
                '🎯 Auto chuẩn (35+)',
                '🏗️ Chuyên Level 3-4',
                '🤝 Giao tiếp tốt',
                '🛡️ Quét sàn nhanh',
                '🅿️ Đỗ xe đôi chuẩn'
              ] : [
                '⚡ Rapid Intake',
                '🎯 Reliable Auto (35+)',
                '🏗️ Level 3-4 Specialist',
                '🤝 Great Comms',
                '🛡️ Floor Sweeper',
                '🅿️ Consistent Double Park'
              ]).map((tag) => {
                const isActive = Boolean(scoutingNotes && scoutingNotes.includes(tag));
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleToggleTag(tag)}
                    aria-pressed={isActive}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all hover:scale-105 active:scale-95 flex items-center gap-1 border ${
                      isActive
                        ? 'bg-cyan-50 dark:bg-cyan-950/70 border-cyan-400 dark:border-cyan-500 text-cyan-800 dark:text-cyan-200 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-cyan-400 dark:hover:border-cyan-500 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>{tag}</span>
                    {isActive && <Check className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />}
                  </button>
                );
              })}
            </div>

            {/* Interactive Autosaving Textarea */}
            <textarea
              value={scoutingNotes}
              onChange={handleNotesChange}
              rows={3}
              placeholder={t.scoutingNotesPlaceholder.replace('{team}', teamNumber)}
              className="w-full p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all resize-y"
            />
          </div>

          {/* SECTION 4: Match History List (Cooperative VIQRC Alliance Format) */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-sky-500" />
              {t.matchHistory}
            </h3>

            {teamMatches.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800">
                <p>{t.noMatchesYet}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {teamMatches.map((m, mIdx) => {
                  return (
                    <div
                      key={mIdx}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 flex items-center justify-between gap-3 hover:border-cyan-400 dark:hover:border-cyan-500/50 transition-all shadow-sm"
                    >
                      {/* Left: Match Name & Time */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900 dark:text-white">
                            {m.matchName}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            m.roundName === 'Finals'
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                              : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                          }`}>
                            {m.roundName === 'Finals' ? t.finalsMatch : t.qualMatch}
                          </span>
                        </div>

                        {/* Partner Link */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                          <span>{t.partner}:</span>
                          {m.partnerNumber ? (
                            <button
                              type="button"
                              onClick={() => onSelectTeam && onSelectTeam(m.partnerNumber)}
                              className="font-black text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 focus:outline-none"
                            >
                              <span>{m.partnerNumber}</span>
                              {m.partnerName && (
                                <span className="font-normal text-slate-400 truncate max-w-[120px]">
                                  ({m.partnerName})
                                </span>
                              )}
                            </button>
                          ) : (
                            <span className="italic text-slate-400">{t.soloAlliance}</span>
                          )}
                        </div>
                      </div>

                      {/* Right: Joint Score / Status */}
                      <div className="text-right shrink-0">
                        {m.isScored ? (
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xl font-black font-mono px-3 py-1 rounded-xl border ${
                              m.score >= avgMatchScore
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700'
                            }`}>
                              {m.score}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                            {m.scheduledTime ? new Date(m.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : t.scheduled}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 5: Awards & Accolades */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              {t.awardsWon}
            </h3>

            {teamAwards.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800">
                <p>{t.noAwardsYet}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {teamAwards.map((award, aIdx) => {
                  const cat = getAwardCategory(award);
                  return (
                    <div
                      key={aIdx}
                      className={`p-4 rounded-2xl border bg-white dark:bg-slate-900 flex items-center gap-3 shadow-sm ${cat.cardBorder}`}
                    >
                      <div className={`w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 ${cat.iconColor}`}>
                        {cat.type === 'excellence' && <Sparkles className="w-5 h-5" />}
                        {cat.type === 'champions' && <Trophy className="w-5 h-5" />}
                        {cat.type === 'skills' && <Target className="w-5 h-5" />}
                        {cat.type === 'design' && <Award className="w-5 h-5" />}
                        {cat.type === 'judged' && <CheckCircle2 className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${cat.badgeColor}`}>
                          {cat.label}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1 truncate">
                          {award.title || award.name}
                        </h4>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
