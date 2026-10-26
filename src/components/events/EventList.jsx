import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, 
  Calendar, 
  MapPin, 
  Star, 
  Download, 
  ExternalLink, 
  RefreshCw, 
  X, 
  ChevronRight, 
  Check, 
  Copy, 
  AlertCircle, 
  Filter,
  Sparkles,
  Layers,
  Flame,
  Globe2
} from 'lucide-react';
import { getEvents, getActiveVietnamEvents } from '../../utils/eventsApi';
import { getFavorites, toggleFavorite, subscribeToStorage } from '../../utils/eventsStorage';
import { exportEventCalendar } from '../../utils/icsExport';
import { translations } from '../../constants/translations';

// ============================================================================
// Fallback Bilingual Dictionary (guarantees operation prior to M5 full merge)
// ============================================================================
const I18N = {
  en: {
    pageTitle: 'VEX IQ Live Tournaments',
    pageSubtitle: 'Real-time match tracking, qualification rankings, and cooperative OPR analytics for Level Up 2026–2027.',
    searchPlaceholder: 'Search event name, SKU (RE-VIQRC...), city...',
    allCountries: 'All Countries',
    filterAll: 'All',
    filterLive: 'Live Now',
    filterThisWeek: 'This Week',
    filterUpcoming: 'Upcoming',
    filterRecent: 'Recent',
    filterFavorites: 'Favorites',
    activeVietnamBadge: 'LIVE IN VIETNAM',
    activeVietnamTitle: 'Tournament in Progress in Vietnam',
    multipleVietnamTitle: 'Multiple Live Tournaments in Vietnam',
    multipleVietnamDesc: 'Select an active tournament to view live match schedules and standings:',
    openLiveHub: 'Open Tournament Hub',
    viewAllVietnam: 'View Vietnam Events',
    vietnamSpotlightTitle: 'Vietnam VEX IQ Circuit',
    vietnamSpotlightDesc: '{count} tournaments scheduled for Level Up 2026–2027',
    divisions: 'Divisions',
    exportCalendar: 'Export Schedule (.ics)',
    calendarExported: 'Calendar downloaded!',
    copySku: 'Copy SKU',
    skuCopied: 'Copied!',
    noEventsFound: 'No tournaments found',
    noEventsDesc: 'Try adjusting your search query, temporal filter, or country selection.',
    clearFilters: 'Clear All Filters',
    noFavoritesTitle: 'No Favorite Events Saved',
    noFavoritesDesc: 'Click the star icon (⭐) on any event card to save tournaments here for quick access in the pit.',
    browseAllEvents: 'Browse All Tournaments',
    errorLoading: 'Unable to load tournament data from RobotEvents',
    retry: 'Retry',
    showingCount: 'Showing {count} tournaments',
    liveBadge: 'LIVE NOW',
    todayBadge: 'TODAY',
    upcomingBadge: 'UPCOMING',
    completedBadge: 'COMPLETED'
  },
  vi: {
    pageTitle: 'Giải Đấu VEX IQ Trực Tiếp',
    pageSubtitle: 'Theo dõi tỉ số trực tiếp, lịch thi đấu, xếp hạng và chỉ số OPR mùa giải Level Up 2026–2027.',
    searchPlaceholder: 'Tìm theo tên giải, mã SKU (RE-VIQRC...), thành phố...',
    allCountries: 'Tất cả quốc gia',
    filterAll: 'Tất cả',
    filterLive: 'Đang diễn ra',
    filterThisWeek: 'Tuần này',
    filterUpcoming: 'Sắp tới',
    filterRecent: 'Gần đây',
    filterFavorites: 'Yêu thích',
    activeVietnamBadge: 'ĐANG ĐẤU TẠI VIỆT NAM',
    activeVietnamTitle: 'Giải đấu đang diễn ra tại Việt Nam',
    multipleVietnamTitle: 'Nhiều giải đấu đang diễn ra tại Việt Nam',
    multipleVietnamDesc: 'Chọn giải đấu hoặc bảng đấu để theo dõi trực tiếp:',
    openLiveHub: 'Vào Trang Trực Tiếp',
    viewAllVietnam: 'Xem các giải tại Việt Nam',
    vietnamSpotlightTitle: 'Hệ thống giải VEX IQ Việt Nam',
    vietnamSpotlightDesc: '{count} giải đấu đã đăng ký mùa giải Level Up 2026–2027',
    divisions: 'Bảng đấu',
    exportCalendar: 'Xuất lịch (.ics)',
    calendarExported: 'Đã tải file lịch!',
    copySku: 'Sao chép SKU',
    skuCopied: 'Đã chép!',
    noEventsFound: 'Không tìm thấy giải đấu nào',
    noEventsDesc: 'Thử thay đổi từ khóa tìm kiếm, bộ lọc thời gian hoặc quốc gia.',
    clearFilters: 'Xóa tất cả bộ lọc',
    noFavoritesTitle: 'Chưa có giải đấu yêu thích',
    noFavoritesDesc: 'Nhấn biểu tượng ngôi sao (⭐) trên thẻ giải đấu để lưu lại và truy cập nhanh trong khu vực thi đấu.',
    browseAllEvents: 'Xem tất cả giải đấu',
    errorLoading: 'Không thể tải dữ liệu giải đấu từ RobotEvents',
    retry: 'Thử lại',
    showingCount: 'Hiển thị {count} giải đấu',
    liveBadge: 'ĐANG ĐẤU',
    todayBadge: 'HÔM NAY',
    upcomingBadge: 'SẮP TỚI',
    completedBadge: 'ĐÃ XONG'
  }
};

