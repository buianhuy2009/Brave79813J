import React from 'react';
import { X, BookOpen } from 'lucide-react';
import { GAME_INFO } from '../constants/rules';

export default function RulesModal({ isOpen, onClose, lang = 'en' }) {
  if (!isOpen) return null;

  const isVi = lang === 'vi';

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-cyan-500" />
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg md:text-xl">
                {GAME_INFO.name} — {isVi ? 'Luật thi đấu & Tính điểm' : 'Scoring & Game Rules'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isVi ? 'Luật chính thức VEX IQ' : 'Official Game Manual'} Version {GAME_INFO.manualVersion} ({GAME_INFO.season})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scoring Table Summary */}
        <div className="space-y-3">
          <h4 className="text-xs font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
            {isVi ? 'Bảng điểm theo mục tiêu' : 'Point Values by Goal Level'}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center font-mono text-xs">
            <div className="bg-amber-50 dark:bg-slate-950 p-3 rounded-2xl border border-amber-300 dark:border-yellow-500/40">
              <span className="text-amber-700 dark:text-yellow-400 font-bold block text-sm">L4 Goal</span>
              <span className="text-xl font-black text-slate-900 dark:text-white block mt-1">16 PTS</span>
              <span className="text-[10px] text-amber-700 dark:text-yellow-300 font-bold">{isVi ? 'CHỈ TÚI VÀNG' : 'Yellow ONLY'}</span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-cyan-500/40">
              <span className="text-cyan-600 dark:text-cyan-400 font-bold block text-sm">L3 Goal</span>
              <span className="text-xl font-black text-slate-900 dark:text-white block mt-1">12 PTS</span>
              <span className="text-[10px] text-slate-400">Red, Blue, Yellow</span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-blue-500/40">
              <span className="text-blue-600 dark:text-blue-400 font-bold block text-sm">L2 Goal</span>
              <span className="text-xl font-black text-slate-900 dark:text-white block mt-1">6 PTS</span>
              <span className="text-[10px] text-slate-400">Red, Blue, Yellow</span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-emerald-500/40">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold block text-sm">L1 Goal</span>
              <span className="text-xl font-black text-slate-900 dark:text-white block mt-1">3 PTS</span>
              <span className="text-[10px] text-slate-400">Red, Blue, Yellow</span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 col-span-2 sm:col-span-1">
              <span className="text-slate-600 dark:text-slate-300 font-bold block text-sm">Floor</span>
              <span className="text-xl font-black text-slate-900 dark:text-white block mt-1">1 PT</span>
              <span className="text-[10px] text-slate-400">{isVi ? 'Trong vùng màu' : 'In color zone'}</span>
            </div>
          </div>
        </div>

        {/* Bean Bag Distribution */}
        <div className="space-y-2">
          <h4 className="text-xs font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
            {isVi ? 'Tổng 38 túi hạt trên sân' : 'Game Pieces (38 Total Bean Bags)'}
          </h4>
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl text-red-700 dark:text-red-300">
              <strong className="block text-base font-black text-slate-900 dark:text-white">16 {isVi ? 'Đỏ' : 'Red'}</strong>
              <span>{isVi ? 'Mục tiêu Đỏ' : 'Red Goals'}</span>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-2xl text-blue-700 dark:text-blue-300">
              <strong className="block text-base font-black text-slate-900 dark:text-white">16 {isVi ? 'Xanh' : 'Blue'}</strong>
              <span>{isVi ? 'Mục tiêu Xanh' : 'Blue Goals'}</span>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-yellow-500/10 border border-amber-200 dark:border-yellow-500/30 rounded-2xl text-amber-700 dark:text-yellow-300">
              <strong className="block text-base font-black text-slate-900 dark:text-white">6 {isVi ? 'Vàng' : 'Yellow'}</strong>
              <span>{isVi ? 'Mọi mục tiêu (Chỉ vàng ở L4)' : 'Any Goal (Only on L4)'}</span>
            </div>
          </div>
        </div>

        {/* Key Rules Highlights */}
        <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
          <h4 className="text-xs font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
            {isVi ? 'Quy định trọng tâm' : 'Key Official Rules'}
          </h4>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
            <strong className="text-amber-600 dark:text-yellow-400">&lt;SC5&gt; {isVi ? 'Mục tiêu đỉnh L4' : 'L4 Top Goal'}:</strong>
            <p>{isVi ? 'Chỉ túi hạt màu VÀNG mới được tính điểm trên L4. Túi đỏ hoặc xanh đặt trên L4 không được tính điểm.' : 'A Bean Bag on L4 is ONLY scored if it is yellow. Red or blue Bean Bags placed on L4 do NOT score any points.'}</p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
            <strong className="text-cyan-600 dark:text-cyan-400">&lt;SC4&gt; {isVi ? 'Ưu tiên tầng cao hơn' : 'Higher Level Precedence'}:</strong>
            <p>{isVi ? 'Nếu một túi hạt tiếp xúc với nhiều tầng khác nhau, điểm sẽ chỉ được tính cho tầng cao nhất.' : 'If a Bean Bag touches multiple levels, it receives points for the higher level only.'}</p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
            <strong className="text-emerald-600 dark:text-emerald-400">&lt;GG11&gt; {isVi ? 'Đổi người lái' : 'Driver Switch Window'}:</strong>
            <p>{isVi ? 'Hai người lái phải đổi tay điều khiển trong khoảng giây 35 đến 25 còn lại.' : 'In Teamwork and Driving Skills, drivers must switch controller around the 35–25 second mark.'}</p>
          </div>
        </div>

        {/* Close Button */}
        <div className="pt-2 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl bg-cyan-500 text-slate-950 font-black hover:bg-cyan-400 text-sm shadow-md"
          >
            {isVi ? 'Đã hiểu' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
}
