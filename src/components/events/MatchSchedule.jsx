import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Users, 
  Calendar, 
  Clock, 
  Search, 
  Filter, 
  Bell, 
  BellRing, 
  Layers, 
  Sparkles, 
  X, 
  Download, 
  ChevronRight, 
  Star, 
  CheckCircle2, 
  AlertCircle, 
  Volume2, 
  MapPin, 
  ExternalLink,
  SlidersHorizontal,
  Info,
  FileText,
  Tag,
  Check,
  Trash2
} from 'lucide-react';
import { exportEventCalendar, generateEventIcs, downloadIcsFile } from '../../utils/icsExport';
import { 
  getFavorites, 
  toggleFavorite, 
  getQueueAlertConfig, 
  setQueueAlertConfig, 
  getMatchNotes,
  setMatchNotes,
  getAllMatchNotes,
  STORAGE_KEY_MATCH_NOTES,
  subscribeToStorage,
  toggleScoutingTag 
} from '../../utils/eventsStorage';
import { playQueueAlertChime } from '../../utils/audioAlert';
import { translations } from '../../constants/translations';

// ============================================================================
// Fallback Bilingual Dictionary
// ============================================================================
const I18N = {
  en: {
    scheduleTitle: 'Match Schedule & Results',
    showingMatches: 'Showing {count} collaborative teamwork matches',
    exportIcs: 'Export .ics',
    exportIcsTitle: 'Download iCalendar (.ics) schedule',
    filterAll: 'All',
    filterScheduled: 'Scheduled',
    filterPlayed: 'Played',
    filterFinals: 'Finals',
    searchPlaceholder: 'Filter team # (e.g. 79813J) or match...',
    clearFilter: 'Clear filter',
    filteredBy: 'Filtered by',
    noMatchesFound: 'No matches found',
    noMatchesDesc: 'Try adjusting your status filter or search query to find scheduled teamwork matches.',
    resetFilters: 'Reset Filters',
    cooperativeAlliance: 'VIQRC Cooperative Alliance',
    teamworkAlliance: 'Teamwork Alliance',
    combinedScore: 'Combined Alliance Score',
    officialPoints: 'OFFICIAL POINTS',
    points: 'PTS',
    pts: 'pts',
    onField: 'On Field',
    played: 'Played',
    scheduled: 'Scheduled',
    finalsBadge: 'Finals',
    qualsBadge: 'Quals',
    queueAlert: 'Queue Alert',
    alertActive: 'Alert Active',
    viewBreakdown: 'Breakdown',
    details: 'Details',
    close: 'Close',
    scoringBreakdownTitle: 'Scoring Zone Breakdown',
    l4Goal: 'Level 4 (Top - Yellow)',
    l3Goal: 'Level 3',
    l2Goal: 'Level 2',
    l1Goal: 'Level 1',
    floorGoal: 'Floor Goal',
    clearances: 'Clearances',
    parking: 'Parking / Level Up',
    noBreakdownTitle: 'Detailed Goal Breakdown Not Published',
    noBreakdownDesc: 'Tournament Manager recorded and certified only the official final score for this match.',
    setQueueAlertTitle: 'Set Match Queue Alert',
    queueAlertDesc: "Receive an audible tone and visual notice on your screen before your team's match starts.",
    selectAlertTeam: 'Select Alert Team:',
    alertAheadBy: 'Alert me ahead by:',
    matchesAhead1: '1 match ahead (~5 min)',
    matchesAhead2: '2 matches ahead (~10 min - Recommended)',
    matchesAhead3: '3 matches ahead (~15 min)',
    matchesAhead5: '5 matches ahead (~25 min)',
    testChime: 'Test Audio Chime',
    playingChime: 'Playing chime...',
    cancel: 'Cancel',
    enableAlert: 'Enable Alert',
    soloAlliance: 'Solo',
    exportedTeamSchedule: 'Exported Team {team} schedule (.ics)',
    exportedDivisionSchedule: 'Exported division schedule (.ics)',
    alertSetToast: 'Queue alert set for Team {team} ({ahead} matches ahead)',
    matchNotesTitle: 'Match Scouting Notes',
    matchNotesDesc: 'Alliance strategy, autonomous coordination, and match observations',
    matchNotesPlaceholder: 'Record tactical observations for {match} ({teams}): auto pathing, intake cycle speed, double park execution, desyncs...',
    notesBadge: 'Notes',
    scoutBadge: 'Scout',
    notesSaved: 'Saved to device',
    quickMatchTags: 'Match Tactical Tags',
    clearMatchNotes: 'Clear Notes',
    matchNotesRecorded: 'Match Scouting Notes Recorded'
  },
  vi: {
    scheduleTitle: 'Lịch Thi Đấu & Kết Quả',
    showingMatches: '{count} trận đấu (hiển thị liên minh hợp tác)',
    exportIcs: 'Xuất Lịch (.ics)',
    exportIcsTitle: 'Tải tệp lịch iCalendar (.ics)',
    filterAll: 'Tất cả',
    filterScheduled: 'Sắp đấu',
    filterPlayed: 'Đã đấu',
    filterFinals: 'Chung kết',
    searchPlaceholder: 'Tìm số đội (VD: 79813J) hoặc tên trận...',
    clearFilter: 'Xóa lọc',
    filteredBy: 'Lọc theo',
    noMatchesFound: 'Không tìm thấy trận đấu nào',
    noMatchesDesc: 'Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm số đội của bạn.',
    resetFilters: 'Đặt lại bộ lọc',
    cooperativeAlliance: 'Liên Minh Hợp Tác VIQRC',
    teamworkAlliance: 'Liên minh đồng đội',
    combinedScore: 'Tổng Điểm Liên Minh',
    officialPoints: 'ĐIỂM CHÍNH THỨC',
    points: 'ĐIỂM',
    pts: 'điểm',
    onField: 'Đang Đấu',
    played: 'Đã có điểm',
    scheduled: 'Sắp diễn ra',
    finalsBadge: 'Chung kết',
    qualsBadge: 'Vòng loại',
    queueAlert: 'Báo Giờ',
    alertActive: 'Đang Báo Giờ',
    viewBreakdown: 'Chi Tiết Điểm',
    details: 'Chi Tiết',
    close: 'Đóng',
    scoringBreakdownTitle: 'Chi Tiết Điểm Từng Vùng',
    l4Goal: 'Tầng 4 (Đỉnh - Vàng)',
    l3Goal: 'Tầng 3',
    l2Goal: 'Tầng 2',
    l1Goal: 'Tầng 1',
    floorGoal: 'Khu vực Sàn',
    clearances: 'Dọn Sạch Vùng',
    parking: 'Đỗ Robot / Level Up',
    noBreakdownTitle: 'Server giải đấu chưa công bố chi tiết từng tầng',
    noBreakdownDesc: 'Ban tổ chức giải đấu chỉ ghi nhận và chứng thực tổng điểm số chính thức cho trận đấu này.',
    setQueueAlertTitle: 'Cài Đặt Báo Giờ Ra Sân',
    queueAlertDesc: 'Nhận chuông âm thanh và cảnh báo trên màn hình trước khi trận đấu của đội bạn diễn ra.',
    selectAlertTeam: 'Chọn Đội Nhận Cảnh Báo:',
    alertAheadBy: 'Báo trước bao nhiêu trận:',
    matchesAhead1: '1 trận trước (~5 phút)',
    matchesAhead2: '2 trận trước (~10 phút - Khuyên dùng)',
    matchesAhead3: '3 trận trước (~15 phút)',
    matchesAhead5: '5 trận trước (~25 phút)',
    testChime: 'Thử âm thanh báo giờ',
    playingChime: 'Đang phát chuông...',
    cancel: 'Hủy',
    enableAlert: 'Kích Hoạt Báo Giờ',
    soloAlliance: 'Đấu đơn',
    exportedTeamSchedule: 'Đã tải lịch thi đấu đội {team} (.ics)',
    exportedDivisionSchedule: 'Đã tải toàn bộ lịch thi đấu (.ics)',
    alertSetToast: 'Đã đặt báo giờ cho đội {team} ({ahead} trận trước)',
    matchNotesTitle: 'Ghi Chú Do Thám Trận Đấu',
    matchNotesDesc: 'Chiến thuật liên minh, phối hợp tự hành và quan sát trận đấu',
    matchNotesPlaceholder: 'Ghi chú cho trận {match} ({teams}): đường chạy auto, tốc độ cycle nạp, phối hợp đỗ xe đôi, sự cố lệch auto...',
    notesBadge: 'Ghi chú',
    scoutBadge: 'Do thám',
    notesSaved: 'Đã lưu trên thiết bị',
    quickMatchTags: 'Thẻ chiến thuật trận đấu',
    clearMatchNotes: 'Xóa ghi chú',
    matchNotesRecorded: 'Ghi Chú Do Thám Của Trận Đấu'
  }
};