// Recognized country flag emojis
const COUNTRY_FLAGS = {
  'Vietnam': '🇻🇳',
  'United States': '🇺🇸',
  'China': '🇨🇳',
  'Australia': '🇦🇺',
  'New Zealand': '🇳🇿',
  'Canada': '🇨🇦',
  'United Kingdom': '🇬🇧',
  'Japan': '🇯🇵',
  'Korea, Republic of': '🇰🇷',
  'South Korea': '🇰🇷',
  'Taiwan': '🇹🇼',
  'Hong Kong': '🇭🇰',
  'Thailand': '🇹🇭',
  'Philippines': '🇵🇭',
  'Mexico': '🇲🇽'
};

/**
 * Format date range cleanly for pit display
 */
function formatEventDates(startStr, endStr, lang = 'en') {
  if (!startStr) return '';
  const start = new Date(startStr);
  const end = endStr ? new Date(endStr) : start;
  if (isNaN(start.getTime())) return startStr;

  const startMonth = start.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', { month: 'short' });
  const startDay = start.getDate();
  const startYear = start.getFullYear();

  if (!endStr || isNaN(end.getTime()) || start.toDateString() === end.toDateString()) {
    return lang === 'vi' ? `${startDay} ${startMonth}, ${startYear}` : `${startMonth} ${startDay}, ${startYear}`;
  }

  const endMonth = end.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', { month: 'short' });
  const endDay = end.getDate();
  const endYear = end.getFullYear();

  if (startYear === endYear) {
    if (startMonth === endMonth) {
      return lang === 'vi' 
        ? `${startDay} – ${endDay} ${startMonth}, ${startYear}`
        : `${startMonth} ${startDay} – ${endDay}, ${startYear}`;
    }
    return lang === 'vi'
      ? `${startDay} ${startMonth} – ${endDay} ${endMonth}, ${startYear}`
      : `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${startYear}`;
  }
  return lang === 'vi'
    ? `${startDay} ${startMonth}, ${startYear} – ${endDay} ${endMonth}, ${endYear}`
    : `${startMonth} ${startDay}, ${startYear} – ${endMonth} ${endDay}, ${endYear}`;
}

