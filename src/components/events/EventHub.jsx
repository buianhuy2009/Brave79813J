import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  RefreshCw, 
  Play, 
  Pause, 
  Trophy, 
  Users, 
  Target, 
  Award, 
  Star, 
  Download, 
  ChevronRight, 
  AlertCircle, 
  Bell, 
  ExternalLink,
  Flame,
  TrendingUp,
  MapPin,
  CheckCircle2,
  LayoutDashboard
} from 'lucide-react';
import { 
  getEvent, 
  getEventDivisions, 
  getEventMatches, 
  getEventRankings, 
  getEventSkills, 
  getEventAwards, 
  getEventTeams 
} from '../../utils/eventsApi';
import { calculateOPR, calculateMeanScore, parseMatch } from '../../utils/opr';
import { isFavorite, toggleFavorite, subscribeToStorage } from '../../utils/eventsStorage';
import { exportEventCalendar } from '../../utils/icsExport';
import MatchSchedule from './MatchSchedule';
import RankingsTable from './RankingsTable';
import SkillsStandings from './SkillsStandings';
import AwardsList from './AwardsList';
import TeamsList from './TeamsList';

const REFRESH_INTERVAL_SEC = 30;
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

const I18N = {
  en: {
    backToEvents: 'All Events',
    liveNow: 'LIVE NOW',
    upcoming: 'UPCOMING',
    completed: 'COMPLETED',
    refreshingIn: 'Refreshing in',
    lastUpdated: 'Updated',
    justNow: 'Just now',
    ago: 'ago',
    refreshNow: 'Refresh',
    pollingPausedBanner: 'Live updates paused after 15 minutes of inactivity to conserve bandwidth.',
    resumeUpdates: 'Resume Live Updates',
    allDivisions: 'Divisions',
    tabOverview: 'Overview',
    tabMatches: 'Matches',
    tabRankings: 'Rankings',
    tabSkills: 'Skills',
    tabAwards: 'Awards',
    tabTeams: 'Teams',
    statTotalTeams: 'Registered Teams',
    statMatchesPlayed: 'Matches Played',
    statAvgScore: 'Avg Alliance Score',
    statHighestScore: 'Highest Match Score',
    upNextTitle: 'Up Next on Field',
    upNextSubtitle: 'Upcoming scheduled teamwork challenge matches',
    noUpcomingMatches: 'All scheduled matches for this division have concluded.',
    viewAllMatches: 'View Full Schedule',
    rankingsPreviewTitle: 'Division Standings',
    rankingsPreviewSubtitle: 'Top qualification ranking leaders',
    noRankingsYet: 'Rankings will appear after the first qualification matches are completed.',
    viewAllRankings: 'View Full Rankings',
    cooperativeAlliance: 'Teamwork Alliance',
    setQueueAlert: 'Set Queue Alert',
    rank: 'Rank',
    team: 'Team',
    record: 'W-L-T',
    avgScore: 'Avg',
    highScore: 'High',
    opr: 'OPR',
    downloadCalendar: 'Download Schedule (.ics)',
    venueInfo: 'Event Venue & Details',
    officialPage: 'RobotEvents Page',
    sku: 'SKU',
    errorLoading: 'Failed to load event data.',
    retry: 'Retry',
    loadingEvent: 'Loading live tournament hub...'
  },
  vi: {
    backToEvents: 'Tất cả giải đấu',
    liveNow: 'ĐANG DIỄN RA',
    upcoming: 'SẮP DIỄN RA',
    completed: 'ĐÃ KẾT THÚC',
    refreshingIn: 'Tự làm mới sau',
    lastUpdated: 'Cập nhật',
    justNow: 'Vừa xong',
    ago: 'trước',
    refreshNow: 'Làm mới',
    pollingPausedBanner: 'Tự động cập nhật đã tạm dừng sau 15 phút không hoạt động để tiết kiệm băng thông.',
    resumeUpdates: 'Tiếp tục cập nhật',
    allDivisions: 'Bảng thi đấu',
    tabOverview: 'Tổng quan',
    tabMatches: 'Lịch thi đấu',
    tabRankings: 'Bảng xếp hạng',
    tabSkills: 'Điểm Skills',
    tabAwards: 'Giải thưởng',
    tabTeams: 'Danh sách đội',
    statTotalTeams: 'Tổng số đội',
    statMatchesPlayed: 'Trận đã đấu',
    statAvgScore: 'Điểm liên minh TB',
    statHighestScore: 'Điểm kỷ lục trận',
    upNextTitle: 'Trận đấu sắp diễn ra',
    upNextSubtitle: 'Các trận liên minh tiếp theo chuẩn bị lên sân',
    noUpcomingMatches: 'Tất cả các trận đã lên lịch cho bảng đấu này đã kết thúc.',
    viewAllMatches: 'Xem toàn bộ lịch đấu',
    rankingsPreviewTitle: 'Bảng xếp hạng vòng bảng',
    rankingsPreviewSubtitle: 'Các đội dẫn đầu vòng loại liên minh',
    noRankingsYet: 'Bảng xếp hạng sẽ hiển thị sau khi các trận đấu đầu tiên có kết quả.',
    viewAllRankings: 'Xem đầy đủ xếp hạng',
    cooperativeAlliance: 'Liên minh đồng đội',
    setQueueAlert: 'Đặt báo giờ xếp hàng',
    rank: 'Hạng',
    team: 'Đội',
    record: 'T-B-H',
    avgScore: 'TB',
    highScore: 'Kỷ lục',
    opr: 'OPR',
    downloadCalendar: 'Tải lịch thi đấu (.ics)',
    venueInfo: 'Địa điểm & Thông tin giải',
    officialPage: 'Trang RobotEvents chính thức',
    sku: 'Mã giải (SKU)',
    errorLoading: 'Không thể tải dữ liệu giải đấu.',
    retry: 'Thử lại',
    loadingEvent: 'Đang tải dữ liệu giải đấu trực tiếp...'
  }
};

