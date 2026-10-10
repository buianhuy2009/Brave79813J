import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  QrCode, 
  FileText, 
  Check, 
  Copy, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  Share2
} from 'lucide-react';
import QRCode from 'qrcode';
import { getSavedMatches, STORAGE_KEY } from '../utils/storage';
import { translations } from '../constants/translations';

export default function ShareMatchesModal({ isOpen, onClose, lang = 'en' }) {
  const t = translations[lang] || translations.en;
  const isVi = lang === 'vi';

  // Tabs: 'file' or 'qr'
  const [activeTab, setActiveTab] = useState('file');
  const [matches, setMatches] = useState([]);
  const [toastMessage, setToastMessage] = useState('');
  const [copied, setCopied] = useState(false);
  
  const qrCanvasRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const list = getSavedMatches();
      setMatches(list);
    }
  }, [isOpen]);

  // Generate QR code when QR tab is opened
  useEffect(() => {
    if (isOpen && activeTab === 'qr' && qrCanvasRef.current) {
      const list = getSavedMatches();
      // Prepare compact payload for QR (share URL or compressed JSON summary of up to 10 latest runs)
      const compactPayload = list.slice(0, 10).map(m => ({
        id: m.id,
        s: m.score,
        b: m.totalBags,
        t: m.matchType,
        tag: m.sessionTag,
        d: m.matchDate,
        st: m.skillsStopTime,
        m: m.mode
      }));

      const shareData = JSON.stringify({
        source: 'VEXIQ_LevelUp_TeamBrave79813J',
        count: compactPayload.length,
        runs: compactPayload
      });

      QRCode.toCanvas(
        qrCanvasRef.current,
        shareData,
        {
          width: 240,
          margin: 1.5,
          color: {
            dark: '#0f172a',
            light: '#ffffff'
          }
        },
        (error) => {
          if (error) console.error('QR code generation error:', error);
        }
      );
    }
  }, [isOpen, activeTab, matches]);

  if (!isOpen) return null;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Method 1: Export JSON File
  const handleExportFile = () => {
    const list = getSavedMatches();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(list, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `vexiq_levelup_matches_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(isVi ? "Đã tải file lịch sử đấu (.json) về máy!" : "Downloaded match history (.json) file!");
  };

  // Method 1: Import JSON File
  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result);
        if (Array.isArray(imported)) {
          const current = getSavedMatches();
          const existingIds = new Set(current.map(m => m.id));
          const newEntries = imported.filter(m => m && m.id && !existingIds.has(m.id));

          if (newEntries.length === 0) {
            showToast(t.shareNoNewMatches);
          } else {
            const combined = [...newEntries, ...current];
            if (typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
              window.dispatchEvent(new CustomEvent('vexiq_storage_change', { detail: { action: 'import', count: combined.length } }));
            }
            setMatches(combined);
            showToast(t.shareSuccessImport.replace('{count}', newEntries.length));
          }
        } else {
          showToast(isVi ? "Định dạng file không hợp lệ (cần file JSON danh sách trận)!" : "Invalid file format (must be a JSON array of matches)!");
        }
      } catch (err) {
        showToast(isVi ? "Lỗi đọc file JSON!" : "Failed to parse JSON file!");
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  };

  // Copy raw JSON text to clipboard
  const handleCopyRaw = () => {
    const list = getSavedMatches();
    navigator.clipboard.writeText(JSON.stringify(list, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-6 animate-scale-in">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Share2 className="w-5 h-5 text-cyan-500" />
              <span>{t.shareMatches}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.shareMatchesDesc}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2 Methods Selector */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'file'
                ? 'bg-white dark:bg-cyan-500 text-slate-900 dark:text-slate-950 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 text-cyan-500 dark:text-slate-950" />
            <span>{t.shareMethodFile}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'qr'
                ? 'bg-white dark:bg-cyan-500 text-slate-900 dark:text-slate-950 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4 text-cyan-500 dark:text-slate-950" />
            <span>{t.shareMethodQR}</span>
          </button>
        </div>

        {/* Method 1: File Export & Import (.json) */}
        {activeTab === 'file' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2">
              <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white text-sm">
                <span>{isVi ? 'Số trận đang lưu trên máy:' : 'Matches currently on device:'}</span>
                <span className="font-mono text-cyan-600 dark:text-cyan-400 text-base">{matches.length}</span>
              </div>
              <p>
                {isVi 
                  ? 'Tải file .json này về và gửi qua Zalo, AirDrop, Messenger hoặc Drive. Trên thiết bị mới, chỉ cần bấm nút Nhập file là toàn bộ dữ liệu sẽ được hòa nhập an toàn!'
                  : 'Download this .json file and send it via AirDrop, Email, or Drive. On the new device, click Import to merge all runs without losing existing data!'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Export File Button */}
              <button
                type="button"
                onClick={handleExportFile}
                className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-cyan-500 text-slate-950 font-black text-xs sm:text-sm hover:bg-cyan-400 shadow-md shadow-cyan-500/20 transition-all hover:scale-105"
              >
                <Download className="w-4 h-4" />
                <span>{t.exportFileBtn}</span>
              </button>

              {/* Import File Button */}
              <label className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-extrabold text-xs sm:text-sm border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all hover:scale-105 cursor-pointer shadow-sm">
                <Upload className="w-4 h-4 text-cyan-500" />
                <span>{t.importFileBtn}</span>
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleImportFile} 
                  className="hidden" 
                />
              </label>
            </div>

            {/* Copy raw code fallback */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleCopyRaw}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 font-semibold"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? (isVi ? 'Đã sao chép vào bộ nhớ!' : 'Copied to clipboard!') : (isVi ? 'Hoặc sao chép chuỗi mã dữ liệu thô' : 'Or copy raw data string')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Method 2: Scan QR Code */}
        {activeTab === 'qr' && (
          <div className="space-y-4 text-center">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 inline-block shadow-inner">
              <canvas ref={qrCanvasRef} className="rounded-xl mx-auto" />
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              {t.scanQrDesc}
            </p>

            <div className="text-[11px] text-slate-400 font-mono bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
              {matches.length > 0 
                ? (isVi ? `Mã QR mã hóa ${Math.min(10, matches.length)} trận đấu gần nhất.` : `QR Code encodes your latest ${Math.min(10, matches.length)} match runs.`)
                : (isVi ? 'Chưa có trận đấu nào để mã hóa QR.' : 'No matches available to encode into QR yet.')}
            </div>
          </div>
        )}

        {/* Floating Toast Notification inside Modal */}
        {toastMessage && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-600 rounded-2xl flex items-center justify-center gap-2 text-emerald-800 dark:text-emerald-200 text-xs font-bold animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-500" />
            <span>{toastMessage}</span>
          </div>
        )}

      </div>
    </div>
  );
}
