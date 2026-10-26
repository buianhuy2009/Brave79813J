import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Search, 
  X, 
  Star, 
  MapPin, 
  School, 
  Bot, 
  SlidersHorizontal, 
  LayoutGrid, 
  List, 
  GitCompare, 
  ChevronRight 
} from 'lucide-react';
import { 
  getFavorites, 
  toggleFavorite, 
  isFavorite, 
  subscribeToStorage 
} from '../../utils/eventsStorage';

const I18N = {
  en: {
    teamsTitle: 'Registered Teams',
    teamsSubtitle: 'Full event team roster with pit location & school information',
    searchPlaceholder: 'Search team #, name, school, or city...',
    allGrades: 'All Grades',
    middleSchool: 'Middle School',
    elementary: 'Elementary',
    starredOnly: 'Favorites',
    viewGrid: 'Grid',
    viewList: 'List',
    team: 'Team',
    name: 'Name',
    organization: 'School / Organization',
    location: 'Location',
    grade: 'Grade',
    actions: 'Actions',
    compare: 'Compare',
    noTeamsTitle: 'No Registered Teams Found',
    noTeamsDesc: 'Team list is not available for this event yet.',
    noMatchesTitle: 'No teams match your search or filter',
    clearFilters: 'Clear filters',
    showingTeams: 'Showing {count} of {total} teams'
  },
  vi: {
    teamsTitle: 'Danh Sách Đội Tham Gia',
    teamsSubtitle: 'Danh sách toàn bộ đội tuyển, trường học và khu vực thi đấu',
    searchPlaceholder: 'Tìm số đội, tên đội, trường học hoặc thành phố...',
    allGrades: 'Tất cả cấp học',
    middleSchool: 'THCS (Middle School)',
    elementary: 'Tiểu học (Elementary)',
    starredOnly: 'Yêu thích',
    viewGrid: 'Thẻ',
    viewList: 'Bảng',
    team: 'Số đội',
    name: 'Tên đội',
    organization: 'Trường / Tổ chức',
    location: 'Khu vực',
    grade: 'Cấp học',
    actions: 'Thao tác',
    compare: 'So sánh',
    noTeamsTitle: 'Chưa có dữ liệu danh sách đội',
    noTeamsDesc: 'Danh sách các đội tham gia chưa được cập nhật cho giải đấu này.',
    noMatchesTitle: 'Không tìm thấy đội nào phù hợp',
    clearFilters: 'Xóa bộ lọc',
    showingTeams: 'Hiển thị {count} / {total} đội'
  }
};

