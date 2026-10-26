import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  Award, 
  Medal, 
  Sparkles, 
  Target, 
  Search, 
  X, 
  ChevronRight,
  GraduationCap,
  Users
} from 'lucide-react';

const I18N = {
  en: {
    awardsTitle: 'Event Awards & Honors',
    awardsSubtitle: 'Official tournament awards and qualifying distinctions',
    searchPlaceholder: 'Search award or team...',
    allDivisions: 'All Divisions',
    allCategories: 'All Categories',
    excellenceBadge: 'Excellence Award',
    championBadge: 'Tournament Champions',
    skillsBadge: 'Skills Champion',
    designBadge: 'Design Award',
    judgedBadge: 'Judged Award',
    qualifiesTo: 'Qualifies to',
    noAwardsTitle: 'Awards Not Yet Published',
    noAwardsDesc: 'Award recipients will be published here during or after the tournament awards ceremony.',
    noMatchesTitle: 'No awards match your search',
    clearFilter: 'Clear filters',
    winner: 'Winner',
    coWinners: 'Alliance Champions'
  },
  vi: {
    awardsTitle: 'Giải Thưởng & Danh Hiệu',
    awardsSubtitle: 'Danh sách giải thưởng chính thức và suất tham dự giải đấu cao hơn',
    searchPlaceholder: 'Tìm giải thưởng hoặc đội đạt giải...',
    allDivisions: 'Tất cả bảng đấu',
    allCategories: 'Tất cả hạng mục',
    excellenceBadge: 'Giải Xuất Sắc (Excellence)',
    championBadge: 'Vô Địch Liên Minh',
    skillsBadge: 'Vô Địch Kỹ Năng (Skills)',
    designBadge: 'Giải Thiết Kế (Design)',
    judgedBadge: 'Giải Ban Giám Khảo',
    qualifiesTo: 'Đạt suất tham dự',
    noAwardsTitle: 'Chưa công bố giải thưởng',
    noAwardsDesc: 'Danh sách các đội đoạt giải sẽ được cập nhật tại đây trong và sau lễ trao giải của giải đấu.',
    noMatchesTitle: 'Không tìm thấy giải thưởng phù hợp',
    clearFilter: 'Xóa bộ lọc',
    winner: 'Đội đoạt giải',
    coWinners: 'Liên minh vô địch'
  }
};

/**
 * Determine category and styling of award
 */
export function getAwardCategory(award) {
  const title = (award?.title || award?.name || '').toLowerCase();
  const classification = (award?.classification || '').toLowerCase();

  if (title.includes('excellence') || classification === 'excellence') {
    return {
      type: 'excellence',
      label: 'Excellence',
      badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
      iconColor: 'text-amber-500',
      cardBorder: 'border-amber-400/40 dark:border-amber-500/30 ring-1 ring-amber-500/10'
    };
  }
  if (title.includes('skills') || classification === 'skills') {
    return {
      type: 'skills',
      label: 'Skills',
      badgeColor: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
      iconColor: 'text-sky-500',
      cardBorder: 'border-sky-400/40 dark:border-sky-500/30'
    };
  }
  if (title.includes('champion') || title.includes('teamwork') || classification === 'champion') {
    return {
      type: 'champions',
      label: 'Champions',
      badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      iconColor: 'text-emerald-500',
      cardBorder: 'border-emerald-400/40 dark:border-emerald-500/30 ring-1 ring-emerald-500/10'
    };
  }
  if (title.includes('design')) {
    return {
      type: 'design',
      label: 'Design',
      badgeColor: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
      iconColor: 'text-purple-500',
      cardBorder: 'border-purple-400/40 dark:border-purple-500/30'
    };
  }
  return {
    type: 'judged',
    label: 'Judged',
    badgeColor: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
    iconColor: 'text-indigo-500',
    cardBorder: 'border-slate-200 dark:border-slate-800'
  };
}