// ============================================================================
// Helper: Extract Cooperative Alliance Details (Normalizes 1 or 2 alliance schemas)
// VIQRC teamwork matches are 2 partner teams working together.
// NEVER treat them as red vs blue!
// ============================================================================
export function extractMatchAlliance(match) {
  if (!match) {
    return {
      teams: [],
      score: 0,
      isScored: false,
      breakdown: null,
      field: '',
      matchName: 'Match',
      roundName: 'Quals',
      scheduledTime: null,
      isStarted: false,
      isOnField: false
    };
  }

  const teams = [];
  let score = 0;
  let isScored = false;
  let breakdown = match.breakdown || match.score_breakdown || match.details || null;

  // Schema A: alliances array (handles both single alliance or 2 alliance objects with arbitrary red/blue keys)
  if (Array.isArray(match.alliances) && match.alliances.length > 0) {
    for (const alliance of match.alliances) {
      if (!alliance) continue;
      if (typeof alliance.score === 'number' && alliance.score > score) {
        score = alliance.score;
      }
      if (alliance.breakdown && !breakdown) {
        breakdown = alliance.breakdown;
      }
      if (Array.isArray(alliance.teams)) {
        for (const t of alliance.teams) {
          const teamObj = t?.team || t;
          const number = teamObj?.number || teamObj?.code || teamObj?.name || (typeof teamObj === 'string' ? teamObj : '');
          if (number) {
            teams.push({
              number: String(number).trim().toUpperCase(),
              name: teamObj?.name || teamObj?.team_name || '',
              id: teamObj?.id || null,
              sitting: Boolean(t?.sitting)
            });
          }
        }
      }
    }
  } 
  // Schema B: flat teams array
  else if (Array.isArray(match.teams)) {
    for (const t of match.teams) {
      const teamObj = t?.team || t;
      const number = teamObj?.number || teamObj?.code || teamObj?.name || (typeof teamObj === 'string' ? teamObj : '');
      if (number) {
        teams.push({
          number: String(number).trim().toUpperCase(),
          name: teamObj?.name || teamObj?.team_name || '',
          id: teamObj?.id || null
        });
      }
    }
    score = typeof match.score === 'number' ? match.score : 0;
  }

  // Scored flag
  if (match.scored !== undefined) {
    isScored = Boolean(match.scored);
  } else if (match.status) {
    isScored = match.status === 'scored' || match.status === 'completed';
  } else {
    isScored = score > 0;
  }

  // Deduplicate teams by number
  const uniqueTeams = [];
  const seenNumbers = new Set();
  for (const t of teams) {
    if (!seenNumbers.has(t.number)) {
      seenNumbers.add(t.number);
      uniqueTeams.push(t);
    }
  }

  // Round description
  let roundName = 'Quals';
  if (match.round === 6 || (match.name && match.name.toLowerCase().includes('final'))) {
    roundName = 'Finals';
  } else if (match.round === 1 || (match.name && match.name.toLowerCase().includes('practice'))) {
    roundName = 'Practice';
  } else if (match.round === 3) {
    roundName = 'R16';
  } else if (match.round === 4) {
    roundName = 'QF';
  } else if (match.round === 5) {
    roundName = 'SF';
  }

  const isStarted = Boolean(match.started);
  const isOnField = isStarted && !isScored;

  return {
    teams: uniqueTeams,
    score,
    isScored,
    breakdown,
    field: match.field || '',
    matchName: match.name || `Match #${match.matchnum || ''}`,
    roundName,
    scheduledTime: match.scheduled || match.started || null,
    isStarted,
    isOnField
  };
}

