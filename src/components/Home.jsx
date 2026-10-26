import React from 'react';
import { 
  Calculator, 
  Clock, 
  History, 
  BookOpen, 
  Bot, 
  Sparkles, 
  Award, 
  ShieldCheck, 
  ArrowRight, 
  Zap, 
  Users, 
  CheckCircle2, 
  Globe2, 
  Heart,
  Flame,
  Layers,
  FileText,
  Code2,
  ExternalLink,
  Compass,
  Radio
} from 'lucide-react';
import { GAME_INFO } from '../constants/rules';
import { translations } from '../constants/translations';

export default function Home({ onNavigate, lang = 'en' }) {
  const t = translations[lang] || translations.en;
  const isVi = lang === 'vi';

  return (
    <div className="space-y-12 pb-16 animate-fadeIn">
      
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-white via-slate-50 to-cyan-50/30 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 border border-slate-200 dark:border-slate-800 p-6 sm:p-10 md:p-12 shadow-xl shadow-cyan-500/5">
        
        {/* Ambient Glowing Blobs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-cyan-400/15 dark:bg-cyan-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500/15 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-400/10 dark:bg-yellow-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          
          {/* Top Pill: Team Brave 79813J Vietnam */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-sm backdrop-blur-md animate-float">
            <span className="text-base">🇻🇳</span>
            <span className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200 tracking-tight">
              {t.homeHeroBadge}
            </span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
          </div>

          {/* Main Hero Headline */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white">
              VEX IQ{' '}
              <span className="bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 bg-clip-text text-transparent">
                LEVEL UP
              </span>
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed font-medium">
              {t.homeHeroSubtitle}
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('calculator')}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm shadow-lg shadow-cyan-500/25 transition-all hover:scale-105 active:scale-95"
            >
              <Calculator className="w-4 h-4 text-slate-950" />
              <span>{t.launchCalculator}</span>
              <ArrowRight className="w-4 h-4 text-slate-950 ml-0.5" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('timer')}
              className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-extrabold text-sm border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:scale-105 active:scale-95"
            >
              <Clock className="w-4 h-4 text-cyan-500" />
              <span>{t.launchTimer}</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('live-events')}
              className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white font-extrabold text-sm shadow-md shadow-rose-500/20 transition-all hover:scale-105 active:scale-95"
            >
              <Radio className="w-4 h-4 text-white animate-pulse" />
              <span>{t.navLiveEvents || (isVi ? 'Giải Đấu Trực Tiếp' : 'Live Events')}</span>
              <span className="flex h-2 w-2 relative ml-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('manual')}
              className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-extrabold text-sm border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:scale-105 active:scale-95"
            >
              <BookOpen className="w-4 h-4 text-amber-500" />
              <span>{t.exploreManual}</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('history')}
              className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-extrabold text-sm border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:scale-105 active:scale-95"
            >
              <History className="w-4 h-4 text-indigo-500" />
              <span>{t.exploreHistory}</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('strategy')}
              className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-extrabold text-sm border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:scale-105 active:scale-95"
            >
              <Compass className="w-4 h-4 text-cyan-500" />
              <span>{t.strategy}</span>
            </button>
          </div>

          {/* Quick Season Stats Bar */}
          <div className="pt-6 border-t border-slate-200/60 dark:border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 backdrop-blur-sm">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                {isVi ? 'Điểm tối đa' : 'Max Perfect Score'}
              </span>
              <span className="text-xl font-black text-amber-500 dark:text-yellow-400">
                480 PTS
              </span>
              <span className="text-[10px] text-slate-500 block">
                {isVi ? 'Tất cả L3 & L4' : 'All scored L3 & L4'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 backdrop-blur-sm">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                {isVi ? 'Thời gian trận' : 'Match Timer'}
              </span>
              <span className="text-xl font-black text-cyan-600 dark:text-cyan-400">
                60s
              </span>
              <span className="text-[10px] text-slate-500 block">
                {isVi ? 'Đổi tay lái 35s-25s' : 'Switch 35s-25s'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 backdrop-blur-sm">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                {isVi ? 'Vật thể ghi điểm' : 'Scoring Objects'}
              </span>
              <span className="text-xl font-black text-slate-900 dark:text-white">
                38 Bags
              </span>
              <span className="text-[10px] text-slate-500 block">
                16 Red • 16 Blue • 6 Yellow
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 backdrop-blur-sm">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                {isVi ? 'Sổ tay chính thức' : 'Game Manual'}
              </span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                v2.1
              </span>
              <span className="text-[10px] text-slate-500 block">
                {isVi ? 'Cập nhật 8/10/2026' : 'Released Oct 8, 2026'}
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* 2. ABOUT TEAM BRAVE 79813J (VIETNAM 🇻🇳) & WHY WE BUILT THIS (Shown Before Features) */}
      <section className="relative rounded-3xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-10 md:p-12 border border-indigo-900/40 shadow-2xl overflow-hidden">
        
        {/* Glow ambient accents */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-black uppercase tracking-wider">
                <span>🇻🇳</span>
                <span>{t.teamStoryBadge}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-2">
                <span>{t.teamStoryTitle}</span>
              </h2>
            </div>

            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-2xl border border-white/10 backdrop-blur-md self-start sm:self-auto">
              <Award className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-mono font-bold text-slate-200">
                VIQRC #79813J
              </span>
            </div>
          </div>

          {/* Team Bio & Story (Honest origin: no ranking / no "we aren't the best" claims) */}
          <div className="space-y-4 text-slate-300 text-xs sm:text-sm md:text-base leading-relaxed">
            <p>
              {t.teamStoryDesc}
            </p>
          </div>

          {/* Why We Built Each Tool */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Flame className="w-5 h-5" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white">
                {t.whyWeMadeTitle}
              </h3>
            </div>

            <div className="space-y-3.5 text-slate-300 text-xs sm:text-sm leading-relaxed">
              <p>{t.whyWeMadeP1}</p>
              <p>{t.whyWeMadeP2}</p>
              <p>{t.whyWeMadeP3}</p>
              <p>{t.whyWeMadeP4}</p>
              <p className="text-cyan-300 font-semibold pt-2 border-t border-white/10">
                {t.teamStoryClosing}
              </p>
            </div>
          </div>

          {/* 3 Pillars: Completely Open Source + Made in Vietnam + Practical & Simple */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            
            {/* Pillar 1: Completely Open Source with GitHub Link */}
            <div className="p-5 rounded-2xl bg-white/5 border border-cyan-500/30 space-y-3 flex flex-col justify-between hover:bg-white/10 transition-colors">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Code2 className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-sm text-white">{t.openSourceTitle}</h4>
                <p className="text-xs text-slate-300 leading-normal">
                  {t.openSourceDesc}
                </p>
              </div>
              <a
                href="https://github.com/buianhuy2009/Brave79813J"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 text-xs font-bold transition-all w-fit border border-cyan-500/40 shadow-sm"
              >
                <span>{t.viewOnGithub}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Pillar 2: Made in Vietnam */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
                <Globe2 className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-sm text-white">{t.vietnamPrideTitle}</h4>
              <p className="text-xs text-slate-400 leading-normal">
                {t.vietnamPrideDesc}
              </p>
            </div>

            {/* Pillar 3: Practical & Simple */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-sm text-white">{t.studentCenteredTitle}</h4>
              <p className="text-xs text-slate-400 leading-normal">
                {t.studentCenteredDesc}
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 2.5 FEATURED LIVE EVENTS BANNER */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-cyan-500/10 dark:from-rose-950/40 dark:via-slate-900 dark:to-cyan-950/30 border-2 border-rose-500/30 dark:border-rose-500/20 p-6 sm:p-8 shadow-xl shadow-rose-500/5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30 text-xs font-black uppercase tracking-wider">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>{isVi ? 'TÍNH NĂNG MỚI • ROBOTEVENTS V2' : 'NEW FEATURE • ROBOTEVENTS V2'}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {t.liveEventsBannerTitle || (isVi ? 'Trung Tâm Giải Đấu Trực Tiếp & Phân Tích Đội Tuyển' : 'Live Tournament & Scouting Station')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              {t.liveEventsBannerSubtitle || (isVi 
                ? 'Tự động tải các giải đấu tại Việt Nam, theo dõi lịch đấu hợp tác, nhận chuông cảnh báo ra sân, tra cứu chỉ số OPR đồng đội và giả lập thứ hạng thế giới ngay trên bàn kỹ thuật pit.' 
                : 'Automatic Vietnam tournament discovery, cooperative alliance tracking (no red/blue defect), Web Audio queue alerts, cooperative OPR ratings, and World Skills rank simulation.')}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                🇻🇳 {isVi ? 'Tự động nhận diện giải VN' : 'Vietnam Auto-Pull'}
              </span>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                🤝 {isVi ? 'Điểm liên minh hợp tác' : 'Cooperative Alliance OPR'}
              </span>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                🔔 {isVi ? 'Báo chuông lên sân' : 'Audio Queue Alerts'}
              </span>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                🎯 {isVi ? 'Giả lập Skills toàn cầu' : 'World Skills Simulator'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('live-events')}
            className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white font-black text-sm shadow-lg shadow-rose-500/25 transition-all hover:scale-105 active:scale-95 shrink-0"
          >
            <Radio className="w-4 h-4 animate-pulse" />
            <span>{t.liveEventsExploreBtn || (isVi ? 'Vào Xem Giải Đấu' : 'Open Live Hub')}</span>
            <ArrowRight className="w-4 h-4 ml-0.5" />
          </button>
        </div>
      </section>

      {/* 3. CORE PLATFORM FEATURES GRID */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-500" />
              <span>{isVi ? 'Bộ công cụ toàn diện' : 'Core Platform Features'}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              {isVi 
                ? 'Thiết kế tinh gọn, chuẩn xác từng điều luật và tối ưu tốc độ cho mỗi buổi luyện tập.' 
                : 'Streamlined, rule-compliant, and optimized for speed in every team practice.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Card 1: Calculator */}
          <div 
            onClick={() => onNavigate('calculator')}
            className="group cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 transition-all transform hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-100 dark:bg-cyan-500/15 flex items-center justify-center text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform">
                <Calculator className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/20">
                {isVi ? 'Mặc định nhanh' : 'Quick & Split'}
              </span>
            </div>
            <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
              {t.featureCalcTitle}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              {t.featureCalcDesc}
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-cyan-600 dark:text-cyan-400">
              <span>{isVi ? 'Bắt đầu tính điểm ngay' : 'Open Calculator'}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: Timer */}
          <div 
            onClick={() => onNavigate('timer')}
            className="group cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all transform hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20">
                {isVi ? 'Video HUD HD' : 'Video HUD & Audio'}
              </span>
            </div>
            <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {t.featureTimerTitle}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              {t.featureTimerDesc}
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
              <span>{isVi ? 'Khởi chạy đồng hồ' : 'Launch Timer'}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 3: Match History */}
          <div 
            onClick={() => onNavigate('history')}
            className="group cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10 transition-all transform hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                <History className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20">
                {isVi ? 'So sánh 2 trận' : 'Head-to-Head'}
              </span>
            </div>
            <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {t.featureHistoryTitle}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              {t.featureHistoryDesc}
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
              <span>{isVi ? 'Xem tiến độ & so sánh' : 'View Analytics'}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 4: Game Manual */}
          <div 
            onClick={() => onNavigate('manual')}
            className="group cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 transition-all transform hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20">
                {isVi ? 'PDF 82 Trang' : 'PDF & Summary'}
              </span>
            </div>
            <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              {t.featureManualTitle}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              {t.featureManualDesc}
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
              <span>{isVi ? 'Mở sổ tay luật đấu' : 'Open Game Manual'}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 5: Live Events */}
          <div 
            onClick={() => onNavigate('live-events')}
            className="group cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:border-rose-500/50 hover:shadow-lg hover:shadow-rose-500/10 transition-all transform hover:-translate-y-1 relative overflow-hidden md:col-span-2"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-500/15 flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/20">
                {isVi ? 'Trực tiếp & OPR' : 'Live & Scouting'}
              </span>
            </div>
            <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
              {t.featureLiveEventsTitle || (isVi ? 'Theo Dõi Giải Đấu & Phân Tích Đối Thủ' : 'Live Tournaments & Scouting Station')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              {t.featureLiveEventsDesc || (isVi 
                ? 'Theo dõi trận đấu trực tiếp từ RobotEvents, giải hệ phương trình OPR hợp tác, phân tích tỉ lệ điểm Skills và nhận cảnh báo âm thanh trước khi đội ra sân thi đấu.' 
                : 'Real-time RobotEvents tournament tracking, regularized cooperative OPR calculations, Driver vs Programming skills split bars, audio queue alerts, and team compare matrix.')}
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
              <span>{isVi ? 'Mở trung tâm giải đấu' : 'Launch Live Events'}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

        </div>
      </section>

      {/* 4. FINAL CALL TO ACTION BANNER */}
      <section className="bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 rounded-3xl p-6 sm:p-8 text-center text-slate-950 shadow-lg shadow-cyan-500/20 space-y-4">
        <h3 className="text-xl sm:text-2xl font-black tracking-tight">
          {t.readyToLevelUp}
        </h3>
        <p className="text-xs sm:text-sm font-semibold max-w-xl mx-auto opacity-90">
          {isVi 
            ? 'Bấm nút bên dưới để bắt đầu tính điểm và khởi động trận đấu ngay lập tức.' 
            : 'Click below to start computing scores and timing your practice runs instantly.'}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => onNavigate('calculator')}
            className="px-6 py-3 rounded-2xl bg-slate-950 text-white hover:bg-slate-900 font-black text-xs sm:text-sm shadow-md transition-all hover:scale-105"
          >
            {t.launchCalculator} →
          </button>
          <button
            type="button"
            onClick={() => onNavigate('timer')}
            className="px-6 py-3 rounded-2xl bg-white/90 hover:bg-white text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all hover:scale-105"
          >
            {t.launchTimer} ⏱️
          </button>
        </div>
      </section>

    </div>
  );
}