export default function AwardsList({
  awards = [],
  divisions = [],
  onSelectTeam = null,
  lang = 'en'
}) {
  const t = I18N[lang] || I18N.en;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('all');

  // Filtered awards
  const filteredAwards = useMemo(() => {
    let list = Array.isArray(awards) ? [...awards] : [];

    // Filter by division
    if (selectedDivision !== 'all') {
      list = list.filter(a => {
        if (!a.teamWinners || a.teamWinners.length === 0) return true;
        return a.teamWinners.some(w => String(w.division?.id || w.division) === String(selectedDivision));
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(a => {
        const title = (a.title || a.name || '').toLowerCase();
        if (title.includes(q)) return true;
        if (Array.isArray(a.teamWinners)) {
          return a.teamWinners.some(w => {
            const team = w.team || {};
            const num = (team.number || team.code || team.name || '').toLowerCase();
            const org = (team.organization || '').toLowerCase();
            return num.includes(q) || org.includes(q);
          });
        }
        return false;
      });
    }

    // Sort: Excellence first, then champions, then skills, then design, then order
    list.sort((a, b) => {
      const catA = getAwardCategory(a).type;
      const catB = getAwardCategory(b).type;
      const order = { excellence: 1, champions: 2, skills: 3, design: 4, judged: 5 };
      if (order[catA] !== order[catB]) {
        return (order[catA] || 99) - (order[catB] || 99);
      }
      return (a.order || 0) - (b.order || 0);
    });

    return list;
  }, [awards, selectedDivision, searchQuery]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm space-y-5 animate-fade-in">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              {t.awardsTitle} ({awards.length})
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t.awardsSubtitle}
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            aria-label={t.searchPlaceholder}
            className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl pl-9 pr-8 py-2 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]"
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
      </div>

      {/* Division Selector Filter Pills (if multiple divisions exist) */}
      {divisions.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setSelectedDivision('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all min-h-[38px] ${
              selectedDivision === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300'
            }`}
          >
            {t.allDivisions}
          </button>
          {divisions.map(d => (
            <button
              key={d.id}
              onClick={() => setSelectedDivision(d.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all min-h-[38px] ${
                String(selectedDivision) === String(d.id)
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300'
              }`}
            >
              {d.name}
            </button>
          ))}
        </div>
      )}

      {/* Awards Cards Grid */}
      {awards.length === 0 ? (
        <div className="text-center py-12 px-4 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <Trophy className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-black text-slate-800 dark:text-slate-200">
            {t.noAwardsTitle}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {t.noAwardsDesc}
          </p>
        </div>
      ) : filteredAwards.length === 0 ? (
        <div className="text-center py-10 px-4 space-y-3">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {t.noMatchesTitle}
          </p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedDivision('all'); }}
            className="min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors inline-flex items-center justify-center"
          >
            {t.clearFilter}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredAwards.map((award, idx) => {
            const cat = getAwardCategory(award);
            const title = award.title || award.name || 'Tournament Award';
            const winners = award.teamWinners || [];
            const qualifications = award.qualifications || [];

            return (
              <div
                key={award.id || idx}
                className={`bg-slate-50 dark:bg-slate-800/50 border rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-3 hover:shadow-md transition-all ${cat.cardBorder}`}
              >
                <div>
                  {/* Category Pill + Trophy Icon */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${cat.badgeColor}`}>
                      {cat.label}
                    </span>
                    <div className={`w-8 h-8 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm shrink-0 ${cat.iconColor}`}>
                      {cat.type === 'excellence' && <Sparkles className="w-4 h-4" />}
                      {cat.type === 'champions' && <Trophy className="w-4 h-4" />}
                      {cat.type === 'skills' && <Target className="w-4 h-4" />}
                      {cat.type === 'design' && <Award className="w-4 h-4" />}
                      {cat.type === 'judged' && <Medal className="w-4 h-4" />}
                    </div>
                  </div>

                  {/* Award Name */}
                  <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight">
                    {title}
                  </h4>

                  {/* Qualification Badges if available */}
                  {qualifications.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {qualifications.map((q, qIdx) => (
                        <span key={qIdx} className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                          ★ {t.qualifiesTo}: {q}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Winners Section */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2">
                  {winners.length === 0 ? (
                    <span className="text-xs italic text-slate-400">
                      Winner pending award presentation
                    </span>
                  ) : (
                    <div className="space-y-2">
                      {winners.map((w, wIdx) => {
                        const team = w.team || {};
                        const teamNumber = team.number || team.code || team.name || 'Team';
                        const teamName = team.name || team.team_name || '';
                        const organization = team.organization || '';
                        const divName = w.division?.name || '';

                        return (
                          <div 
                            key={wIdx} 
                            className="flex items-center justify-between gap-2 bg-white dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => onSelectTeam && onSelectTeam(teamNumber)}
                                  className="text-xs sm:text-sm font-black text-cyan-600 dark:text-cyan-400 hover:underline"
                                >
                                  {teamNumber}
                                </button>
                                {divName && (
                                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                    {divName}
                                  </span>
                                )}
                              </div>
                              {(teamName || organization) && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                                  {[teamName, organization].filter(Boolean).join(' • ')}
                                </p>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => onSelectTeam && onSelectTeam(teamNumber)}
                              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-cyan-500 transition-colors"
                              title="View Team Profile"
                              aria-label={`View profile for ${teamNumber}`}
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