// ============================================================================
// Component: Score Breakdown Drawer / Modal
// ============================================================================
export function ScoreBreakdownModal({ match, event, onClose, lang = 'en' }) {
  if (!match) return null;

  const alliance = extractMatchAlliance(match);
  const t = { ...(translations?.[lang] || translations?.en || {}), ...(I18N[lang] || I18N.en) };
  const bd = alliance.breakdown;

  // Extract Level Up specific breakdown fields if available
  const floorPts = bd?.floor_points ?? (bd?.floor !== undefined ? bd.floor * 1 : null);
  const l1Pts = bd?.level1_points ?? bd?.l1_points ?? (bd?.level1 !== undefined ? bd.level1 * 3 : null);
  const l2Pts = bd?.level2_points ?? bd?.l2_points ?? (bd?.level2 !== undefined ? bd.level2 * 6 : null);
  const l3Pts = bd?.level3_points ?? bd?.l3_points ?? (bd?.level3 !== undefined ? bd.level3 * 12 : null);
  const l4Pts = bd?.level4_points ?? bd?.l4_points ?? (bd?.level4 !== undefined ? bd.level4 * 16 : null);
  const clearPts = bd?.clearance_points ?? bd?.clear_points ?? (bd?.cleared !== undefined ? bd.cleared : null);
  const parkPts = bd?.park_points ?? bd?.parking_points ?? (bd?.park !== undefined ? bd.park : null);

  const hasDetailedBreakdown = [floorPts, l1Pts, l2Pts, l3Pts, l4Pts, clearPts, parkPts].some(v => v !== null && v !== undefined);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = orig;
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="breakdown-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 border border-sky-300 dark:border-sky-800">
                {alliance.roundName}
              </span>
              <h3 id="breakdown-title" className="text-lg font-black text-slate-900 dark:text-white">
                {alliance.matchName}
              </h3>
            </div>
            {alliance.field && (
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                {alliance.field}
              </p>
            )}
          </div>
          <button 
            onClick={onClose}
            aria-label="Close score breakdown modal"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          
          {/* Cooperative Alliance Banner */}
          <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wide mb-2">
              <Users className="w-4 h-4 text-sky-500" />
              <span>{t.cooperativeAlliance || 'VIQRC Cooperative Alliance'}</span>
            </div>
            <div className="flex items-center justify-around gap-2">
              {alliance.teams.map((tItem, idx) => (
                <div key={tItem.number || idx} className="text-center flex-1">
                  <div className="text-2xl font-black text-sky-600 dark:text-sky-400">
                    {tItem.number}
                  </div>
                  {tItem.name && (
                    <div className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate max-w-[140px] mx-auto">
                      {tItem.name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Grand Total Score */}
          <div className="text-center py-4 bg-gradient-to-b from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {t.combinedScore || 'Combined Alliance Score'}
            </span>
            <div className="text-5xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
              {alliance.score}
            </div>
            <span className="text-xs font-bold text-sky-500 dark:text-sky-400 tracking-wider">
              {t.officialPoints || 'OFFICIAL POINTS'}
            </span>
          </div>

          {/* Detailed Breakdown or Graceful Fallback */}
          {hasDetailedBreakdown ? (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-sky-500" />
                {t.scoringBreakdownTitle || 'Scoring Zone Breakdown'}
              </h4>

              <div className="grid grid-cols-2 gap-2 text-sm">
                {l4Pts !== null && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <div className="text-xs text-amber-600 dark:text-amber-400 font-bold">
                      {t.l4Goal || 'Level 4 (Top - Yellow)'}
                    </div>
                    <div className="text-lg font-black text-amber-700 dark:text-amber-300 mt-1">
                      {l4Pts} <span className="text-xs font-normal">{t.pts || 'pts'}</span>
                    </div>
                  </div>
                )}
                {l3Pts !== null && (
                  <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30">
                    <div className="text-xs text-sky-600 dark:text-sky-400 font-bold">
                      {t.l3Goal || 'Level 3'}
                    </div>
                    <div className="text-lg font-black text-sky-700 dark:text-sky-300 mt-1">
                      {l3Pts} <span className="text-xs font-normal">{t.pts || 'pts'}</span>
                    </div>
                  </div>
                )}
                {l2Pts !== null && (
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
                    <div className="text-xs text-blue-600 dark:text-blue-400 font-bold">
                      {t.l2Goal || 'Level 2'}
                    </div>
                    <div className="text-lg font-black text-blue-700 dark:text-blue-300 mt-1">
                      {l2Pts} <span className="text-xs font-normal">{t.pts || 'pts'}</span>
                    </div>
                  </div>
                )}
                {l1Pts !== null && (
                  <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
                    <div className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                      {t.l1Goal || 'Level 1'}
                    </div>
                    <div className="text-lg font-black text-indigo-700 dark:text-indigo-300 mt-1">
                      {l1Pts} <span className="text-xs font-normal">{t.pts || 'pts'}</span>
                    </div>
                  </div>
                )}
                {floorPts !== null && (
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <div className="text-xs text-slate-600 dark:text-slate-400 font-bold">
                      {t.floorGoal || 'Floor Goal'}
                    </div>
                    <div className="text-lg font-black text-slate-800 dark:text-slate-200 mt-1">
                      {floorPts} <span className="text-xs font-normal">{t.pts || 'pts'}</span>
                    </div>
                  </div>
                )}
                {clearPts !== null && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                      {t.clearances || 'Clearances'}
                    </div>
                    <div className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-1">
                      {clearPts} <span className="text-xs font-normal">{t.pts || 'pts'}</span>
                    </div>
                  </div>
                )}
                {parkPts !== null && (
                  <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 col-span-2">
                    <div className="text-xs text-purple-600 dark:text-purple-400 font-bold">
                      {t.parking || 'Parking / Level Up'}
                    </div>
                    <div className="text-lg font-black text-purple-700 dark:text-purple-300 mt-1">
                      {parkPts} <span className="text-xs font-normal">{t.pts || 'pts'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-center space-y-2">
              <Info className="w-6 h-6 text-slate-400 dark:text-slate-500 mx-auto" />
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {t.noBreakdownTitle || 'Detailed Goal Breakdown Not Published'}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                {t.noBreakdownDesc || 'Tournament Manager recorded and certified only the official final score for this match.'}
              </p>
            </div>
          )}

          {/* Match Scouting Notes recorded for this match (if any) */}
          {(() => {
            const matchId = match?.id || match?.name;
            const notes = matchId ? getMatchNotes(matchId) : '';
            if (!notes) return null;
            return (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  <FileText className="w-4 h-4 text-amber-500" />
                  <span>{t.matchNotesRecorded || 'Match Scouting Notes Recorded'}</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-medium">
                  {notes}
                </p>
              </div>
            );
          })()}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-sm bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition-opacity min-h-[44px]"
          >
            {t.close || 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Component: Match Scouting Notes Modal (LemonVEX Parity)
// ============================================================================
export function MatchScoutingNotesModal({ match, event, onClose, lang = 'en' }) {
  if (!match) return null;

  const alliance = extractMatchAlliance(match);
  const t = { ...(translations?.[lang] || translations?.en || {}), ...(I18N[lang] || I18N.en) };
  const matchId = match?.id != null ? match.id : match?.name;
  const isVi = lang === 'vi';

  const [notes, setNotes] = useState(() => getMatchNotes(matchId));
  const [isSaved, setIsSaved] = useState(false);
  const saveTimerRef = useRef(null);

  // Sync with storage changes
  useEffect(() => {
    setNotes(getMatchNotes(matchId));
  }, [matchId]);

  useEffect(() => {
    const unsubscribe = subscribeToStorage((detail) => {
      if (!detail?.key || detail.key === STORAGE_KEY_MATCH_NOTES) {
        setNotes(getMatchNotes(matchId));
      }
    });
    return unsubscribe;
  }, [matchId]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = orig;
    };
  }, []);

  const triggerSavedToast = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setIsSaved(true);
    saveTimerRef.current = setTimeout(() => {
      setIsSaved(false);
    }, 2000);
  };

  const handleNotesChange = (e) => {
    const val = e.target.value;
    setNotes(val);
    setMatchNotes(matchId, val);
    triggerSavedToast();
  };

  const handleToggleTag = (tag) => {
    const nextNotes = toggleScoutingTag(notes, tag);
    setNotes(nextNotes);
    setMatchNotes(matchId, nextNotes);
    triggerSavedToast();
  };

  const handleClear = () => {
    setNotes('');
    setMatchNotes(matchId, '');
    triggerSavedToast();
  };

  const quickTags = isVi ? [
    '🤝 Phối hợp ăn ý',
    '⚡ Tốc độ nạp nhanh',
    '⚠️ Lệch autonomous',
    '🏗️ Ghi điểm L3-L4 tốt',
    '🛡️ Quét sạch sàn',
    '🅿️ Đỗ xe đôi chuẩn',
    '⏱️ Dừng sớm cộng điểm',
    '🔋 Pin yếu / Tốc độ chậm'
  ] : [
    '🤝 Great Synergy',
    '⚡ Rapid Cycling',
    '⚠️ Auto Desync',
    '🏗️ High L3-L4 Scoring',
    '🛡️ Floor Cleanout',
    '🅿️ Clean Double Park',
    '⏱️ Stop Time Advantage',
    '🔋 Low Battery / Slow Drive'
  ];

  const teamListString = alliance.teams.map(item => item.number).join(' & ');

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-scout-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                {alliance.roundName}
              </span>
              <h3 id="match-scout-title" className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" />
                {alliance.matchName}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
              <Users className="w-3.5 h-3.5 text-sky-500" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {teamListString || 'Alliance'}
              </span>
              {alliance.field && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span>{alliance.field}</span>
                </>
              )}
            </p>
          </div>
          <button 
            onClick={onClose}
            aria-label="Close match scouting modal"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {t.matchNotesDesc || 'Alliance strategy, autonomous coordination, and match observations'}
            </span>
            {isSaved && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                <Check className="w-3 h-3" />
                <span>{t.notesSaved || 'Saved to device'}</span>
              </span>
            )}
          </div>

          {/* Quick Match Tactical Tags */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400">
              <Tag className="w-3.5 h-3.5 text-amber-500" />
              <span>{t.quickMatchTags || 'Match Tactical Tags'}:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickTags.map((tag) => {
                const isActive = notes.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleToggleTag(tag)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-amber-100 dark:bg-amber-950/80 border-2 border-amber-500 text-amber-900 dark:text-amber-200 shadow-sm'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-500 text-slate-700 dark:text-slate-300 hover:scale-[1.02] active:scale-95'
                    }`}
                  >
                    {isActive && <Check className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />}
                    <span>{tag}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes Textarea */}
          <div className="space-y-2">
            <textarea
              value={notes}
              onChange={handleNotesChange}
              rows={5}
              placeholder={(t.matchNotesPlaceholder || 'Record tactical observations for {match} ({teams}): auto pathing, intake cycle speed, double park execution, desyncs...')
                .replace('{match}', alliance.matchName)
                .replace('{teams}', teamListString)}
              className="w-full p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all resize-y"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
          <button
            type="button"
            onClick={handleClear}
            disabled={!notes}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors disabled:opacity-30 disabled:pointer-events-none min-h-[44px]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t.clearMatchNotes || 'Clear Notes'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-sm bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition-opacity min-h-[44px]"
          >
            {t.close || 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Component: Quick Queue Alert Setup Modal
// ============================================================================
export function QuickQueueAlertModal({ match, onClose, onSave, lang = 'en' }) {
  if (!match) return null;
  const alliance = extractMatchAlliance(match);
  const t = { ...(translations?.[lang] || translations?.en || {}), ...(I18N[lang] || I18N.en) };
  const [selectedTeam, setSelectedTeam] = useState(alliance.teams[0]?.number || '');
  const [matchesAhead, setMatchesAhead] = useState(2);
  const [isTestingAudio, setIsTestingAudio] = useState(false);

  const handleTestChime = async () => {
    setIsTestingAudio(true);
    await playQueueAlertChime({ volume: 0.4 });
    setTimeout(() => setIsTestingAudio(false), 700);
  };

  const handleConfirm = () => {
    if (!selectedTeam) return;
    setQueueAlertConfig({
      teamNumber: selectedTeam,
      matchesAhead: Number(matchesAhead),
      enabled: true
    });
    if (onSave) onSave(selectedTeam, matchesAhead);
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = orig;
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="queue-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <h3 id="queue-modal-title" className="text-base font-black text-slate-900 dark:text-white">
              {t.setQueueAlertTitle || 'Set Match Queue Alert'}
            </h3>
          </div>
          <button 
            onClick={onClose}
            aria-label="Close queue alert modal"
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t.queueAlertDesc || "Receive an audible tone and visual notice on your screen before your team's match starts."}
        </p>

        {/* Team Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t.selectAlertTeam || 'Select Alert Team:'}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {alliance.teams.map((tItem) => (
              <button
                key={tItem.number}
                type="button"
                onClick={() => setSelectedTeam(tItem.number)}
                className={`py-2.5 px-3 rounded-xl border text-sm font-black transition-all min-h-[44px] ${
                  selectedTeam === tItem.number
                    ? 'bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-500/20'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-sky-300'
                }`}
              >
                {tItem.number}
              </button>
            ))}
          </div>
        </div>

        {/* Matches Ahead Threshold */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t.alertAheadBy || 'Alert me ahead by:'}
          </label>
          <select
            value={matchesAhead}
            onChange={(e) => setMatchesAhead(Number(e.target.value))}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 min-h-[44px] focus:ring-2 focus:ring-sky-500"
          >
            <option value={1}>{t.matchesAhead1 || '1 match ahead (~5 min)'}</option>
            <option value={2}>{t.matchesAhead2 || '2 matches ahead (~10 min - Recommended)'}</option>
            <option value={3}>{t.matchesAhead3 || '3 matches ahead (~15 min)'}</option>
            <option value={5}>{t.matchesAhead5 || '5 matches ahead (~25 min)'}</option>
          </select>
        </div>

        {/* Audio Test Button */}
        <div>
          <button
            type="button"
            onClick={handleTestChime}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-xs font-bold transition-colors min-h-[44px]"
          >
            <Volume2 className={`w-4 h-4 ${isTestingAudio ? 'animate-bounce' : ''}`} />
            <span>{isTestingAudio ? (t.playingChime || 'Playing chime...') : (t.testChime || 'Test Audio Chime')}</span>
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px]"
          >
            {t.cancel || 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-md shadow-sky-500/20 transition-all min-h-[44px]"
          >
            {t.enableAlert || 'Enable Alert'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Component: Cooperative Match Card (MANDATORY: NO RED VS BLUE)
// ============================================================================
export const CooperativeMatchCard = React.memo(function CooperativeMatchCard({
  match,
  event,
  onSelectTeam,
  onOpenBreakdown,
  onOpenQueueAlert,
  favorites = [],
  onToggleFavorite,
  activeAlertTeam = null,
  lang = 'en',
  onOpenNotes,
  hasNotes: propHasNotes,
  allMatchNotes = {}
}) {
  const alliance = extractMatchAlliance(match);
  const t = { ...(translations?.[lang] || translations?.en || {}), ...(I18N[lang] || I18N.en) };

  const matchId = match?.id != null ? match.id : match?.name;
  const matchNotes = (allMatchNotes && matchId != null && allMatchNotes[matchId]) || (matchId != null ? getMatchNotes(matchId) : '');
  const hasNotes = propHasNotes !== undefined ? propHasNotes : Boolean(matchNotes && matchNotes.trim().length > 0);

  const isAlertForThisMatch = activeAlertTeam && alliance.teams.some(tItem => tItem.number === activeAlertTeam);
  const hasBreakdownData = Boolean(alliance.breakdown);

  // Single-match .ics export
  const handleExportSingleMatch = (e) => {
    e.stopPropagation();
    exportEventCalendar(event, [match], null, { matchDurationMinutes: 5 });
  };

  return (
    <article 
      className={`relative bg-white dark:bg-slate-900 border rounded-2xl p-4 transition-all duration-200 shadow-sm hover:shadow-md ${
        alliance.isOnField 
          ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/5' 
          : isAlertForThisMatch
            ? 'border-amber-400 dark:border-amber-500/60 bg-amber-500/5'
            : 'border-slate-200 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-700'
      }`}
    >
      {/* Top Header Row: Match Name + Round Badge + Field + Time Status */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-black text-slate-900 dark:text-white">
            {alliance.matchName}
          </span>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
            alliance.roundName === 'Finals'
              ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
              : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
          }`}>
            {alliance.roundName === 'Finals' ? (t.finalsBadge || 'Finals') : (t.qualsBadge || 'Quals')}
          </span>
          {alliance.field && (
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate max-w-[120px]">{alliance.field}</span>
            </span>
          )}
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-1.5 shrink-0">
          {alliance.isOnField ? (
            <span className="flex items-center gap-1 text-[11px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full animate-pulse border border-emerald-300 dark:border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              {t.onField || 'On Field'}
            </span>
          ) : alliance.isScored ? (
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
              {t.played || 'Played'}
            </span>
          ) : alliance.scheduledTime ? (
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {new Date(alliance.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          ) : (
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
              {t.scheduled || 'Scheduled'}
            </span>
          )}
        </div>
      </div>

      {/* Main Cooperative Container: Two Partners Side-by-Side + Joint Score */}
      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3">
        
        {/* Collaborative Partners Pair */}
        <div className="flex-1 flex items-center justify-start gap-2 sm:gap-4 overflow-hidden">
          
          {/* Team 1 */}
          <div className="flex items-center gap-1.5 min-w-0">
            {alliance.teams[0] ? (
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => onSelectTeam && onSelectTeam(alliance.teams[0].number)}
                  className="text-lg sm:text-2xl font-black text-sky-600 dark:text-sky-400 hover:underline tracking-tight block truncate text-left focus:outline-none"
                  title={alliance.teams[0].name || alliance.teams[0].number}
                >
                  {alliance.teams[0].number}
                </button>
                {alliance.teams[0].name && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[90px] sm:max-w-[130px]">
                    {alliance.teams[0].name}
                  </p>
                )}
              </div>
            ) : (
              <span className="text-xs text-slate-400 italic">TBD</span>
            )}

            {/* Favorite Star */}
            {alliance.teams[0] && onToggleFavorite && (
              <button
                type="button"
                onClick={() => onToggleFavorite('teams', alliance.teams[0].number)}
                aria-label={`Favorite team ${alliance.teams[0].number}`}
                className="p-1 text-slate-300 dark:text-slate-600 hover:text-amber-400 transition-colors"
              >
                <Star className={`w-3.5 h-3.5 ${favorites.includes(alliance.teams[0].number) ? 'fill-amber-400 text-amber-400' : ''}`} />
              </button>
            )}
          </div>

          {/* Collaborative Handshake / Alliance Connector */}
          <div className="flex flex-col items-center justify-center shrink-0 px-1">
            <span className="bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/80 px-2 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1">
              <Users className="w-3 h-3 text-sky-500" />
              <span className="hidden sm:inline">&amp;</span>
            </span>
          </div>

          {/* Team 2 */}
          <div className="flex items-center gap-1.5 min-w-0">
            {alliance.teams[1] ? (
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => onSelectTeam && onSelectTeam(alliance.teams[1].number)}
                  className="text-lg sm:text-2xl font-black text-sky-600 dark:text-sky-400 hover:underline tracking-tight block truncate text-left focus:outline-none"
                  title={alliance.teams[1].name || alliance.teams[1].number}
                >
                  {alliance.teams[1].number}
                </button>
                {alliance.teams[1].name && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[90px] sm:max-w-[130px]">
                    {alliance.teams[1].name}
                  </p>
                )}
              </div>
            ) : (
              <span className="text-xs text-slate-400 italic">
                {t.soloAlliance || 'Solo'}
              </span>
            )}

            {/* Favorite Star */}
            {alliance.teams[1] && onToggleFavorite && (
              <button
                type="button"
                onClick={() => onToggleFavorite('teams', alliance.teams[1].number)}
                aria-label={`Favorite team ${alliance.teams[1].number}`}
                className="p-1 text-slate-300 dark:text-slate-600 hover:text-amber-400 transition-colors"
              >
                <Star className={`w-3.5 h-3.5 ${favorites.includes(alliance.teams[1].number) ? 'fill-amber-400 text-amber-400' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Combined Alliance Score (Single Score Display) */}
        <div className="text-right shrink-0 pl-2">
          {alliance.isScored ? (
            <div className="flex flex-col items-end">
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                {alliance.score}
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-0.5">
                {t.points || 'PTS'}
              </span>
            </div>
          ) : (
            <div className="text-lg sm:text-xl font-bold text-slate-300 dark:text-slate-600">
              —
            </div>
          )}
        </div>
      </div>

      {/* Card Footer: Action Bar (Queue Alert, Score Breakdown, Single .ics) */}
      <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
        
        {/* Left Actions: Queue Alert & Match Scouting Notes */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onOpenQueueAlert && onOpenQueueAlert(alliance.teams[0]?.number, match)}
            aria-label={`Set queue alert for match ${alliance.matchName}`}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold text-xs transition-colors min-h-[44px] ${
              isAlertForThisMatch
                ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {isAlertForThisMatch ? (
              <>
                <BellRing className="w-3.5 h-3.5" />
                <span>{t.alertActive || 'Alert Active'}</span>
              </>
            ) : (
              <>
                <Bell className="w-3.5 h-3.5 text-slate-400" />
                <span>{t.queueAlert || 'Queue Alert'}</span>
              </>
            )}
          </button>

          {/* Match Scouting Button */}
          {onOpenNotes && (
            <button
              type="button"
              onClick={() => onOpenNotes(match)}
              aria-label={`Scout notes for ${alliance.matchName}`}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold text-xs transition-colors min-h-[44px] ${
                hasNotes
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <FileText className={`w-3.5 h-3.5 ${hasNotes ? 'text-amber-500' : 'text-slate-400'}`} />
              <span>{hasNotes ? (t.notesBadge || 'Notes') : (t.scoutBadge || 'Scout')}</span>
            </button>
          )}
        </div>

        {/* Right Actions: View Breakdown & Calendar */}
        <div className="flex items-center gap-1.5">
          {alliance.isScored && (
            <button
              type="button"
              onClick={() => onOpenBreakdown && onOpenBreakdown(match)}
              aria-label={`View score breakdown for ${alliance.matchName}`}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold text-xs bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900 border border-sky-200 dark:border-sky-800 transition-colors min-h-[44px]"
            >
              <Layers className="w-3.5 h-3.5 text-sky-500" />
              <span>{hasBreakdownData ? (t.viewBreakdown || 'Breakdown') : (t.details || 'Details')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportSingleMatch}
            aria-label={`Add ${alliance.matchName} to calendar`}
            title={lang === 'vi' ? 'Tải lịch .ics cho trận này' : 'Export .ics for this match'}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <Calendar className="w-4 h-4" />
          </button>
        </div>

      </div>
    </article>
  );
});

// ============================================================================
// Main Export: MatchSchedule Component
// ============================================================================
export default function MatchSchedule({
  event,
  division,
  divisionId,
  matches = [],
  loading = false,
  error = null,
  onRefresh,
  onSelectTeam,
  onOpenQueueAlert: parentOpenQueueAlert,
  lang = 'en'
}) {
  const t = { ...(translations?.[lang] || translations?.en || {}), ...(I18N[lang] || I18N.en) };

  // Filter States
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'scheduled' | 'played' | 'finals'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals State
  const [breakdownMatch, setBreakdownMatch] = useState(null);
  const [queueModalMatch, setQueueModalMatch] = useState(null);
  const [notesModalMatch, setNotesModalMatch] = useState(null);
  
  // Storage State (Favorites, Queue Alerts & Match Notes)
  const [favorites, setFavorites] = useState(() => getFavorites()?.teams || []);
  const [queueConfig, setQueueConfig] = useState(() => getQueueAlertConfig());
  const [allMatchNotes, setAllMatchNotes] = useState(() => getAllMatchNotes());
  const [toastMessage, setToastMessage] = useState(null);

  // Sync with localStorage changes
  useEffect(() => {
    const unsubscribe = subscribeToStorage((detail) => {
      setFavorites(getFavorites()?.teams || []);
      setQueueConfig(getQueueAlertConfig());
      setAllMatchNotes(getAllMatchNotes());
    });
    return unsubscribe;
  }, []);

  const handleToggleFavorite = useCallback((type, id) => {
    toggleFavorite(type, id);
    setFavorites(getFavorites()?.teams || []);
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filtered Matches Memo
  const filteredMatches = useMemo(() => {
    if (!Array.isArray(matches)) return [];

    const query = searchQuery.trim().toUpperCase();

    return matches.filter((match) => {
      const alliance = extractMatchAlliance(match);

      // 1. Status Filter
      if (statusFilter === 'scheduled' && alliance.isScored) return false;
      if (statusFilter === 'played' && !alliance.isScored) return false;
      if (statusFilter === 'finals' && alliance.roundName !== 'Finals') return false;

      // 2. Search Query (Team number, match name, field)
      if (query) {
        const teamMatch = alliance.teams.some(tItem => tItem.number.includes(query) || (tItem.name && tItem.name.toUpperCase().includes(query)));
        const nameMatch = alliance.matchName.toUpperCase().includes(query);
        const fieldMatch = alliance.field.toUpperCase().includes(query);
        if (!teamMatch && !nameMatch && !fieldMatch) return false;
      }

      return true;
    });
  }, [matches, statusFilter, searchQuery]);

  // Counts for pills
  const counts = useMemo(() => {
    if (!Array.isArray(matches)) return { all: 0, scheduled: 0, played: 0, finals: 0 };
    let scheduled = 0;
    let played = 0;
    let finals = 0;

    for (const m of matches) {
      const a = extractMatchAlliance(m);
      if (a.isScored) played++;
      else scheduled++;
      if (a.roundName === 'Finals') finals++;
    }

    return { all: matches.length, scheduled, played, finals };
  }, [matches]);

  // Export full/filtered schedule (.ics)
  const handleExportScheduleIcs = () => {
    const isFilteredByTeam = searchQuery && /^[0-9]+[a-zA-Z]*$/.test(searchQuery.trim());
    const targetTeam = isFilteredByTeam ? searchQuery.trim().toUpperCase() : null;
    
    const success = exportEventCalendar(event, filteredMatches, targetTeam);
    if (success) {
      showToast(
        targetTeam 
          ? (t.exportedTeamSchedule || 'Exported Team {team} schedule (.ics)').replace('{team}', targetTeam)
          : (t.exportedDivisionSchedule || 'Exported division schedule (.ics)')
      );
    }
  };

  // Queue Alert Trigger handler
  const handleTriggerQueueAlert = useCallback((teamNumber, match) => {
    if (parentOpenQueueAlert) {
      parentOpenQueueAlert({ match, teamNumber });
    } else {
      setQueueModalMatch(match);
    }
  }, [parentOpenQueueAlert]);

  const divisionDisplay = division?.name || (divisionId ? `Division ${divisionId}` : '');

  return (
    <div className="space-y-4">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-bold animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Control Header: Schedule Title + Export .ics + Quick Stats */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {t.scheduleTitle || 'Match Schedule & Results'}
            </h2>
            {divisionDisplay && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {divisionDisplay}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {(t.showingMatches || 'Showing {count} collaborative teamwork matches').replace('{count}', filteredMatches.length)}
          </p>
        </div>

        {/* Action Buttons: Export .ics & Refresh */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleExportScheduleIcs}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors min-h-[44px]"
            title={t.exportIcsTitle || 'Download iCalendar (.ics) schedule'}
          >
            <Download className="w-4 h-4 text-sky-500" />
            <span>{t.exportIcs || 'Export .ics'}</span>
          </button>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Refresh match schedule"
            >
              <Clock className={`w-4 h-4 ${loading ? 'animate-spin text-sky-500' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-sm">
        
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all min-h-[44px] ${
              statusFilter === 'all'
                ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.filterAll || 'All'} ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('scheduled')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all min-h-[44px] ${
              statusFilter === 'scheduled'
                ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.filterScheduled || 'Scheduled'} ({counts.scheduled})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('played')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all min-h-[44px] ${
              statusFilter === 'played'
                ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.filterPlayed || 'Played'} ({counts.played})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('finals')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all min-h-[44px] ${
              statusFilter === 'finals'
                ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.filterFinals || 'Finals'} ({counts.finals})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder || 'Filter team # (e.g. 79813J) or match...'}
            className="w-full pl-9 pr-9 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[44px]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 min-w-[30px] min-h-[30px] flex items-center justify-center"
              aria-label="Clear search query"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

      </div>

      {/* Active Team Filter Banner */}
      {searchQuery && (
        <div className="flex items-center justify-between p-2.5 px-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 rounded-xl text-xs text-sky-700 dark:text-sky-300">
          <div className="flex items-center gap-1.5 font-bold">
            <Filter className="w-3.5 h-3.5 text-sky-500" />
            <span>
              {t.filteredBy || 'Filtered by'}: "{searchQuery}" ({filteredMatches.length} {t.pts || 'matches'})
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="font-bold underline hover:opacity-80"
          >
            {t.clearFilter || 'Clear filter'}
          </button>
        </div>
      )}

      {/* Match Cards List */}
      {loading && filteredMatches.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse bg-slate-100 dark:bg-slate-800/50 rounded-2xl p-5 h-28 border border-slate-200 dark:border-slate-800"></div>
          ))}
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
          <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <div className="text-base font-bold text-slate-700 dark:text-slate-300">
            {t.noMatchesFound || 'No matches found'}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
            {t.noMatchesDesc || 'Try adjusting your status filter or search query to find scheduled teamwork matches.'}
          </p>
          {(statusFilter !== 'all' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setSearchQuery('');
              }}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 min-h-[44px]"
            >
              {t.resetFilters || 'Reset Filters'}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredMatches.map((match) => {
            const mId = match.id != null ? match.id : match.name;
            return (
              <CooperativeMatchCard
                key={mId}
                match={match}
                event={event}
                onSelectTeam={onSelectTeam}
                onOpenBreakdown={setBreakdownMatch}
                onOpenQueueAlert={handleTriggerQueueAlert}
                onOpenNotes={setNotesModalMatch}
                hasNotes={Boolean(allMatchNotes && allMatchNotes[mId]?.trim())}
                allMatchNotes={allMatchNotes}
                favorites={favorites}
                onToggleFavorite={handleToggleFavorite}
                activeAlertTeam={queueConfig?.enabled ? queueConfig.teamNumber : null}
                lang={lang}
              />
            );
          })}
        </div>
      )}

      {/* Match Scouting Notes Modal */}
      {notesModalMatch && (
        <MatchScoutingNotesModal
          match={notesModalMatch}
          event={event}
          onClose={() => setNotesModalMatch(null)}
          lang={lang}
        />
      )}

      {/* Score Breakdown Modal */}
      {breakdownMatch && (
        <ScoreBreakdownModal
          match={breakdownMatch}
          event={event}
          onClose={() => setBreakdownMatch(null)}
          lang={lang}
        />
      )}

      {/* Quick Queue Alert Modal */}
      {queueModalMatch && (
        <QuickQueueAlertModal
          match={queueModalMatch}
          onClose={() => setQueueModalMatch(null)}
          onSave={(team, ahead) => {
            showToast(
              (t.alertSetToast || 'Queue alert set for Team {team} ({ahead} matches ahead)')
                .replace('{team}', team)
                .replace('{ahead}', ahead)
            );
          }}
          lang={lang}
        />
      )}

    </div>
  );
}
