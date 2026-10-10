import React, { useState, useRef, useEffect } from 'react';
import { 
  PenTool, 
  MoveRight, 
  MapPin, 
  Type, 
  Bot, 
  Undo2, 
  Trash2, 
  Download, 
  Save, 
  FolderOpen, 
  Sparkles, 
  Check, 
  Plus, 
  Minus,
  Compass,
  AlertCircle
} from 'lucide-react';
import { translations } from '../constants/translations';

const FIELD_WIDTH = 800;
const FIELD_HEIGHT = 600;

const COLORS = [
  { id: 'cyan', hex: '#06b6d4', label: 'Cyan' },
  { id: 'yellow', hex: '#eab308', label: 'Yellow' },
  { id: 'red', hex: '#ef4444', label: 'Red' },
  { id: 'blue', hex: '#3b82f6', label: 'Blue' },
  { id: 'white', hex: '#ffffff', label: 'White' }
];

export default function StrategyBoard({ lang = 'en' }) {
  const t = translations[lang] || translations.en;
  const isVi = lang === 'vi';

  // Tools: 'pencil', 'arrow', 'waypoint', 'text', 'robot'
  const [activeTool, setActiveTool] = useState('pencil');
  const [selectedColor, setSelectedColor] = useState('#06b6d4');
  const [brushSize, setBrushSize] = useState(4);

  // Canvas elements state
  const [paths, setPaths] = useState([]); // Array of { type, color, size, points, ... }
  const [waypoints, setWaypoints] = useState([]); // Array of { id, num, x, y, color }
  const [textBoxes, setTextBoxes] = useState([]); // Array of { id, text, x, y, color, size }
  const [robotStamp, setRobotStamp] = useState(null); // { x, y, angle }

  // Active interaction state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState([]);
  const [arrowStart, setArrowStart] = useState(null);
  const [arrowCurrent, setArrowCurrent] = useState(null);

  // Text input modal/inline state
  const [pendingTextPos, setPendingTextPos] = useState(null);
  const [inputNoteText, setInputNoteText] = useState('');

  // Routines Storage
  const [routineName, setRoutineName] = useState('Auto Routine 1');
  const [savedRoutines, setSavedRoutines] = useState([]);
  const [feedbackToast, setFeedbackToast] = useState('');

  const canvasRef = useRef(null);

  // Load saved routines from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('vexiq_levelup_strategy_routines_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setSavedRoutines(parsed);
      }
    } catch (e) {}
  }, []);

  const showToast = (msg) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(''), 3000);
  };

  // Redraw canvas whenever elements change
  useEffect(() => {
    drawCanvas();
  }, [paths, waypoints, textBoxes, robotStamp, arrowCurrent]);

  const drawFieldBackground = (ctx) => {
    // Foam tiles background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

    // 8 x 6 foam tile grid (1-foot squares)
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    const tileW = FIELD_WIDTH / 8; // 100px
    const tileH = FIELD_HEIGHT / 6; // 100px

    for (let c = 0; c <= 8; c++) {
      ctx.beginPath();
      ctx.moveTo(c * tileW, 0);
      ctx.lineTo(c * tileW, FIELD_HEIGHT);
      ctx.stroke();
    }
    for (let r = 0; r <= 6; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * tileH);
      ctx.lineTo(FIELD_WIDTH, r * tileH);
      ctx.stroke();
    }

    // Outer perimeter walls
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, FIELD_WIDTH - 6, FIELD_HEIGHT - 6);

    // Robot Starting Zones (Light green dashed lines on edges)
    ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
    ctx.fillRect(10, 10, tileW * 2 - 20, tileH * 2 - 20);
    ctx.fillRect(FIELD_WIDTH - tileW * 2 + 10, FIELD_HEIGHT - tileH * 2 + 10, tileW * 2 - 20, tileH * 2 - 20);

    ctx.fillStyle = 'rgba(16, 185, 129, 0.5)';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('START ZONE A', 20, 30);
    ctx.fillText('START ZONE B', FIELD_WIDTH - tileW * 2 + 20, FIELD_HEIGHT - 20);

    // BLUE PYRAMID (Left side, centered vertically)
    ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(tileW * 1.5, tileH * 1.5, tileW * 2, tileH * 3, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#60a5fa';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('BLUE PYRAMID (L1-L3)', tileW * 1.5 + 15, tileH * 1.5 + 24);

    // RED PYRAMID (Right side, centered vertically)
    ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(tileW * 4.5, tileH * 1.5, tileW * 2, tileH * 3, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('RED PYRAMID (L1-L3)', tileW * 4.5 + 20, tileH * 1.5 + 24);

    // LEVEL 4 TOP GOAL (Center elevated goal)
    ctx.fillStyle = 'rgba(234, 179, 8, 0.3)';
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(FIELD_WIDTH / 2 - 45, FIELD_HEIGHT / 2 - 45, 90, 90, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('L4 TOP GOAL', FIELD_WIDTH / 2, FIELD_HEIGHT / 2 - 8);
    ctx.font = '10px sans-serif';
    ctx.fillText('(Yellow 16 pts)', FIELD_WIDTH / 2, FIELD_HEIGHT / 2 + 12);
    ctx.textAlign = 'left';

    // BEANBAG STARTING POSITIONS (Official layout indicators)
    // Red bags (16 dots)
    ctx.fillStyle = '#ef4444';
    [
      [500, 100], [550, 100], [600, 100], [650, 100],
      [500, 500], [550, 500], [600, 500], [650, 500],
      [700, 200], [700, 250], [700, 350], [700, 400],
      [470, 250], [470, 350], [630, 250], [630, 350]
    ].forEach(([bx, by]) => {
      ctx.beginPath();
      ctx.arc(bx, by, 6, 0, Math.PI * 2);
      ctx.fill();
    });

    // Blue bags (16 dots)
    ctx.fillStyle = '#3b82f6';
    [
      [150, 100], [200, 100], [250, 100], [300, 100],
      [150, 500], [200, 500], [250, 500], [300, 500],
      [100, 200], [100, 250], [100, 350], [100, 400],
      [170, 250], [170, 350], [330, 250], [330, 350]
    ].forEach(([bx, by]) => {
      ctx.beginPath();
      ctx.arc(bx, by, 6, 0, Math.PI * 2);
      ctx.fill();
    });

    // Yellow bags (6 dots)
    ctx.fillStyle = '#eab308';
    [
      [400, 140], [400, 200], [400, 400], [400, 460],
      [280, 300], [520, 300]
    ].forEach(([bx, by]) => {
      ctx.beginPath();
      ctx.arc(bx, by, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Clear and draw background
    ctx.clearRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
    drawFieldBackground(ctx);

    // 1. Draw Paths (Freehand & Arrows)
    paths.forEach(p => {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (p.type === 'freehand' && p.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(p.points[0].x, p.points[0].y);
        for (let i = 1; i < p.points.length; i++) {
          ctx.lineTo(p.points[i].x, p.points[i].y);
        }
        ctx.stroke();
      } else if (p.type === 'arrow') {
        drawArrow(ctx, p.start.x, p.start.y, p.end.x, p.end.y, p.color, p.size);
      }
    });

    // Draw active arrow preview
    if (activeTool === 'arrow' && arrowStart && arrowCurrent) {
      drawArrow(ctx, arrowStart.x, arrowStart.y, arrowCurrent.x, arrowCurrent.y, selectedColor, brushSize);
    }

    // 2. Draw Robot Stamp (12" scaled square robot box)
    if (robotStamp) {
      ctx.save();
      ctx.translate(robotStamp.x, robotStamp.y);
      ctx.rotate(robotStamp.angle || 0);

      const rSize = 55; // ~12 inches scaled
      ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-rSize / 2, -rSize / 2, rSize, rSize, 8);
      ctx.fill();
      ctx.stroke();

      // Heading indicator arrow
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -rSize / 2 + 6);
      ctx.lineTo(10, 4);
      ctx.lineTo(-10, 4);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ROBOT', 0, 16);
      ctx.restore();
    }

    // 3. Draw Numbered Waypoints (① ② ③)
    waypoints.forEach(wp => {
      ctx.save();
      ctx.fillStyle = wp.color || '#06b6d4';
      ctx.beginPath();
      ctx.arc(wp.x, wp.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(wp.num, wp.x, wp.y);
      ctx.restore();
    });

    // 4. Draw Text Boxes / Annotations
    textBoxes.forEach(tb => {
      ctx.save();
      ctx.font = `bold ${tb.size || 13}px sans-serif`;
      const textWidth = ctx.measureText(tb.text).width;
      const pad = 6;

      // Label background pill
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = tb.color || '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(tb.x - pad, tb.y - 14 - pad, textWidth + pad * 2, 22 + pad, 6);
      ctx.fill();
      ctx.stroke();

      // Text
      ctx.fillStyle = tb.color || '#ffffff';
      ctx.textBaseline = 'top';
      ctx.fillText(tb.text, tb.x, tb.y - 12);
      ctx.restore();
    });
  };

  const drawArrow = (ctx, fromx, fromy, tox, toy, color, size) => {
    const headlen = 16;
    const dx = tox - fromx;
    const dy = toy - fromy;
    const angle = Math.atan2(dy, dx);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';

    // Line
    ctx.beginPath();
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.stroke();

    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(tox, toy);
    ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = FIELD_WIDTH / rect.width;
    const scaleY = FIELD_HEIGHT / rect.height;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  // Pointer Handlers
  const handlePointerDown = (e) => {
    const pos = getCanvasCoords(e);

    if (activeTool === 'pencil') {
      setIsDrawing(true);
      setCurrentPoints([pos]);
    } else if (activeTool === 'arrow') {
      setIsDrawing(true);
      setArrowStart(pos);
      setArrowCurrent(pos);
    } else if (activeTool === 'waypoint') {
      const nextNum = waypoints.length + 1;
      setWaypoints([...waypoints, { id: 'wp_' + Date.now(), num: nextNum, x: pos.x, y: pos.y, color: selectedColor }]);
    } else if (activeTool === 'robot') {
      setRobotStamp({ x: pos.x, y: pos.y, angle: 0 });
    } else if (activeTool === 'text') {
      setPendingTextPos(pos);
    }
  };

  const handlePointerMove = (e) => {
    if (!isDrawing) return;
    const pos = getCanvasCoords(e);

    if (activeTool === 'pencil') {
      const newPoints = [...currentPoints, pos];
      setCurrentPoints(newPoints);

      const canvas = canvasRef.current;
      if (canvas && newPoints.length > 1) {
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = selectedColor;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        const p1 = newPoints[newPoints.length - 2];
        const p2 = newPoints[newPoints.length - 1];
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    } else if (activeTool === 'arrow') {
      setArrowCurrent(pos);
    }
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (activeTool === 'pencil' && currentPoints.length > 1) {
      setPaths([...paths, { type: 'freehand', points: currentPoints, color: selectedColor, size: brushSize }]);
      setCurrentPoints([]);
    } else if (activeTool === 'arrow' && arrowStart && arrowCurrent) {
      // Only record if dragged at least 15px
      const dist = Math.hypot(arrowCurrent.x - arrowStart.x, arrowCurrent.y - arrowStart.y);
      if (dist > 15) {
        setPaths([...paths, { type: 'arrow', start: arrowStart, end: arrowCurrent, color: selectedColor, size: brushSize }]);
      }
      setArrowStart(null);
      setArrowCurrent(null);
    }
  };

  // Add confirmed text note
  const handleConfirmTextNote = (e) => {
    e.preventDefault();
    if (!pendingTextPos || !inputNoteText.trim()) {
      setPendingTextPos(null);
      return;
    }
    setTextBoxes([...textBoxes, {
      id: 'tb_' + Date.now(),
      text: inputNoteText.trim(),
      x: pendingTextPos.x,
      y: pendingTextPos.y,
      color: selectedColor,
      size: 13
    }]);
    setInputNoteText('');
    setPendingTextPos(null);
  };

  // Undo last action
  const handleUndo = () => {
    if (paths.length > 0) {
      setPaths(paths.slice(0, -1));
    } else if (waypoints.length > 0) {
      setWaypoints(waypoints.slice(0, -1));
    } else if (textBoxes.length > 0) {
      setTextBoxes(textBoxes.slice(0, -1));
    } else if (robotStamp) {
      setRobotStamp(null);
    }
  };

  // Clear All
  const handleClear = () => {
    if (window.confirm(isVi ? 'Bạn có chắc muốn xóa toàn bộ bảng chiến thuật?' : 'Clear all drawings, arrows, and waypoints?')) {
      setPaths([]);
      setWaypoints([]);
      setTextBoxes([]);
      setRobotStamp(null);
      showToast(isVi ? 'Đã làm sạch bảng chiến thuật.' : 'Board cleared.');
    }
  };

  // Export 1-Click High-Res PNG
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const imageURL = canvas.toDataURL('image/png');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', imageURL);
    downloadAnchor.setAttribute('download', `VEXIQ_LevelUp_Strategy_${routineName.replace(/\s+/g, '_')}.png`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(isVi ? 'Đã xuất ảnh chiến thuật PNG thành công!' : 'Exported strategy board PNG!');
  };

  // Save routine to localStorage
  const handleSaveRoutine = () => {
    const newRoutine = {
      id: 'routine_' + Date.now(),
      name: routineName.trim() || 'Untitled Routine',
      timestamp: new Date().toISOString(),
      paths,
      waypoints,
      textBoxes,
      robotStamp
    };

    const existing = savedRoutines.filter(r => r.name !== newRoutine.name);
    const updated = [newRoutine, ...existing];
    setSavedRoutines(updated);
    try {
      localStorage.setItem('vexiq_levelup_strategy_routines_v1', JSON.stringify(updated));
    } catch (e) {}
    showToast(isVi ? `Đã lưu chiến thuật "${newRoutine.name}"!` : `Saved plan "${newRoutine.name}"!`);
  };

  // Load a saved routine
  const handleLoadRoutine = (routine) => {
    setRoutineName(routine.name);
    setPaths(routine.paths || []);
    setWaypoints(routine.waypoints || []);
    setTextBoxes(routine.textBoxes || []);
    setRobotStamp(routine.robotStamp || null);
    showToast(isVi ? `Đã nạp chiến thuật "${routine.name}"!` : `Loaded plan "${routine.name}"!`);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30">
              6' x 8' Official Field
            </span>
            <span className="text-xs text-slate-400 font-mono">Team Brave #79813J</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Compass className="w-6 h-6 text-cyan-500" />
            <span>{t.strategyBoard}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            {t.strategyDesc}
          </p>
        </div>

        {/* Action Controls: Routine Name, Save, Export PNG */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={routineName}
            onChange={(e) => setRoutineName(e.target.value)}
            placeholder={t.routineName}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 w-44"
          />

          <button
            type="button"
            onClick={handleSaveRoutine}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 text-xs font-bold transition-all shadow-sm"
            title={t.saveRoutine}
          >
            <Save className="w-4 h-4 text-cyan-500" />
            <span>{t.saveRoutine}</span>
          </button>

          <button
            type="button"
            onClick={handleExportPNG}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-md shadow-cyan-500/20 transition-all hover:scale-105 active:scale-95"
            title={t.exportPNG}
          >
            <Download className="w-4 h-4 text-slate-950" />
            <span>{t.exportPNG}</span>
          </button>
        </div>
      </div>

      {/* Main Drawing Suite */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
        
        {/* Tool Palette Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          
          {/* Tool selector buttons */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTool('pencil')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTool === 'pencil'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>{t.pencilTool}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('arrow')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTool === 'arrow'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MoveRight className="w-3.5 h-3.5" />
              <span>{t.arrowTool}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('waypoint')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTool === 'waypoint'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{t.waypointTool}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('text')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTool === 'text'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>{t.textTool}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('robot')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTool === 'robot'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>{t.robotTool}</span>
            </button>
          </div>

          {/* Color Palette */}
          <div className="flex items-center gap-1.5">
            {COLORS.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedColor(c.hex)}
                style={{ backgroundColor: c.hex }}
                className={`w-6 h-6 rounded-full border-2 transition-all ${
                  selectedColor === c.hex ? 'border-white scale-125 shadow-md' : 'border-transparent opacity-80 hover:opacity-100'
                }`}
                title={c.label}
              />
            ))}

            {/* Thickness selector */}
            <div className="flex items-center gap-1 ml-2 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              {[2, 4, 7].map(sz => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setBrushSize(sz)}
                  className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                    brushSize === sz ? 'bg-cyan-500 text-slate-950' : 'text-slate-500'
                  }`}
                >
                  {sz === 2 ? 'S' : sz === 4 ? 'M' : 'L'}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Undo & Clear */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUndo}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-cyan-500 text-xs font-semibold"
              title={t.undoTool}
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-xs font-semibold"
              title={t.clearCanvas}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Instructions banner for active tool */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-500" />
            <span>
              {activeTool === 'pencil' && (isVi ? 'Nhấp giữ chuột/ngón tay để vẽ tự do đường di chuyển.' : 'Click and drag to sketch freehand robot paths.')}
              {activeTool === 'arrow' && (isVi ? 'Kéo từ điểm đầu sang điểm cuối để vẽ mũi tên chỉ hướng.' : 'Drag from start to end to draw directional motion arrows.')}
              {activeTool === 'waypoint' && (isVi ? 'Nhấp vào sân để đặt điểm mốc số thứ tự (① ② ③...).' : 'Click anywhere to drop numbered sequence waypoints (① ② ③...).')}
              {activeTool === 'text' && (isVi ? 'Nhấp vào sân để thêm ghi chú chữ.' : 'Click on the field to place an annotation text box.')}
              {activeTool === 'robot' && (isVi ? 'Nhấp vào sân để đặt biểu tượng Robot kích thước chuẩn 12".' : 'Click to place a scaled 12" x 12" Robot box.')}
            </span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">800 × 600 px (4:3)</span>
        </div>

        {/* Interactive Canvas Field Container */}
        <div className="relative rounded-2xl overflow-hidden border-2 border-slate-800 shadow-2xl bg-slate-950 select-none touch-none">
          <canvas
            ref={canvasRef}
            width={FIELD_WIDTH}
            height={FIELD_HEIGHT}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="w-full h-auto cursor-crosshair block"
          />

          {/* Modal / Dialog to Add Text Note when clicked */}
          {pendingTextPos && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
              <form onSubmit={handleConfirmTextNote} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-3 max-w-sm w-full">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Type className="w-4 h-4 text-cyan-500" />
                    <span>{t.textTool}</span>
                  </h4>
                  <button type="button" onClick={() => setPendingTextPos(null)} className="text-slate-400 hover:text-white">
                    ×
                  </button>
                </div>
                <input
                  type="text"
                  autoFocus
                  placeholder={t.enterNoteText}
                  value={inputNoteText}
                  onChange={(e) => setInputNoteText(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingTextPos(null)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-cyan-500 text-slate-950 shadow-sm"
                  >
                    Place Note
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Saved Routines Browser */}
        {savedRoutines.length > 0 && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">
              {isVi ? 'Các chiến thuật đã lưu:' : 'Saved Strategies on Device:'}
            </span>
            <div className="flex flex-wrap gap-2">
              {savedRoutines.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleLoadRoutine(r)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    routineName === r.name
                      ? 'bg-cyan-500 text-slate-950 border-cyan-500 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                  }`}
                >
                  📍 {r.name}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Floating Notification */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-900 text-white border border-cyan-500/50 shadow-2xl shadow-cyan-500/20 animate-bounce">
          <Check className="w-5 h-5 text-cyan-400" />
          <span className="text-xs sm:text-sm font-bold">{feedbackToast}</span>
        </div>
      )}

    </div>
  );
}