/**
 * Clean format location text: "City, Country"
 */
function formatEventLocation(loc) {
  if (!loc) return '';
  const city = loc.city?.trim();
  const region = loc.region?.trim();
  const country = loc.country?.trim();

  const parts = [];
  if (city) parts.push(city);
  if (region && region !== city && region !== country) parts.push(region);
  if (country && country !== city) parts.push(country);

  return parts.length > 0 ? parts.join(', ') : (loc.venue || 'Location TBA');
}

/**
 * Calculate status badge and styling
 */
function getEventStatus(event) {
  if (event.ongoing) {
    return { type: 'live', labelKey: 'liveBadge', isLive: true };
  }
  const now = new Date();
  const start = event.start ? new Date(event.start) : null;
  const end = event.end ? new Date(event.end) : start;

  if (start && end) {
    const bufferMs = 12 * 60 * 60 * 1000;
    if (now.getTime() >= start.getTime() - bufferMs && now.getTime() <= end.getTime() + bufferMs) {
      return { type: 'live', labelKey: 'liveBadge', isLive: true };
    }
    if (now.toDateString() === start.toDateString()) {
      return { type: 'today', labelKey: 'todayBadge', isLive: false };
    }
    if (now.getTime() < start.getTime()) {
      return { type: 'upcoming', labelKey: 'upcomingBadge', isLive: false };
    }
    if (now.getTime() > end.getTime()) {
      return { type: 'completed', labelKey: 'completedBadge', isLive: false };
    }
  }
  return { type: 'upcoming', labelKey: 'upcomingBadge', isLive: false };
}

/**
 * EventList Component
 * 
 * Props:
 * - onSelectEvent: (event: Object) => void (callback when user clicks event card to open EventHub)
 * - lang: 'en' | 'vi' (defaults to 'en')
 * - initialCountry: string (optional preset country filter)
 */