export default function TeamsList({
  teams = [],
  onSelectTeam = null,
  onOpenTeamCompare = null,
  lang = 'en'
}) {
  const t = I18N[lang] || I18N.en;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Reactive favorites list synced with eventsStorage
  const [favorites, setFavorites] = useState(() => {
    try {
      return getFavorites().teams || [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    const unsub = subscribeToStorage((detail) => {
      if (!detail || detail.key === 'vexiq_live_favorites') {
        try {
          setFavorites(getFavorites().teams || []);
        } catch (e) {
          // ignore
        }
      }
    });
    return unsub;
  }, []);

  const handleToggleFav = (e, teamNumber) => {
    e.stopPropagation();
    try {
      toggleFavorite('teams', teamNumber);
      setFavorites(getFavorites().teams || []);
    } catch (err) {
      // ignore
    }
  };

  // Filtered and normalized teams list
  const filteredTeams = useMemo(() => {
    let list = Array.isArray(teams) ? [...teams] : [];

    // Filter by favorites
    if (onlyFavorites) {
      list = list.filter(tm => {
        const num = String(tm.number || tm.code || tm.team_name || tm.name || '').toUpperCase();
        return favorites.includes(num);
      });
    }

    // Filter by grade
    if (selectedGrade !== 'all') {
      list = list.filter(tm => {
        const grade = (tm.grade || '').toLowerCase();
        if (selectedGrade === 'Middle School') return grade.includes('middle');
        if (selectedGrade === 'Elementary') return grade.includes('elementary');
        return true;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(tm => {
        const num = String(tm.number || tm.code || '').toLowerCase();
        const name = String(tm.team_name || tm.name || '').toLowerCase();
        const org = String(tm.organization || tm.school_name || '').toLowerCase();
        const city = String(tm.location?.city || tm.city || '').toLowerCase();
        const region = String(tm.location?.region || tm.region || '').toLowerCase();
        const country = String(tm.location?.country || tm.country || '').toLowerCase();
        return num.includes(q) || name.includes(q) || org.includes(q) || city.includes(q) || region.includes(q) || country.includes(q);
      });
    }

    // Default sort: team number alphanumeric
    list.sort((a, b) => {
      const numA = String(a.number || a.code || '');
      const numB = String(b.number || b.code || '');
      return numA.localeCompare(numB, undefined, { numeric: true });
    });

    return list;
  }, [teams, onlyFavorites, selectedGrade, searchQuery, favorites]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm space-y-5 animate-fade-in">
      
      {/* Top Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              {t.teamsTitle} ({teams.length})
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t.teamsSubtitle}
          </p>
        </div>

        {/* Search Input & View Toggle */}
        <div className="flex items-center gap-2">
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

          {/* Grid / List View Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('grid')}
              aria-label={t.viewGrid}
              className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-sm' : 'text-slate-400'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              aria-label={t.viewList}
              className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-sm' : 'text-slate-400'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <button
          onClick={() => setSelectedGrade('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all min-h-[38px] ${
            selectedGrade === 'all'
              ? 'bg-cyan-500 text-slate-950 shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300'
          }`}
        >
          {t.allGrades}
        </button>
        <button
          onClick={() => setSelectedGrade('Middle School')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all min-h-[38px] ${
            selectedGrade === 'Middle School'
              ? 'bg-cyan-500 text-slate-950 shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300'
          }`}
        >
          {t.middleSchool}
        </button>
        <button
          onClick={() => setSelectedGrade('Elementary')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all min-h-[38px] ${
            selectedGrade === 'Elementary'
              ? 'bg-cyan-500 text-slate-950 shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300'
          }`}
        >
          {t.elementary}
        </button>
        <button
          onClick={() => setOnlyFavorites(prev => !prev)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 min-h-[38px] ${
            onlyFavorites
              ? 'bg-amber-400 text-slate-950 shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:text-amber-500'
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-slate-950 text-slate-950' : 'text-amber-500'}`} />
          <span>{t.starredOnly} ({favorites.length})</span>
        </button>
      </div>

      {/* Main Roster Content */}
      {teams.length === 0 ? (
        <div className="text-center py-12 px-4 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Users className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-black text-slate-800 dark:text-slate-200">
            {t.noTeamsTitle}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {t.noTeamsDesc}
          </p>
        </div>
      ) : filteredTeams.length === 0 ? (
        <div className="text-center py-10 px-4 space-y-3">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {t.noMatchesTitle}
          </p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedGrade('all'); setOnlyFavorites(false); }}
            className="min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors inline-flex items-center justify-center"
          >
            {t.clearFilters}
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View (Cards) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredTeams.map((tm, idx) => {
            const teamNum = String(tm.number || tm.code || tm.team_name || tm.name || 'TBD').toUpperCase();
            const isFav = favorites.includes(teamNum);
            const teamName = tm.team_name || tm.name || '';
            const org = tm.organization || tm.school_name || '';
            const locationStr = [tm.location?.city || tm.city, tm.location?.region || tm.region, tm.location?.country || tm.country].filter(Boolean).join(', ');
            const grade = tm.grade || 'VIQRC';

            return (
              <div
                key={tm.id || teamNum || idx}
                onClick={() => onSelectTeam && onSelectTeam(teamNum)}
                className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 rounded-2xl p-4 flex flex-col justify-between space-y-3 cursor-pointer group transition-all hover:shadow-md"
              >
                <div>
                  {/* Top Bar: Team Number, Grade Pill, Favorite Star */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-cyan-600 dark:text-cyan-400 group-hover:underline tracking-tight">
                        {teamNum}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-200/80 dark:bg-slate-700/80 px-2 py-0.5 rounded-full">
                        {grade}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {onOpenTeamCompare && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onOpenTeamCompare(teamNum); }}
                          aria-label={`Compare ${teamNum}`}
                          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-cyan-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          title={t.compare}
                        >
                          <GitCompare className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleToggleFav(e, teamNum)}
                        aria-label={`Favorite ${teamNum}`}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-amber-400 transition-colors"
                      >
                        <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400 text-amber-500' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Team Name */}
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate mt-1">
                    {teamName || teamNum}
                  </h4>

                  {/* School / Organization */}
                  {org && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5 mt-1">
                      <School className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{org}</span>
                    </p>
                  )}
                </div>

                {/* Card Bottom: Location */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 text-cyan-500 shrink-0" />
                    <span className="truncate">{locationStr || 'Location unlisted'}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="overflow-x-auto -mx-4 sm:mx-0 rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs min-w-[620px]">
            <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 shadow-sm">
              <tr className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                <th className="pb-3 pl-4 sm:pl-3 w-10">★</th>
                <th className="pb-3">{t.team}</th>
                <th className="pb-3">{t.name}</th>
                <th className="pb-3">{t.organization}</th>
                <th className="pb-3">{t.location}</th>
                <th className="pb-3 pr-4 sm:pr-3 text-right">{t.grade}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredTeams.map((tm, idx) => {
                const teamNum = String(tm.number || tm.code || tm.team_name || tm.name || 'TBD').toUpperCase();
                const isFav = favorites.includes(teamNum);
                const teamName = tm.team_name || tm.name || '-';
                const org = tm.organization || tm.school_name || '-';
                const locationStr = [tm.location?.city || tm.city, tm.location?.country || tm.country].filter(Boolean).join(', ') || '-';
                const grade = tm.grade || 'VIQRC';

                return (
                  <tr 
                    key={tm.id || teamNum || idx}
                    onClick={() => onSelectTeam && onSelectTeam(teamNum)}
                    className="hover:bg-cyan-50/40 dark:hover:bg-cyan-950/20 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 pl-4 sm:pl-3" onClick={(e) => handleToggleFav(e, teamNum)}>
                      <button aria-label={`Favorite ${teamNum}`} className="min-w-[44px] min-h-[44px] flex items-center justify-center">
                        <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400 text-amber-500' : 'text-slate-300 dark:text-slate-600'}`} />
                      </button>
                    </td>
                    <td className="py-3">
                      <span className="font-black text-xs sm:text-sm text-cyan-600 dark:text-cyan-400 group-hover:underline">
                        {teamNum}
                      </span>
                    </td>
                    <td className="py-3 text-slate-900 dark:text-white font-bold truncate max-w-[120px]">
                      {teamName}
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-300 truncate max-w-[180px]">
                      {org}
                    </td>
                    <td className="py-3 text-slate-500 truncate max-w-[140px]">
                      {locationStr}
                    </td>
                    <td className="py-3 pr-4 sm:pr-3 text-right">
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        {grade}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer Info */}
      {filteredTeams.length > 0 && (
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span>
            {t.showingTeams.replace('{count}', filteredTeams.length).replace('{total}', teams.length)}
          </span>
          <span className="hidden sm:inline">
            Click any team to view complete scouting analytics & charts
          </span>
        </div>
      )}

    </div>
  );
}
