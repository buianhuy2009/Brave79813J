import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Maximize2, 
  Minimize2, 
  RotateCw, 
  Plus, 
  Check, 
  Compass, 
  Sparkles, 
  X
} from 'lucide-react';
import { translations } from '../constants/translations';

// Official VEX IQ Level Up Field dimensions matching the real image (1024 x 792)
const FIELD_WIDTH = 1024;
const FIELD_HEIGHT = 792;

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
  const [brushSize, setBrushSize] = useState(4); // 3 (S), 6 (M), 10 (L)

  // Canvas elements state
  const [paths, setPaths] = useState([]); // { type: 'freehand' | 'arrow', color, size, points, start, end }
  const [waypoints, setWaypoints] = useState([]); // { id, num, x, y, color }
  const [textBoxes, setTextBoxes] = useState([]); // { id, text, x, y, color, size }
  const [robotStamp, setRobotStamp] = useState(null); // { x, y, angle }

  // Active interaction state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState([]);
  const [arrowStart, setArrowStart] = useState(null);
  const [arrowCurrent, setArrowCurrent] = useState(null);

  // Text input modal state
  const [pendingTextPos, setPendingTextPos] = useState(null);
  const [inputNoteText, setInputNoteText] = useState('');

  // Routines Storage
  const [routineName, setRoutineName] = useState('Auto Routine 1');
  const [savedRoutines, setSavedRoutines] = useState([]);
  const [feedbackToast, setFeedbackToast] = useState('');

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const fieldImageRef = useRef(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  // Preload real field image
  useEffect(() => {
    const img = new Image();
    img.src = '/assets/field_levelup.jpg';
    img.onload = () => {
      fieldImageRef.current = img;
      setIsImageLoaded(true);
    };
    img.onerror = () => {
      console.warn('Could not load /assets/field_levelup.jpg, falling back to vector rendering');
      setIsImageLoaded(false);
    };
  }, []);

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
    setTimeout(() => setFeedbackToast(''), 2500);
  };

  // Keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'p' || e.key === 'P') setActiveTool('pencil');
      if (e.key === 'a' || e.key === 'A') setActiveTool('arrow');
      if (e.key === 'w' || e.key === 'W') setActiveTool('waypoint');
      if (e.key === 't' || e.key === 'T') setActiveTool('text');
      if (e.key === 'r' || e.key === 'R') {
        if (activeTool === 'robot' && robotStamp) {
          handleRotateRobot();
        } else {
          setActiveTool('robot');
        }
      }
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      if (e.key === 'Escape') {
        if (pendingTextPos) setPendingTextPos(null);
        if (isFullscreen) exitFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool, robotStamp, pendingTextPos, isFullscreen]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {
          setIsFullscreen(true);
        });
      } else {
        setIsFullscreen(true);
      }
    } else {
      exitFullscreen();
    }
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setIsFullscreen(false);
  };

  // Fallback vector field renderer if image hasn't loaded yet
  const drawVectorFieldFallback = (ctx) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

    // 8 x 6 foam tile grid (1-foot squares)
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    const tileW = FIELD_WIDTH / 8;
    const tileH = FIELD_HEIGHT / 6;

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

    // Level 4 Goal & Pyramids
    ctx.fillStyle = 'rgba(234, 179, 8, 0.2)';
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 3;
    ctx.strokeRect(FIELD_WIDTH / 2 - 50, FIELD_HEIGHT / 2 - 50, 100, 100);

    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('L4 TOP GOAL', FIELD_WIDTH / 2, FIELD_HEIGHT / 2 + 5);
  };

  // Main draw canvas routine
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

    // 1. Draw Actual Field Picture
    if (fieldImageRef.current && isImageLoaded) {
      try {
        ctx.drawImage(fieldImageRef.current, 0, 0, FIELD_WIDTH, FIELD_HEIGHT);
      } catch (e) {
        drawVectorFieldFallback(ctx);
      }
    } else {
      drawVectorFieldFallback(ctx);
    }

    // Subtle dark vignette/border around the field
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, FIELD_WIDTH - 4, FIELD_HEIGHT - 4);

    // 2. Draw Paths (Freehand & Arrows)
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

    // 3. Draw Robot Stamp (12" scaled square robot box ~ 75px)
    if (robotStamp) {
      ctx.save();
      ctx.translate(robotStamp.x, robotStamp.y);
      ctx.rotate((robotStamp.angle || 0) * (Math.PI / 180));

      const rSize = 72; // Scaled ~12 inches on 1024px canvas
      
      // Robot chassis
      ctx.fillStyle = 'rgba(6, 182, 212, 0.45)';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(-rSize / 2, -rSize / 2, rSize, rSize, 10);
      ctx.fill();
      ctx.stroke();

      // Omni wheels accent (left & right sides)
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-rSize / 2 - 4, -rSize / 2 + 10, 5, 20);
      ctx.fillRect(-rSize / 2 - 4, rSize / 2 - 30, 5, 20);
      ctx.fillRect(rSize / 2 - 1, -rSize / 2 + 10, 5, 20);
      ctx.fillRect(rSize / 2 - 1, rSize / 2 - 30, 5, 20);

      // Heading indicator triangle (Pointing UP)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -rSize / 2 + 8);
      ctx.lineTo(12, 6);
      ctx.lineTo(-12, 6);
      ctx.closePath();
      ctx.fill();

      // Robot Label
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ROBOT', 0, 22);

      ctx.restore();
    }

    // 4. Draw Numbered Waypoints (① ② ③)
    waypoints.forEach(wp => {
      ctx.save();
      
      // Shadow / glow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;

      // Circle pin
      ctx.fillStyle = wp.color || '#06b6d4';
      ctx.beginPath();
      ctx.arc(wp.x, wp.y, 16, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Number inside
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(wp.num, wp.x, wp.y);
      ctx.restore();
    });

    // 5. Draw Text Boxes / Annotations
    textBoxes.forEach(tb => {
      ctx.save();
      ctx.font = `bold ${tb.size || 14}px sans-serif`;
      const textWidth = ctx.measureText(tb.text).width;
      const padX = 8;
      const padY = 5;

      // Label background pill
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = tb.color || '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(tb.x - padX, tb.y - 14 - padY, textWidth + padX * 2, 24 + padY, 8);
      ctx.fill();
      ctx.stroke();

      // Text inside
      ctx.fillStyle = tb.color || '#ffffff';
      ctx.textBaseline = 'top';
      ctx.fillText(tb.text, tb.x, tb.y - 11);
      ctx.restore();
    });
  }, [isImageLoaded, paths, waypoints, textBoxes, robotStamp, activeTool, arrowStart, arrowCurrent, selectedColor, brushSize]);

  // Redraw canvas whenever elements change or image finishes loading
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const drawArrow = (ctx, fromx, fromy, tox, toy, color, size) => {
    const headlen = 18;
    const dx = tox - fromx;
    const dy = toy - fromy;
    const angle = Math.atan2(dy, dx);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';

    // Main line
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

  // Convert client viewport click to canvas coordinates accurately
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
      // Place robot at location with initial 0 degree angle
      setRobotStamp({ x: pos.x, y: pos.y, angle: robotStamp?.angle || 0 });
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
      size: 14
    }]);
    setInputNoteText('');
    setPendingTextPos(null);
  };

  // Rotate Robot by 45 degrees
  const handleRotateRobot = () => {
    if (!robotStamp) {
      showToast(isVi ? 'Hãy nhấp vào sân để đặt Robot trước!' : 'Click field to place robot first!');
      return;
    }
    const newAngle = ((robotStamp.angle || 0) + 45) % 360;
    setRobotStamp({ ...robotStamp, angle: newAngle });
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

  // Export 1-Click High-Res PNG with Actual Field Graphic
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
    showToast(isVi ? `Đã nạp "${routine.name}"!` : `Loaded "${routine.name}"!`);
  };

  // Create new blank plan
  const handleNewPlan = () => {
    setRoutineName(`Auto Routine ${savedRoutines.length + 1}`);
    setPaths([]);
    setWaypoints([]);
    setTextBoxes([]);
    setRobotStamp(null);
    showToast(isVi ? 'Đã tạo chiến thuật mới.' : 'Started new plan.');
  };

  return (
    <div 
      ref={containerRef}
      className={`flex flex-col min-h-0 select-none ${
        isFullscreen 
          ? 'fixed inset-0 z-50 bg-slate-950 p-2 sm:p-3 overflow-hidden' 
          : 'flex-1 h-[calc(100vh-4.5rem)]'
      }`}
    >
      
      {/* Sleek Unified Toolbar Header (Fits in ~85px total height, zero vertical scroll) */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 sm:p-2.5 shadow-sm mb-2 space-y-1.5">
        
        {/* Tier 1: Routine Management + Export + Fullscreen */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          
          {/* Left: Title + Routine Name Input + Quick Load */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30 text-xs font-black">
              <Compass className="w-3.5 h-3.5 text-cyan-500" />
              <span>{t.strategyBoard}</span>
            </div>

            <div className="flex items-center gap-1">
              <input
                type="text"
                value={routineName}
                onChange={(e) => setRoutineName(e.target.value)}
                placeholder={t.routineName}
                className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 w-36 sm:w-44"
              />

              <button
                type="button"
                onClick={handleSaveRoutine}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 dark:hover:bg-cyan-500 dark:hover:text-slate-950 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700"
                title={t.saveRoutine}
              >
                <Save className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.saveRoutine}</span>
              </button>

              {/* Saved routines dropdown */}
              {savedRoutines.length > 0 && (
                <select
                  value=""
                  onChange={(e) => {
                    const sel = savedRoutines.find(r => r.id === e.target.value);
                    if (sel) handleLoadRoutine(sel);
                  }}
                  className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500 max-w-[130px]"
                >
                  <option value="" disabled>{t.selectRoutine || 'Select Plan...'}</option>
                  {savedRoutines.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={handleNewPlan}
                className="p-1 sm:px-2 sm:py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all"
                title={t.newRoutine || 'New Plan'}
              >
                <Plus className="w-3.5 h-3.5 sm:hidden" />
                <span className="hidden sm:inline">+ {t.newRoutine || 'New'}</span>
              </button>
            </div>
          </div>

          {/* Right: Export PNG + Fullscreen toggle */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              onClick={handleExportPNG}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-sm transition-all hover:scale-105 active:scale-95"
              title={t.exportPNG}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.exportPNG}</span>
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black transition-all border border-slate-200 dark:border-slate-700"
              title={isFullscreen ? (t.exitFullscreen || 'Exit Fullscreen') : (t.fullscreen || 'Fullscreen (F)')}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-cyan-500" />
                  <span className="hidden sm:inline">{t.exitFullscreen || 'Exit'}</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-cyan-500" />
                  <span className="hidden sm:inline">{t.fullscreen || 'Fullscreen'}</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* Tier 2: Tool Palette + Colors + Stroke + Undo + Clear */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-1.5">
          
          {/* Tool selector buttons */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTool('pencil')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTool === 'pencil'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Pencil Tool (P)"
            >
              <PenTool className="w-3 h-3" />
              <span>{t.pencilTool}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('arrow')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTool === 'arrow'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Directional Arrow (A)"
            >
              <MoveRight className="w-3 h-3" />
              <span>{t.arrowTool}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('waypoint')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTool === 'waypoint'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Numbered Waypoint (W)"
            >
              <MapPin className="w-3 h-3" />
              <span>{t.waypointTool}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('text')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTool === 'text'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Text Note (T)"
            >
              <Type className="w-3 h-3" />
              <span>{t.textTool}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('robot')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTool === 'robot'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Robot Stamp (R)"
            >
              <Bot className="w-3 h-3" />
              <span>{t.robotTool}</span>
            </button>
          </div>

          {/* Color Palette + Stroke Thickness */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1">
              {COLORS.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedColor(c.hex)}
                  style={{ backgroundColor: c.hex }}
                  className={`w-5 h-5 rounded-full border transition-all ${
                    selectedColor === c.hex ? 'border-white scale-125 shadow-sm' : 'border-slate-600/40 opacity-80 hover:opacity-100'
                  }`}
                  title={c.label}
                />
              ))}
            </div>

            {/* Thickness selector */}
            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 ml-1">
              {[3, 6, 10].map(sz => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setBrushSize(sz)}
                  className={`w-5 h-5 rounded text-[10px] font-black flex items-center justify-center transition-all ${
                    brushSize === sz ? 'bg-cyan-500 text-slate-950' : 'text-slate-500'
                  }`}
                >
                  {sz === 3 ? 'S' : sz === 6 ? 'M' : 'L'}
                </button>
              ))}
            </div>
          </div>

          {/* Rotate Robot, Undo & Clear */}
          <div className="flex items-center gap-1">
            {robotStamp && (
              <button
                type="button"
                onClick={handleRotateRobot}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold transition-all"
                title={t.rotateRobot || 'Rotate Robot (+45°)'}
              >
                <RotateCw className="w-3 h-3" />
                <span className="text-[10px]">{robotStamp.angle || 0}°</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleUndo}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-cyan-500 text-xs font-semibold"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-xs font-semibold"
              title={t.clearCanvas}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>

      {/* Main Responsive Field Canvas Container (Occupies 100% of remaining vertical space, NEVER scrolls) */}
      <div className="flex-1 min-h-0 relative flex items-center justify-center p-1 sm:p-2 bg-slate-900/60 dark:bg-slate-950/90 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-inner">
        
        {/* Canvas Element automatically scaled using object-contain & aspect ratio */}
        <canvas
          ref={canvasRef}
          width={FIELD_WIDTH}
          height={FIELD_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{
            maxHeight: '100%',
            maxWidth: '100%',
            aspectRatio: '1024 / 792'
          }}
          className="w-auto h-auto max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-slate-700/60 cursor-crosshair touch-none select-none block"
        />

        {/* Floating Quick Action Helper Badge */}
        <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-xl border border-slate-700/50 text-[11px] font-semibold text-slate-300 pointer-events-none flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>
            {activeTool === 'pencil' && (isVi ? 'Nhấp & kéo để vẽ đường đi' : 'Drag to draw paths')}
            {activeTool === 'arrow' && (isVi ? 'Kéo để vẽ mũi tên hướng' : 'Drag to draw directional arrow')}
            {activeTool === 'waypoint' && (isVi ? 'Nhấp để đặt điểm mốc ① ②' : 'Click to drop waypoint ① ②')}
            {activeTool === 'text' && (isVi ? 'Nhấp để đặt ghi chú chữ' : 'Click to add text note')}
            {activeTool === 'robot' && (isVi ? 'Nhấp để đặt Robot 12" (bấm R xoay)' : 'Click to place 12" robot (R to rotate)')}
          </span>
          <span className="text-slate-500 font-mono text-[10px] hidden sm:inline">| 6\' × 8\' Official Field</span>
        </div>

        {/* Modal / Dialog to Add Text Note when clicked */}
        {pendingTextPos && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-30">
            <form onSubmit={handleConfirmTextNote} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-3 max-w-xs w-full animate-fadeIn">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-cyan-500" />
                  <span>{t.textTool}</span>
                </h4>
                <button type="button" onClick={() => setPendingTextPos(null)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input
                type="text"
                autoFocus
                placeholder={t.enterNoteText}
                value={inputNoteText}
                onChange={(e) => setInputNoteText(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-medium"
              />
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setPendingTextPos(null)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-cyan-500 text-slate-950 shadow-sm"
                >
                  Place Note
                </button>
              </div>
            </form>
          </div>
        )}

      </div>

      {/* Floating Notification Toast */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 text-white border border-cyan-500/50 shadow-2xl shadow-cyan-500/20 animate-bounce">
          <Check className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold">{feedbackToast}</span>
        </div>
      )}

    </div>
  );
}