export default function EventHub({
  eventId,
  event: initialEvent = null,
  initialMatches = [],
  initialRankings = [],
  initialTeams = [],
  onBack,
  onSelectTeam,
  onOpenQueueAlert,
  onSetAlert,
  onOpenTeamCompare,
  onCompareTeam,
  onOpenSimulator,
  lang: propLang = null
}) {
  // Locale resolution
  const [lang, setLang] = useState(() => {
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

  const handleQueueAlert = onSetAlert || onOpenQueueAlert;
  const handleTeamCompare = onCompareTeam || onOpenTeamCompare;

  // Primary Event Metadata & Divisions
  const [event, setEvent] = useState(initialEvent);
  const [divisions, setDivisions] = useState(initialEvent?.divisions || []);
  const [selectedDivisionId, setSelectedDivisionId] = useState(() => {
    return initialEvent?.divisions?.[0]?.id || null;
  });

  // Navigation Sub-tab
  const [activeSubTab, setActiveSubTab] = useState('overview');

  // Division-Specific Data
  const [matches, setMatches] = useState(initialMatches);
  const [rankings, setRankings] = useState(initialRankings);

  // Event-Wide Data
  const [skills, setSkills] = useState([]);
  const [awards, setAwards] = useState([]);
  const [teams, setTeams] = useState(initialTeams);

  // Loading & Error States
  const [initialLoading, setInitialLoading] = useState(!initialEvent);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Auto-Refresh & Inactivity Timers
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL_SEC);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [relativeTimeStr, setRelativeTimeStr] = useState(t.justNow);
  const [isInactive, setIsInactive] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(false);

  // Favorites
  const [isFavorited, setIsFavorited] = useState(() => isFavorite('events', eventId));

  // Refs for stable timer closures
  const lastActiveRef = useRef(Date.now());
  const isTabHiddenRef = useRef(false);
  const lastUpdatedRef = useRef(Date.now());
  const selectedDivRef = useRef(selectedDivisionId);
  selectedDivRef.current = selectedDivisionId;

  // Sync favorites reactively across tabs
  useEffect(() => {
    const unsub = subscribeToStorage((detail) => {
      if (detail.key === 'vexiq_live_favorites') {
        setIsFavorited(isFavorite('events', eventId));
      }
    });
    return unsub;
  }, [eventId]);

  // Handle Event Metadata & Divisions Load
  useEffect(() => {
    let isMounted = true;
    async function loadEventMetadata() {
      try {
        if (!initialEvent) {
          setInitialLoading(true);
        }
        setError(null);

        let eventObj = initialEvent;
        if (!eventObj || !eventObj.name) {
          eventObj = await getEvent(eventId);
        }
        if (!isMounted) return;
        setEvent(eventObj);

        let divList = eventObj?.divisions || [];
        if (!divList.length) {
          divList = await getEventDivisions(eventId);
        }
        if (!isMounted) return;
        setDivisions(divList);

        if (divList.length > 0 && !selectedDivisionId) {
          setSelectedDivisionId(divList[0].id);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || t.errorLoading);
        }
      } finally {
        if (isMounted) {
          setInitialLoading(false);
        }
      }
    }

    loadEventMetadata();
    return () => { isMounted = false; };
  }, [eventId, initialEvent]);

  // Main Data Fetcher
  const fetchData = useCallback(async ({ forceRefresh = false, isSilent = false } = {}) => {
    if (!eventId) return;
    const currentDivId = selectedDivRef.current;

    try {
      if (!isSilent) setIsRefreshing(true);

      const promises = [
        // Event wide endpoints (cached by eventsApi)
        getEventSkills(eventId, { per_page: 250 }, { forceRefresh }).catch(() => ({ data: [] })),
        getEventAwards(eventId, { forceRefresh }).catch(() => ({ data: [] })),
        getEventTeams(eventId, { per_page: 250 }, { forceRefresh }).catch(() => ({ data: [] }))
      ];

      // Division-specific endpoints
      if (currentDivId) {
        promises.push(
          getEventMatches(eventId, currentDivId, { per_page: 250 }, { forceRefresh }).catch(() => ({ data: [] })),
          getEventRankings(eventId, currentDivId, { per_page: 250 }, { forceRefresh }).catch(() => ({ data: [] }))
        );
      }

      const results = await Promise.all(promises);

      const skillsData = results[0]?.data || [];
      const awardsData = results[1]?.data || [];
      const teamsData = results[2]?.data || [];
      const matchesData = results[3]?.data || [];
      const rankingsData = results[4]?.data || [];

      setSkills(skillsData);
      setAwards(awardsData);
      setTeams(teamsData);
      setMatches(matchesData);
      setRankings(rankingsData);

      const now = Date.now();
      setLastUpdated(now);
      lastUpdatedRef.current = now;
      setError(null);
    } catch (err) {
      console.warn('[EventHub] Fetch failed:', err);
      if (!isSilent) {
        setError(err.message || t.errorLoading);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [eventId, t.errorLoading]);

  // Fetch when division changes or initial load completes
  useEffect(() => {
    if (selectedDivisionId && !initialLoading) {
      fetchData({ forceRefresh: false, isSilent: false });
    }
  }, [selectedDivisionId, initialLoading, fetchData]);

  // 15-Minute Inactivity Tracker
  useEffect(() => {
    const handleUserActivity = () => {
      lastActiveRef.current = Date.now();
      if (isInactive) {
        setIsInactive(false);
        setCountdown(REFRESH_INTERVAL_SEC);
        fetchData({ forceRefresh: false, isSilent: false });
      }
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach(evt => window.addEventListener(evt, handleUserActivity, { passive: true }));

    const inactivityCheck = setInterval(() => {
      if (Date.now() - lastActiveRef.current >= INACTIVITY_TIMEOUT_MS) {
        setIsInactive(true);
      }
    }, 1000);

    return () => {
      activityEvents.forEach(evt => window.removeEventListener(evt, handleUserActivity));
      clearInterval(inactivityCheck);
    };
  }, [isInactive, fetchData]);

  // Page Visibility Pause
  useEffect(() => {
    const handleVisibilityChange = () => {
      const hidden = document.hidden;
      setIsTabHidden(hidden);
      isTabHiddenRef.current = hidden;

      if (!hidden) {
        const elapsed = Date.now() - lastUpdatedRef.current;
        if (elapsed >= REFRESH_INTERVAL_SEC * 1000) {
          fetchData({ forceRefresh: false, isSilent: true });
          setCountdown(REFRESH_INTERVAL_SEC);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchData]);

  // 30s Countdown Polling Loop
  useEffect(() => {
    if (isInactive || isTabHidden || initialLoading) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          fetchData({ forceRefresh: false, isSilent: true });
          return REFRESH_INTERVAL_SEC;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isInactive, isTabHidden, initialLoading, fetchData]);

  // Relative Time String ("Last updated: X ago")
  useEffect(() => {
    const updateRelative = () => {
      const sec = Math.floor((Date.now() - lastUpdated) / 1000);
      if (sec < 5) {
        setRelativeTimeStr(t.justNow);
      } else if (sec < 60) {
        setRelativeTimeStr(`${sec}s ${t.ago}`);
      } else {
        const mins = Math.floor(sec / 60);
        setRelativeTimeStr(`${mins}m ${t.ago}`);
      }
    };

    updateRelative();
    const timer = setInterval(updateRelative, 1000);
    return () => clearInterval(timer);
  }, [lastUpdated, t.justNow, t.ago]);

  // Handle Manual Refresh Click
  const handleManualRefresh = () => {
    lastActiveRef.current = Date.now();
    setIsInactive(false);
    setCountdown(REFRESH_INTERVAL_SEC);
    fetchData({ forceRefresh: true, isSilent: false });
  };

  // Toggle Favorite
  const handleToggleFavorite = () => {
    const nextState = toggleFavorite('events', eventId);
    setIsFavorited(nextState);
  };

  // Calendar Export
  const handleDownloadCalendar = () => {
    exportEventCalendar(event, matches);
  };

  // =========================================================================
  // Derived Overview Tab Metrics
  // =========================================================================
  const scoredMatches = useMemo(() => {
    return (matches || []).filter(m => {
      const p = parseMatch(m);
      return p && p.isScored;
    });
  }, [matches]);

  const totalMatchesCount = matches.length;
  const playedMatchesCount = scoredMatches.length;
  const percentPlayed = totalMatchesCount > 0 ? Math.round((playedMatchesCount / totalMatchesCount) * 100) : 0;

  const avgScore = useMemo(() => {
    return calculateMeanScore(matches);
  }, [matches]);

  const highestScoreData = useMemo(() => {
    let high = 0;
    let matchName = '';
    for (const m of scoredMatches) {
      const p = parseMatch(m);
      if (p && p.score > high) {
        high = p.score;
        matchName = m.name || `Match ${m.matchnum || ''}`;
      }
    }
    return { score: high, matchName };
  }, [scoredMatches]);

  const oprMap = useMemo(() => {
    return calculateOPR(teams, matches);
  }, [teams, matches]);

  const upcomingMatches = useMemo(() => {
    return (matches || [])
      .filter(m => {
        const p = parseMatch(m);
        return !p || !p.isScored;
      })
      .slice(0, 3);
  }, [matches]);

  const topRankings = useMemo(() => {
    return (rankings || []).slice(0, 5);
  }, [rankings]);

  const handleSelectTeam = useCallback((teamOrPayload) => {
    if (!onSelectTeam) return;
    const teamNum = typeof teamOrPayload === 'string'
      ? teamOrPayload
      : (teamOrPayload?.number || teamOrPayload?.team || teamOrPayload?.teamNumber || '');
    const currentDiv = divisions.find(d => d.id === selectedDivisionId);
    onSelectTeam({
      teamNumber: teamNum,
      team: typeof teamOrPayload === 'object' ? teamOrPayload : { number: teamNum },
      matches,
      rankings,
      skills,
      teams,
      awards,
      oprMap,
      event,
      division: currentDiv,
      divisionId: selectedDivisionId
    });
  }, [onSelectTeam, matches, rankings, skills, teams, awards, oprMap, event, divisions, selectedDivisionId]);

  const handleCompareWithContext = useCallback((teamsOrPayload) => {
    if (!handleTeamCompare) return;
    const initialList = Array.isArray(teamsOrPayload) 
      ? teamsOrPayload 
      : (typeof teamsOrPayload === 'string' ? [teamsOrPayload] : (teamsOrPayload?.teams || teamsOrPayload?.initialTeams || []));
    const currentDiv = divisions.find(d => d.id === selectedDivisionId);
    handleTeamCompare({
      initialTeams: initialList,
      teams,
      matches,
      rankings,
      skills,
      awards,
      oprMap,
      event,
      division: currentDiv,
      divisionId: selectedDivisionId
    });
  }, [handleTeamCompare, teams, matches, rankings, skills, awards, oprMap, event, divisions, selectedDivisionId]);

  const handleSimulatorWithContext = useCallback((payload = {}) => {
    if (!onOpenSimulator) return;
    const currentDiv = divisions.find(d => d.id === selectedDivisionId);
    onOpenSimulator({
      event,
      eventSkills: skills,
      division: currentDiv,
      divisionId: selectedDivisionId,
      ...payload
    });
  }, [onOpenSimulator, event, skills, divisions, selectedDivisionId]);

  const handleAlertWithContext = useCallback((payload = {}) => {
    if (!handleQueueAlert) return;
    const currentDiv = divisions.find(d => d.id === selectedDivisionId);
    handleQueueAlert({
      event,
      division: currentDiv,
      divisionId: selectedDivisionId,
      matches,
      teams,
      ...(typeof payload === 'string' ? { teamNumber: payload } : payload)
    });
  }, [handleQueueAlert, event, divisions, selectedDivisionId, matches, teams]);

  // Event Live Status Pill
  const liveStatusBadge = useMemo(() => {
    if (!event) return null;
    const now = Date.now();
    const start = event.start ? new Date(event.start).getTime() : 0;
    const end = event.end ? new Date(event.end).getTime() : 0;

    if (event.ongoing || (start && end && now >= start - 12*3600*1000 && now <= end + 12*3600*1000)) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          {t.liveNow}
        </span>
      );
    }
    if (start && now < start) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
          <Clock className="w-3 h-3" />
          {t.upcoming}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30">
        <CheckCircle2 className="w-3 h-3" />
        {t.completed}
      </span>
    );
  }, [event, t]);

  // Loading skeleton
  if (initialLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="h-72 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5">
      
      {/* Calm 15-Minute Inactivity Resume Banner */}
      {isInactive && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-800 dark:text-amber-200 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium">
            <Pause className="w-4 h-4 text-amber-500 shrink-0" />
            <span>{t.pollingPausedBanner}</span>
          </div>
          <button
            onClick={handleManualRefresh}
            className="w-full sm:w-auto px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs sm:text-sm font-bold shadow transition-all hover:scale-105 active:scale-95"
          >
            {t.resumeUpdates}
          </button>
        </div>
      )}

      {/* Breadcrumb & Navigation Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>{t.backToEvents}</span>
        </button>

        {/* Polling Countdown Indicator & Manual Refresh Button */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 shadow-sm">
          {!isInactive && !isTabHidden && (
            <span className="hidden sm:inline font-medium">
              {t.refreshingIn} <strong className="text-cyan-600 dark:text-cyan-400 font-mono">{countdown}s</strong>
            </span>
          )}
          <span className="hidden md:inline text-slate-300 dark:text-slate-700">•</span>
          <span className="font-medium text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
            {t.lastUpdated}: {relativeTimeStr}
          </span>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            title={t.refreshNow}
            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-cyan-500 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Event Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {liveStatusBadge}
              {event?.sku && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  {event.sku}
                </span>
              )}
            </div>
            <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {event?.name || 'VEX IQ Tournament'}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              {(event?.location?.city || event?.location?.region || event?.location?.country) && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-cyan-500" />
                  <span>
                    {[event.location.city, event.location.region, event.location.country].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
              {event?.start && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-cyan-500" />
                  <span>
                    {new Date(event.start).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons: Simulator, Compare, Queue Alert, Favorite & .ics Calendar Download */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
            {onOpenSimulator && (
              <button
                type="button"
                onClick={() => handleSimulatorWithContext()}
                className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 bg-slate-50 dark:bg-slate-800/60 hover:bg-cyan-50 dark:hover:bg-cyan-950/20 text-slate-700 dark:text-slate-300 transition-all hover:scale-105"
                title={t.simulatorTitle || (lang === 'vi' ? 'Giả lập Skills' : 'Skills Simulator')}
                aria-label={t.simulatorTitle || 'Skills Simulator'}
              >
                <Target className="w-4 h-4 text-cyan-500" />
              </button>
            )}
            {handleTeamCompare && (
              <button
                type="button"
                onClick={() => handleCompareWithContext()}
                className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-slate-700 dark:text-slate-300 transition-all hover:scale-105"
                title={t.compareTitle || (lang === 'vi' ? 'So sánh Đội' : 'Compare Teams')}
                aria-label={t.compareTitle || 'Compare Teams'}
              >
                <Users className="w-4 h-4 text-indigo-500" />
              </button>
            )}
            {handleQueueAlert && (
              <button
                type="button"
                onClick={() => handleAlertWithContext()}
                className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-slate-700 dark:text-slate-300 transition-all hover:scale-105"
                title={t.queueAlertModalTitle || (lang === 'vi' ? 'Cài đặt cảnh báo' : 'Queue Alert')}
                aria-label={t.queueAlertModalTitle || 'Queue Alert'}
              >
                <Bell className="w-4 h-4 text-amber-500" />
              </button>
            )}
            <button
              type="button"
              onClick={handleToggleFavorite}
              className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-amber-400/50 bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-slate-600 dark:text-slate-300 transition-all hover:scale-105"
              title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
              aria-label="Toggle favorite"
            >
              <Star className={`w-4 h-4 ${isFavorited ? 'fill-amber-400 text-amber-500' : 'hover:text-amber-400'}`} />
            </button>
            <button
              type="button"
              onClick={handleDownloadCalendar}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 bg-slate-50 dark:bg-slate-800/60 hover:bg-cyan-50 dark:hover:bg-cyan-950/20 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all hover:scale-105"
              title={t.downloadCalendar}
              aria-label={t.downloadCalendar}
            >
              <Download className="w-3.5 h-3.5 text-cyan-500" />
              <span className="hidden sm:inline">.ICS</span>
            </button>
          </div>
        </div>

        {/* Division Selector Pills */}
        {divisions.length > 1 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 shrink-0 uppercase tracking-wider text-[10px]">
              {t.allDivisions}:
            </span>
            {divisions.map(div => {
              const isSelected = div.id === selectedDivisionId;
              return (
                <button
                  key={div.id}
                  onClick={() => setSelectedDivisionId(div.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 scale-102'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {div.name || `Division ${div.id}`}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 6 Sub-Tab Navigation Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
            activeSubTab === 'overview'
              ? 'bg-white dark:bg-cyan-500 text-slate-900 dark:text-slate-950 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 text-cyan-600 dark:text-cyan-950" />
          <span>{t.tabOverview}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('matches')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
            activeSubTab === 'matches'
              ? 'bg-white dark:bg-cyan-500 text-slate-900 dark:text-slate-950 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4 text-cyan-600 dark:text-cyan-950" />
          <span>{t.tabMatches}</span>
          {matches.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-slate-200 dark:bg-cyan-600/40 text-slate-700 dark:text-slate-900">
              {matches.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('rankings')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
            activeSubTab === 'rankings'
              ? 'bg-white dark:bg-cyan-500 text-slate-900 dark:text-slate-950 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Trophy className="w-4 h-4 text-cyan-600 dark:text-cyan-950" />
          <span>{t.tabRankings}</span>
          {rankings.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-slate-200 dark:bg-cyan-600/40 text-slate-700 dark:text-slate-900">
              {rankings.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('skills')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
            activeSubTab === 'skills'
              ? 'bg-white dark:bg-cyan-500 text-slate-900 dark:text-slate-950 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Target className="w-4 h-4 text-cyan-600 dark:text-cyan-950" />
          <span>{t.tabSkills}</span>
          {skills.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-slate-200 dark:bg-cyan-600/40 text-slate-700 dark:text-slate-900">
              {skills.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('awards')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
            activeSubTab === 'awards'
              ? 'bg-white dark:bg-cyan-500 text-slate-900 dark:text-slate-950 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Award className="w-4 h-4 text-cyan-600 dark:text-cyan-950" />
          <span>{t.tabAwards}</span>
          {awards.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-slate-200 dark:bg-cyan-600/40 text-slate-700 dark:text-slate-900">
              {awards.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('teams')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
            activeSubTab === 'teams'
              ? 'bg-white dark:bg-cyan-500 text-slate-900 dark:text-slate-950 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4 text-cyan-600 dark:text-cyan-950" />
          <span>{t.tabTeams}</span>
          {teams.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-slate-200 dark:bg-cyan-600/40 text-slate-700 dark:text-slate-900">
              {teams.length}
            </span>
          )}
        </button>
      </div>

      {/* =================================================================== */}
      {/* SUB-TAB 1: OVERVIEW DASHBOARD */}
      {/* =================================================================== */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          
          {/* 4 Summary Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            
            {/* 1. Total Teams */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  {t.statTotalTeams}
                </span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {teams.length || '-'}
                </span>
              </div>
            </div>

            {/* 2. Matches Played / Progress */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                    {t.statMatchesPlayed}
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    {playedMatchesCount} <span className="text-sm font-medium text-slate-400">/ {totalMatchesCount}</span>
                  </span>
                </div>
              </div>
              {totalMatchesCount > 0 && (
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                  <div 
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${percentPlayed}%` }}
                  />
                </div>
              )}
            </div>

            {/* 3. Average Score */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  {t.statAvgScore}
                </span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {avgScore > 0 ? avgScore.toFixed(1) : '-'} <span className="text-xs font-semibold text-slate-400">pts</span>
                </span>
              </div>
            </div>

            {/* 4. Highest Match Score */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  {t.statHighestScore}
                </span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {highestScoreData.score > 0 ? highestScoreData.score : '-'} <span className="text-xs font-semibold text-slate-400">pts</span>
                </span>
                {highestScoreData.matchName && (
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block truncate max-w-[120px]">
                    {highestScoreData.matchName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 2-Column Responsive Dashboard Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Column 1: Up Next on Field (Collaborative Alliance Pairs - NO RED/BLUE) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    {t.upNextTitle}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t.upNextSubtitle}
                  </p>
                </div>
                <button
                  onClick={() => setActiveSubTab('matches')}
                  className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <span>{t.viewAllMatches}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {upcomingMatches.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 dark:text-slate-500">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                  <p>{t.noUpcomingMatches}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingMatches.map((m, idx) => {
                    const parsed = parseMatch(m);
                    const teamKeys = parsed?.teamKeys || [];
                    const teamA = teamKeys[0] || null;
                    const teamB = teamKeys[1] || null;
                    const scheduledTime = m.scheduled ? new Date(m.scheduled).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;

                    return (
                      <div 
                        key={m.id || idx}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-cyan-500/40 transition-colors"
                      >
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-xs text-slate-900 dark:text-white">
                              {m.name || `Match ${m.matchnum || idx + 1}`}
                            </span>
                            {m.field && (
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-md">
                                {m.field}
                              </span>
                            )}
                            {scheduledTime && (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-0.5">
                                <Clock className="w-3 h-3 text-cyan-500" />
                                {scheduledTime}
                              </span>
                            )}
                          </div>

                          {/* Cooperative Alliance Pair - NO RED/BLUE */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black uppercase text-cyan-700 dark:text-cyan-300 bg-cyan-100 dark:bg-cyan-900/40 border border-cyan-200 dark:border-cyan-800 px-2 py-0.5 rounded-lg">
                              🤝 {t.cooperativeAlliance}
                            </span>
                            <div className="flex items-center gap-1.5 font-black text-xs">
                              {teamA && (
                                <button
                                  onClick={() => handleSelectTeam(teamA)}
                                  className="text-cyan-600 dark:text-cyan-400 hover:underline"
                                >
                                  {teamA}
                                </button>
                              )}
                              {teamA && teamB && <span className="text-slate-400">&</span>}
                              {teamB && (
                                <button
                                  onClick={() => handleSelectTeam(teamB)}
                                  className="text-cyan-600 dark:text-cyan-400 hover:underline"
                                >
                                  {teamB}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Queue Alert Trigger */}
                        {handleQueueAlert && teamA && (
                          <button
                            onClick={() => handleAlertWithContext({ match: m, teamNumber: teamA })}
                            className="p-2 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors shrink-0"
                            title={t.setQueueAlert}
                          >
                            <Bell className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Column 2: Division Standings Preview (Top 5 Leaderboard with OPR) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    {t.rankingsPreviewTitle}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t.rankingsPreviewSubtitle}
                  </p>
                </div>
                <button
                  onClick={() => setActiveSubTab('rankings')}
                  className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <span>{t.viewAllRankings}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {topRankings.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 dark:text-slate-500">
                  <Trophy className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                  <p>{t.noRankingsYet}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[10px] uppercase font-bold">
                        <th className="pb-2 pl-1">{t.rank}</th>
                        <th className="pb-2">{t.team}</th>
                        <th className="pb-2 text-center">{t.record}</th>
                        <th className="pb-2 text-right">{t.avgScore}</th>
                        <th className="pb-2 text-right">{t.highScore}</th>
                        <th className="pb-2 text-right">{t.opr}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                      {topRankings.map((r, i) => {
                        const teamNum = r.team?.name || r.team?.code || r.team_number || '-';
                        const teamOPR = oprMap[teamNum];

                        return (
                          <tr key={r.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-2.5 pl-1">
                              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-black ${
                                i === 0 ? 'bg-amber-400 text-slate-950 shadow-sm' :
                                i === 1 ? 'bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white' :
                                i === 2 ? 'bg-amber-700/30 text-amber-700 dark:text-amber-400' :
                                'text-slate-400'
                              }`}>
                                {r.rank || i + 1}
                              </span>
                            </td>
                            <td className="py-2.5">
                              <button
                                onClick={() => handleSelectTeam(teamNum)}
                                className="font-black text-cyan-600 dark:text-cyan-400 hover:underline"
                              >
                                {teamNum}
                              </button>
                            </td>
                            <td className="py-2.5 text-center text-slate-500 font-mono text-[11px]">
                              {r.wins ?? 0}-{r.losses ?? 0}-{r.ties ?? 0}
                            </td>
                            <td className="py-2.5 text-right font-black text-slate-900 dark:text-white">
                              {r.average_points !== undefined ? Number(r.average_points).toFixed(1) : (r.avg_score ?? '-')}
                            </td>
                            <td className="py-2.5 text-right text-slate-600 dark:text-slate-300 font-semibold">
                              {r.high_score ?? '-'}
                            </td>
                            <td className="py-2.5 text-right font-mono font-bold text-cyan-600 dark:text-cyan-400">
                              {teamOPR !== undefined ? teamOPR.toFixed(1) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Event Quick Venue & Information Banner */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-cyan-600 dark:text-cyan-400 tracking-wider">
                {t.venueInfo}
              </span>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {event?.location?.venue || event?.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {[event?.location?.address_1, event?.location?.city, event?.location?.region, event?.location?.postcode].filter(Boolean).join(', ')}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {event?.sku && (
                <a
                  href={`https://www.robotevents.com/robot-competitions/vex-iq-competition/${event.sku}.html`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:text-cyan-500 transition-colors shadow-sm"
                >
                  <span>{t.officialPage}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                onClick={handleDownloadCalendar}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 text-xs font-bold shadow-md shadow-cyan-500/20 transition-all hover:scale-105"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t.downloadCalendar}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-TAB 2: MATCHES SCHEDULE (Renders MatchSchedule component) */}
      {/* =================================================================== */}
      {activeSubTab === 'matches' && (
        <MatchSchedule
          event={event}
          division={divisions.find(d => d.id === selectedDivisionId)}
          divisionId={selectedDivisionId}
          matches={matches}
          loading={isRefreshing}
          onRefresh={handleManualRefresh}
          onSelectTeam={handleSelectTeam}
          onOpenQueueAlert={handleAlertWithContext}
          onSetAlert={handleAlertWithContext}
          lang={lang}
        />
      )}

      {/* =================================================================== */}
      {/* SUB-TAB 3: RANKINGS & CSV EXPORT (Renders RankingsTable component)  */}
      {/* =================================================================== */}
      {activeSubTab === 'rankings' && (
        <RankingsTable
          rankings={rankings}
          teams={teams}
          matches={matches}
          oprMap={oprMap}
          division={divisions.find(d => d.id === selectedDivisionId)}
          event={event}
          onSelectTeam={handleSelectTeam}
          onOpenTeamCompare={handleCompareWithContext}
          onCompareTeam={handleCompareWithContext}
          loading={isRefreshing}
          lang={lang}
        />
      )}

      {/* =================================================================== */}
      {/* SUB-TAB 4: SKILLS STANDINGS (Renders SkillsStandings component)       */}
      {/* =================================================================== */}
      {activeSubTab === 'skills' && (
        <SkillsStandings
          skills={skills}
          teams={teams}
          onSelectTeam={handleSelectTeam}
          onOpenSimulator={handleSimulatorWithContext}
          lang={lang}
        />
      )}

      {/* =================================================================== */}
      {/* SUB-TAB 5: AWARDS LIST (Renders AwardsList component)                */}
      {/* =================================================================== */}
      {activeSubTab === 'awards' && (
        <AwardsList
          awards={awards}
          divisions={divisions}
          onSelectTeam={handleSelectTeam}
          lang={lang}
        />
      )}

      {/* =================================================================== */}
      {/* SUB-TAB 6: REGISTERED TEAMS (Renders TeamsList component)             */}
      {/* =================================================================== */}
      {activeSubTab === 'teams' && (
        <TeamsList
          teams={teams}
          onSelectTeam={handleSelectTeam}
          onOpenTeamCompare={handleCompareWithContext}
          onCompareTeam={handleCompareWithContext}
          lang={lang}
        />
      )}

    </div>
  );
}