export default function EventList({ onSelectEvent, lang = 'en', initialCountry = 'all' }) {
  // Localization dictionary with fallback
  const t = useMemo(() => {
    const parentDict = translations?.[lang] || translations?.en || {};
    const fallbackDict = I18N[lang] || I18N.en;
    return { ...fallbackDict, ...parentDict };
  }, [lang]);

  // Data states
  const [events, setEvents] = useState([]);
  const [vietnamEvents, setVietnamEvents] = useState([]);
  const [activeVietnamEvents, setActiveVietnamEvents] = useState([]);
  const [selectedVietnamEvent, setSelectedVietnamEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearchingApi, setIsSearchingApi] = useState(false);
  const [error, setError] = useState(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [temporalFilter, setTemporalFilter] = useState('all'); // 'all' | 'live' | 'this_week' | 'upcoming' | 'recent' | 'favorites'
  const [countryFilter, setCountryFilter] = useState(initialCountry);

  // Favorites reactive state
  const [favorites, setFavorites] = useState(() => getFavorites());

  // Interactive feedback states
  const [copiedSku, setCopiedSku] = useState(null);
  const [downloadingSku, setDownloadingSku] = useState(null);

  // Subscribe to storage updates (cross-tab & same-tab reactivity)
  useEffect(() => {
    const unsubscribe = subscribeToStorage((detail) => {
      if (!detail?.key || detail.key === 'vexiq_live_favorites') {
        setFavorites(getFavorites());
      }
    });
    return unsubscribe;
  }, []);

  // Fetch initial data: active Vietnam events + worldwide Level Up events
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [vnRes, worldwideRes] = await Promise.allSettled([
        getActiveVietnamEvents(),
        getEvents({ per_page: 100 })
      ]);

      let vnAll = [];
      let vnActive = [];
      if (vnRes.status === 'fulfilled' && vnRes.value) {
        vnAll = vnRes.value.allVietnamEvents || [];
        vnActive = vnRes.value.activeEvents || [];
        setVietnamEvents(vnAll);
        setActiveVietnamEvents(vnActive);
        if (vnActive.length > 0) {
          setSelectedVietnamEvent(vnActive[0]);
        }
      }

      let fetchedWorldwide = [];
      if (worldwideRes.status === 'fulfilled' && worldwideRes.value?.data) {
        fetchedWorldwide = worldwideRes.value.data;
      }

      // Merge and deduplicate by SKU / ID, placing active Vietnam events at top
      const eventMap = new Map();
      vnActive.forEach(e => eventMap.set(e.sku || e.id, e));
      vnAll.forEach(e => {
        if (!eventMap.has(e.sku || e.id)) eventMap.set(e.sku || e.id, e);
      });
      fetchedWorldwide.forEach(e => {
        if (!eventMap.has(e.sku || e.id)) eventMap.set(e.sku || e.id, e);
      });

      setEvents(Array.from(eventMap.values()));
    } catch (err) {
      console.error('[EventList] Error loading events:', err);
      setError(err.message || 'Failed to fetch tournaments');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Search Input & API SKU Lookup
  const handleSearchSubmit = async (e) => {
    e?.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    // If query resembles a SKU (e.g. contains RE- or VE- or IQ), query API
    if (/(RE|VE|IQ)-/i.test(query) || query.length >= 6) {
      setIsSearchingApi(true);
      try {
        const res = await getEvents({ sku: query });
        if (res?.data && res.data.length > 0) {
          const newEvent = res.data[0];
          setEvents(prev => {
            const map = new Map();
            map.set(newEvent.sku || newEvent.id, newEvent);
            prev.forEach(item => {
              if (!map.has(item.sku || item.id)) map.set(item.sku || item.id, item);
            });
            return Array.from(map.values());
          });
        }
      } catch (err) {
        console.warn('[EventList] SKU search failed:', err.message);
      } finally {
        setIsSearchingApi(false);
      }
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = (event, e) => {
    e?.stopPropagation();
    const id = event.sku || event.id;
    toggleFavorite('events', id);
  };

  // Export Calendar (.ics)
  const handleExportIcs = (event, e) => {
    e?.stopPropagation();
    const id = event.sku || event.id;
    setDownloadingSku(id);
    try {
      exportEventCalendar(event, []);
    } catch (err) {
      console.error('[EventList] Calendar export failed:', err);
    } finally {
      setTimeout(() => setDownloadingSku(null), 1200);
    }
  };

  // Copy SKU
  const handleCopySku = (sku, e) => {
    e?.stopPropagation();
    if (!sku) return;
    try {
      navigator.clipboard.writeText(sku);
      setCopiedSku(sku);
      setTimeout(() => setCopiedSku(null), 1500);
    } catch {
      // fallback
    }
  };

  // Extract unique countries for filter dropdown
  const availableCountries = useMemo(() => {
    const countrySet = new Set(['Vietnam', 'United States', 'China', 'Australia', 'New Zealand', 'Canada']);
    events.forEach(e => {
      if (e.location?.country) countrySet.add(e.location.country);
    });
    return Array.from(countrySet).sort((a, b) => {
      if (a === 'Vietnam') return -1;
      if (b === 'Vietnam') return 1;
      return a.localeCompare(b);
    });
  }, [events]);

  // Temporal & Text Filtering Logic
  const filteredEvents = useMemo(() => {
    const now = new Date();
    const query = searchQuery.trim().toLowerCase();

    // Calculate Week start (Monday) and Week end (Sunday)
    const currentDay = now.getDay();
    const diffToMonday = (currentDay + 6) % 7;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - diffToMonday);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return events.filter(event => {
      // 1. Country Filter
      if (countryFilter !== 'all') {
        const eventCountry = (event.location?.country || '').toLowerCase();
        const targetCountry = countryFilter.toLowerCase();
        if (eventCountry !== targetCountry) {
          // Check region fallback (e.g. region='Vietnam')
          const eventRegion = (event.location?.region || '').toLowerCase();
          if (eventRegion !== targetCountry) return false;
        }
      }

      // 2. Temporal Filter
      const isFav = favorites.events.includes(event.sku) || favorites.events.includes(String(event.id));
      if (temporalFilter === 'favorites') {
        if (!isFav) return false;
      } else if (temporalFilter === 'live') {
        const status = getEventStatus(event);
        if (!status.isLive) return false;
      } else if (temporalFilter === 'this_week') {
        if (!event.start) return false;
        const start = new Date(event.start);
        const end = event.end ? new Date(event.end) : start;
        const inWeek = (start <= weekEnd && end >= weekStart);
        if (!inWeek) return false;
      } else if (temporalFilter === 'upcoming') {
        if (!event.start) return false;
        const start = new Date(event.start);
        if (start <= now && !event.ongoing) return false;
      } else if (temporalFilter === 'recent') {
        if (!event.end) return false;
        const end = new Date(event.end);
        if (end >= now || event.ongoing) return false;
      }

      // 3. Text Search Query
      if (query) {
        const nameMatch = (event.name || '').toLowerCase().includes(query);
        const skuMatch = (event.sku || '').toLowerCase().includes(query);
        const cityMatch = (event.location?.city || '').toLowerCase().includes(query);
        const venueMatch = (event.location?.venue || '').toLowerCase().includes(query);
        const regionMatch = (event.location?.region || '').toLowerCase().includes(query);
        const countryMatch = (event.location?.country || '').toLowerCase().includes(query);
        const divisionsMatch = (event.divisions || []).some(d => (d.name || '').toLowerCase().includes(query));

        if (!nameMatch && !skuMatch && !cityMatch && !venueMatch && !regionMatch && !countryMatch && !divisionsMatch) {
          return false;
        }
      }

      return true;
    });
  }, [events, countryFilter, temporalFilter, searchQuery, favorites]);

  // Counts for filter pills
  const counts = useMemo(() => {
    let live = 0;
    let favoritesCount = 0;

    events.forEach(e => {
      if (getEventStatus(e).isLive) live++;
      if (favorites.events.includes(e.sku) || favorites.events.includes(String(e.id))) {
        favoritesCount++;
      }
    });

    return {
      total: events.length,
      live,
      favorites: favoritesCount
    };
  }, [events, favorites]);

  return (
    <div className="w-full flex flex-col space-y-6 pb-12">
      
      {/* ==================================================================== */}
      {/* Hero Header & Quick Summary */}
      {/* ==================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30">
              <Sparkles className="w-3 h-3 text-cyan-500" />
              <span>Level Up 2026–2027</span>
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              • VIQRC
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t.pageTitle}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl mt-0.5">
            {t.pageSubtitle}
          </p>
        </div>

        {/* Refresh & Quick Stats Button */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 shadow-sm transition-all disabled:opacity-50"
            title="Refresh event feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? '...' : (lang === 'vi' ? 'Làm mới' : 'Refresh')}</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* Vietnam Priority Ambient Banner & Multi-Event Picker */}
      {/* ==================================================================== */}
      {activeVietnamEvents.length > 0 ? (
        <section 
          aria-label="Active Vietnam Tournaments"
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-cyan-500/10 border-2 border-rose-500/40 dark:border-rose-500/30 p-4 sm:p-5 shadow-lg shadow-rose-500/5 backdrop-blur-sm"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Banner Left Info */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-rose-500 text-white shadow-sm shadow-rose-500/30">
                  {t.activeVietnamBadge} 🇻🇳
                </span>
                <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
                  {activeVietnamEvents.length > 1 ? t.multipleVietnamTitle : t.activeVietnamTitle}
                </span>
              </div>

              {/* Title & Venue */}
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                  {selectedVietnamEvent?.name || activeVietnamEvents[0]?.name}
                </h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300 mt-1">
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>
                      {selectedVietnamEvent?.location?.venue || selectedVietnamEvent?.location?.city || 'Vietnam'}
                    </span>
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{formatEventDates(selectedVietnamEvent?.start, selectedVietnamEvent?.end, lang)}</span>
                  </span>
                  {selectedVietnamEvent?.divisions?.length > 0 && (
                    <>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 font-bold text-cyan-700 dark:text-cyan-300">
                        <Layers className="w-3.5 h-3.5 shrink-0" />
                        <span>{selectedVietnamEvent.divisions.map(d => d.name).join(', ')}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Banner Right Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onSelectEvent && onSelectEvent(selectedVietnamEvent || activeVietnamEvents[0])}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 via-rose-600 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-black text-xs sm:text-sm shadow-md shadow-rose-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <span>{t.openLiveHub}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Multi-Event Selector Tabs (if 2 or more Vietnam tournaments running simultaneously) */}
          {activeVietnamEvents.length > 1 && (
            <div className="mt-3.5 pt-3 border-t border-rose-500/20">
              <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-2">
                {t.multipleVietnamDesc}
              </p>
              <div className="flex flex-wrap gap-2">
                {activeVietnamEvents.map((evt) => {
                  const isSelected = (selectedVietnamEvent?.sku || activeVietnamEvents[0]?.sku) === evt.sku;
                  const divName = evt.divisions?.[0]?.name || 'Tournament';
                  return (
                    <button
                      key={evt.sku || evt.id}
                      type="button"
                      onClick={() => setSelectedVietnamEvent(evt)}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 scale-[1.02]'
                          : 'bg-white/80 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-rose-500'}`}></span>
                      <span className="truncate max-w-[200px]">{evt.name}</span>
                      <span className="text-[10px] uppercase opacity-75 font-semibold">({divName})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      ) : vietnamEvents.length > 0 && countryFilter !== 'Vietnam' ? (
        /* Vietnam Spotlight Chip (when no events currently ongoing right this second) */
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-red-500/5 via-amber-500/5 to-cyan-500/5 border border-red-500/20 text-xs">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <span className="text-base">🇻🇳</span>
            <span className="font-extrabold text-slate-900 dark:text-white">
              {t.vietnamSpotlightTitle}:
            </span>
            <span className="text-slate-600 dark:text-slate-400 hidden sm:inline">
              {t.vietnamSpotlightDesc.replace('{count}', vietnamEvents.length)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setCountryFilter('Vietnam');
              setTemporalFilter('all');
            }}
            className="px-3 py-1 rounded-xl bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60 font-bold text-xs transition-colors border border-red-200 dark:border-red-800/50 shrink-0"
          >
            {t.viewAllVietnam} ({vietnamEvents.length})
          </button>
        </div>
      ) : null}

      {/* ==================================================================== */}
      {/* Search Bar & Country Selector */}
      {/* ==================================================================== */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-sm space-y-3">
        
        {/* Top search & country row */}
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch gap-2.5">
          
          {/* Search text input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Clear search query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Country Filter Select */}
          <div className="relative sm:w-56 shrink-0">
            <Globe2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer appearance-none transition-all"
            >
              <option value="all">{t.allCountries}</option>
              {availableCountries.map((c) => (
                <option key={c} value={c}>
                  {COUNTRY_FLAGS[c] ? `${COUNTRY_FLAGS[c]} ` : ''}{c}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
              ▼
            </div>
          </div>
        </form>

        {/* Temporal Filters & Favorites Pills */}
        <div className="flex items-center justify-between gap-2 pt-1 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 shrink-0">
            
            {/* Filter: All */}
            <button
              type="button"
              onClick={() => setTemporalFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                temporalFilter === 'all'
                  ? 'bg-slate-900 dark:bg-cyan-500 text-white dark:text-slate-950 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {t.filterAll}
            </button>

            {/* Filter: Live Now */}
            <button
              type="button"
              onClick={() => setTemporalFilter('live')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                temporalFilter === 'live'
                  ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${counts.live > 0 ? 'bg-rose-500 animate-pulse' : 'bg-slate-400'}`}></span>
              <span>{t.filterLive}</span>
              {counts.live > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  temporalFilter === 'live' ? 'bg-rose-700 text-white' : 'bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300'
                }`}>
                  {counts.live}
                </span>
              )}
            </button>

            {/* Filter: This Week */}
            <button
              type="button"
              onClick={() => setTemporalFilter('this_week')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                temporalFilter === 'this_week'
                  ? 'bg-slate-900 dark:bg-cyan-500 text-white dark:text-slate-950 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {t.filterThisWeek}
            </button>

            {/* Filter: Upcoming */}
            <button
              type="button"
              onClick={() => setTemporalFilter('upcoming')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                temporalFilter === 'upcoming'
                  ? 'bg-slate-900 dark:bg-cyan-500 text-white dark:text-slate-950 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {t.filterUpcoming}
            </button>

            {/* Filter: Recent */}
            <button
              type="button"
              onClick={() => setTemporalFilter('recent')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                temporalFilter === 'recent'
                  ? 'bg-slate-900 dark:bg-cyan-500 text-white dark:text-slate-950 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {t.filterRecent}
            </button>

            {/* Filter: Favorites */}
            <button
              type="button"
              onClick={() => setTemporalFilter('favorites')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                temporalFilter === 'favorites'
                  ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${counts.favorites > 0 ? 'fill-amber-400 text-amber-400' : ''}`} />
              <span>{t.filterFavorites}</span>
              {counts.favorites > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  temporalFilter === 'favorites' ? 'bg-amber-700 text-white' : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                }`}>
                  {counts.favorites}
                </span>
              )}
            </button>
          </div>

          {/* Result Count Info */}
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
            {t.showingCount.replace('{count}', filteredEvents.length)}
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* Loading Skeletons */}
      {/* ==================================================================== */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div 
              key={idx} 
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4 animate-pulse shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="w-20 h-5 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
                <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
              </div>
              <div className="space-y-2">
                <div className="w-full h-4 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="w-3/4 h-4 bg-slate-200 dark:bg-slate-800 rounded"></div>
              </div>
              <div className="space-y-1.5 pt-2">
                <div className="w-1/2 h-3.5 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="w-2/3 h-3.5 bg-slate-200 dark:bg-slate-800 rounded"></div>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                <div className="w-16 h-4 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="w-16 h-4 bg-slate-200 dark:bg-slate-800 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        /* Error Message Banner */
        <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <h3 className="font-black text-rose-900 dark:text-rose-200 text-base">
            {t.errorLoading}
          </h3>
          <p className="text-xs text-rose-700 dark:text-rose-300 max-w-md mx-auto">
            {error}
          </p>
          <button
            type="button"
            onClick={loadData}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-sm transition-all"
          >
            {t.retry}
          </button>
        </div>
      ) : filteredEvents.length === 0 ? (
        /* Empty State */
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center space-y-3 shadow-sm">
          {temporalFilter === 'favorites' ? (
            <>
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-500 flex items-center justify-center mx-auto">
                <Star className="w-6 h-6 fill-amber-400" />
              </div>
              <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg">
                {t.noFavoritesTitle}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {t.noFavoritesDesc}
              </p>
              <button
                type="button"
                onClick={() => setTemporalFilter('all')}
                className="mt-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-cyan-500 text-white dark:text-slate-950 font-bold text-xs shadow-sm transition-all"
              >
                {t.browseAllEvents}
              </button>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg">
                {t.noEventsFound}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {t.noEventsDesc}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCountryFilter('all');
                  setTemporalFilter('all');
                }}
                className="mt-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-sm transition-all"
              >
                {t.clearFilters}
              </button>
            </>
          )}
        </div>
      ) : (
        /* ================================================================== */
        /* Event Cards Grid */
        /* ================================================================== */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredEvents.map((event) => {
            const status = getEventStatus(event);
            const isFav = favorites.events.includes(event.sku) || favorites.events.includes(String(event.id));
            const isDownloading = downloadingSku === (event.sku || event.id);
            const isCopied = copiedSku === event.sku;
            const flag = COUNTRY_FLAGS[event.location?.country] || '';

            return (
              <article
                key={event.sku || event.id}
                onClick={() => onSelectEvent && onSelectEvent(event)}
                className="group relative rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 dark:hover:border-cyan-500/50 hover:shadow-md transition-all duration-200 p-4 sm:p-5 flex flex-col justify-between cursor-pointer focus-within:ring-2 focus-within:ring-cyan-500"
              >
                {/* Card Top: Badges & Actions */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    
                    {/* Status Pill */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {status.isLive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                          <span>{t[status.labelKey]}</span>
                        </span>
                      ) : status.type === 'today' ? (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          {t[status.labelKey]}
                        </span>
                      ) : status.type === 'upcoming' ? (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          {t[status.labelKey]}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                          {t[status.labelKey]}
                        </span>
                      )}

                      {/* Vietnam Flag Badge */}
                      {event.location?.country === 'Vietnam' && (
                        <span className="px-1.5 py-0.5 rounded text-[11px] bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-bold border border-red-200 dark:border-red-900/40">
                          🇻🇳 VN
                        </span>
                      )}
                    </div>

                    {/* Card Actions (Favorite & Export Calendar) */}
                    <div className="flex items-center gap-1">
                      
                      {/* .ics Export Button */}
                      <button
                        type="button"
                        onClick={(e) => handleExportIcs(event, e)}
                        className="p-2 rounded-xl text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title={t.exportCalendar}
                        aria-label={t.exportCalendar}
                      >
                        {isDownloading ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                      </button>

                      {/* Favorite Star Button */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleFavorite(event, e)}
                        className={`p-2 rounded-xl transition-colors ${
                          isFav
                            ? 'text-amber-500 hover:text-amber-600'
                            : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                        title={isFav ? 'Remove Favorite' : 'Add to Favorites'}
                        aria-label={isFav ? 'Remove Favorite' : 'Add to Favorites'}
                      >
                        <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Event Title */}
                  <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                    {event.name}
                  </h3>

                  {/* SKU & Copy Action */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleCopySku(event.sku, e)}
                      className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 border border-slate-200 dark:border-slate-700/60 transition-colors"
                      title={t.copySku}
                    >
                      <span>{event.sku}</span>
                      {isCopied ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3 opacity-60" />
                      )}
                    </button>
                  </div>

                  {/* Dates & Location Metadata */}
                  <div className="space-y-1.5 pt-1 text-xs text-slate-600 dark:text-slate-300">
                    {/* Dates */}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-medium">
                        {formatEventDates(event.start, event.end, lang)}
                      </span>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {flag && <span className="mr-1">{flag}</span>}
                        {formatEventLocation(event.location)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Bottom: Divisions & Open CTA */}
                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  
                  {/* Division Pills */}
                  <div className="flex flex-wrap gap-1 max-w-[70%]">
                    {(event.divisions || []).slice(0, 2).map((div) => (
                      <span 
                        key={div.id || div.name}
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/40 truncate max-w-[130px]"
                        title={div.name}
                      >
                        {div.name === 'Default' ? 'Level Up' : div.name}
                      </span>
                    ))}
                    {(event.divisions?.length || 0) > 2 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-400">
                        +{event.divisions.length - 2}
                      </span>
                    )}
                  </div>

                  {/* CTA Arrow */}
                  <div className="flex items-center gap-1 text-xs font-black text-cyan-600 dark:text-cyan-400 group-hover:translate-x-1 transition-transform shrink-0">
                    <span className="hidden sm:inline">{lang === 'vi' ? 'Xem giải' : 'View'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
