import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Download, Plus, Eraser, Grid3X3, Rows, Columns, Undo2, ZoomIn, ZoomOut, Image as ImageIcon, Lock, Unlock, Trash2, Trash } from 'lucide-react';
import { Bead } from '../types';
import { getTextColorForBackground, fileToBase64 } from '../utils';

interface PatternCreatorProps {
  inventory: Bead[];
}

const DEFAULT_ROWS = 52;
const DEFAULT_COLS = 52;
const DEFAULT_CELL_SIZE = 16; // pixels
const RULER_SIZE = 20; // pixels

interface HistoryState {
  grid: string[][];
  rows: number;
  cols: number;
}

const PatternCreator: React.FC<PatternCreatorProps> = ({ inventory }) => {
  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [cols, setCols] = useState(DEFAULT_COLS);
  const [grid, setGrid] = useState<string[][]>(Array.from({ length: DEFAULT_ROWS }, () => Array(DEFAULT_COLS).fill('')));
  const [selectedColor, setSelectedColor] = useState<string | null>(inventory.length > 0 ? inventory[0].hex : null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('全部');
  const [paletteHeight, setPaletteHeight] = useState(150);
  const [isDraggingPalette, setIsDraggingPalette] = useState(false);
  
  // Zoom and Pan state for the canvas
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  
  // Touch gesture state
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialZoomLevel, setInitialZoomLevel] = useState<number>(1);
  const [initialPanOffset, setInitialPanOffset] = useState({ x: 0, y: 0 });
  const [pinchCenter, setPinchCenter] = useState({ x: 0, y: 0 });
  
  // History state for Undo
  const [history, setHistory] = useState<HistoryState[]>([]);
  
  // Background Image State
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState(0.5);
  const [bgScale, setBgScale] = useState(1);
  const [bgOffsetX, setBgOffsetX] = useState(0);
  const [bgOffsetY, setBgOffsetY] = useState(0);
  const [isBgLocked, setIsBgLocked] = useState(false);
  const [isDraggingBg, setIsDraggingBg] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const gridRef = useRef<HTMLDivElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize selected color
  useEffect(() => {
    if (!selectedColor && inventory.length > 0) {
      setSelectedColor(inventory[0].hex);
    }
  }, [inventory, selectedColor]);

  // Group inventory for palette
  const allPrefixes = Array.from(new Set(inventory.map(b => {
    const match = b.code.match(/^[A-Z]+/i);
    return match ? match[0].toUpperCase() : '其他';
  }))).sort();
  
  const dynamicCategories = ['全部', ...allPrefixes];

  const filteredInventory = inventory.filter(b => {
    return activeCategory === '全部' || b.code.startsWith(activeCategory);
  });

  // Save history before making changes
  const saveHistory = useCallback(() => {
    setHistory(prev => {
      const newHistory = [...prev, { grid: grid.map(row => [...row]), rows, cols }];
      // Keep last 20 states
      if (newHistory.length > 20) {
        return newHistory.slice(newHistory.length - 20);
      }
      return newHistory;
    });
  }, [grid, rows, cols]);

  const handleUndo = () => {
    if (history.length === 0) return;
    const previousState = history[history.length - 1];
    setGrid(previousState.grid);
    setRows(previousState.rows);
    setCols(previousState.cols);
    setHistory(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (confirm('确定要清空整个画板吗？此操作不可撤销。')) {
      saveHistory();
      setGrid(Array.from({ length: rows }, () => Array(cols).fill('')));
    }
  };

  const updateCell = useCallback((r: number, c: number) => {
    setGrid(prev => {
      const newGrid = [...prev];
      newGrid[r] = [...newGrid[r]];
      newGrid[r][c] = isErasing ? '' : (selectedColor || '');
      return newGrid;
    });
  }, [selectedColor, isErasing]);

  // --- Pointer Events for Drawing and Panning (Mouse) ---
  const handlePointerDown = (e: React.PointerEvent) => {
    // Middle mouse button or Space + Left click for panning
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    // Left click for drawing
    if (e.button === 0 && e.pointerType === 'mouse') {
      const target = e.target as HTMLElement;
      const rStr = target.dataset.row;
      const cStr = target.dataset.col;
      
      if (rStr !== undefined && cStr !== undefined) {
        const r = parseInt(rStr, 10);
        const c = parseInt(cStr, 10);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        saveHistory();
        setIsDrawing(true);
        updateCell(r, c);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning && e.pointerType === 'mouse') {
      const dx = e.clientX - lastPanPoint.x;
      const dy = e.clientY - lastPanPoint.y;
      setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    if (isDrawing && e.pointerType === 'mouse') {
      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
      if (target) {
        const rStr = target.dataset.row;
        const cStr = target.dataset.col;
        if (rStr !== undefined && cStr !== undefined) {
          const r = parseInt(rStr, 10);
          const c = parseInt(cStr, 10);
          updateCell(r, c);
        }
      }
    }
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
    setIsPanning(false);
    setIsDraggingPalette(false);
    setIsDraggingBg(false);
  };

  useEffect(() => {
    window.addEventListener('pointerup', handlePointerUp);
    return () => window.removeEventListener('pointerup', handlePointerUp);
  }, []);

  // --- Touch Events for Mobile (Drawing, Panning, Pinch-to-Zoom) ---
  const getDistance = (touch1: React.Touch, touch2: React.Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getCenter = (touch1: React.Touch, touch2: React.Touch) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Two fingers: start pinch zoom / pan
      setIsDrawing(false);
      const dist = getDistance(e.touches[0], e.touches[1]);
      const center = getCenter(e.touches[0], e.touches[1]);
      
      setInitialPinchDistance(dist);
      setInitialZoomLevel(zoomLevel);
      setInitialPanOffset(panOffset);
      setPinchCenter(center);
      setLastPanPoint(center);
      setIsPanning(true);
    } else if (e.touches.length === 1 && !isPanning) {
      // One finger: start drawing
      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;
      if (target && target.dataset.row && target.dataset.col) {
        const r = parseInt(target.dataset.row, 10);
        const c = parseInt(target.dataset.col, 10);
        saveHistory();
        setIsDrawing(true);
        updateCell(r, c);
      }
    }
  };

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.cancelable) {
      e.preventDefault(); // Prevent default scrolling
    }

    if (e.touches.length === 2 && initialPinchDistance !== null) {
      // Handle Pinch Zoom and Pan simultaneously
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const currentCenter = getCenter(e.touches[0], e.touches[1]);
      
      // Calculate new zoom
      const scale = currentDistance / initialPinchDistance;
      const newZoom = Math.max(0.2, Math.min(initialZoomLevel * scale, 5));
      
      // Calculate pan delta from the initial touch center
      const dx = currentCenter.x - lastPanPoint.x;
      const dy = currentCenter.y - lastPanPoint.y;

      // Adjust pan offset to zoom towards the pinch center
      // This math ensures the point under the fingers stays under the fingers during zoom
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Center relative to the container
        const cx = pinchCenter.x - rect.left;
        const cy = pinchCenter.y - rect.top;
        
        const zoomRatio = newZoom / zoomLevel;
        
        setPanOffset(prev => ({
          x: cx - (cx - prev.x) * zoomRatio + dx,
          y: cy - (cy - prev.y) * zoomRatio + dy
        }));
      } else {
         setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      }

      setZoomLevel(newZoom);
      setLastPanPoint(currentCenter);
      
    } else if (e.touches.length === 1 && isDrawing) {
      // Handle Drawing
      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;
      if (target && target.dataset.row && target.dataset.col) {
        const r = parseInt(target.dataset.row, 10);
        const c = parseInt(target.dataset.col, 10);
        updateCell(r, c);
      }
    }
  }, [isDrawing, updateCell, initialPinchDistance, initialZoomLevel, lastPanPoint, pinchCenter, zoomLevel]);

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      setInitialPinchDistance(null);
      setIsPanning(false);
    }
    if (e.touches.length === 0) {
      setIsDrawing(false);
    }
  };

  // --- Palette Resizing Logic ---
  const handlePaletteDragStart = (e: React.PointerEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    // Make the drag handle area larger and more specific
    if (target.id === 'palette-drag-handle' || target.closest('#palette-drag-handle')) {
      setIsDraggingPalette(true);
      if (e.cancelable) e.preventDefault();
    }
  };

  const handlePaletteDragMove = useCallback((e: PointerEvent | TouchEvent) => {
    if (!isDraggingPalette) return;
    
    let clientY;
    if ('touches' in e) {
      clientY = e.touches[0].clientY;
    } else {
      clientY = (e as PointerEvent).clientY;
    }

    const windowHeight = window.innerHeight;
    let newHeight = windowHeight - clientY - 56; 
    newHeight = Math.max(100, Math.min(newHeight, windowHeight * 0.8));
    setPaletteHeight(newHeight);
  }, [isDraggingPalette]);

  useEffect(() => {
    if (isDraggingPalette) {
      window.addEventListener('pointermove', handlePaletteDragMove);
      window.addEventListener('touchmove', handlePaletteDragMove, { passive: false });
    } else {
      window.removeEventListener('pointermove', handlePaletteDragMove);
      window.removeEventListener('touchmove', handlePaletteDragMove);
    }
    return () => {
      window.removeEventListener('pointermove', handlePaletteDragMove);
      window.removeEventListener('touchmove', handlePaletteDragMove);
    };
  }, [isDraggingPalette, handlePaletteDragMove]);

  // --- Background Image Logic ---
  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      try {
        const base64 = await fileToBase64(file);
        setBgImage(`data:${file.type};base64,${base64}`);
        setIsBgLocked(false);
        setBgOffsetX(0);
        setBgOffsetY(0);
        setBgScale(1);
      } catch (err) {
        console.error("Failed to load background image", err);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleBgPointerDown = (e: React.PointerEvent) => {
    if (isBgLocked || !bgImage) return;
    e.stopPropagation();
    setIsDraggingBg(true);
    setDragStart({ x: e.clientX - bgOffsetX, y: e.clientY - bgOffsetY });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleBgPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingBg || isBgLocked) return;
    e.stopPropagation();
    setBgOffsetX(e.clientX - dragStart.x);
    setBgOffsetY(e.clientY - dragStart.y);
  };

  const addRow = () => {
    saveHistory();
    setRows(r => r + 1);
    setGrid(prev => [...prev, Array(cols).fill('')]);
  };

  const addCol = () => {
    saveHistory();
    setCols(c => c + 1);
    setGrid(prev => prev.map(row => [...row, '']));
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.2, 5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.2, 0.2));

  const exportImage = () => {
    const stats: Record<string, { count: number, bead: Bead }> = {};
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const hex = grid[r][c];
        if (hex) {
          const bead = inventory.find(b => b.hex === hex);
          if (bead) {
            if (!stats[bead.code]) {
              stats[bead.code] = { count: 0, bead };
            }
            stats[bead.code].count++;
          }
        }
      }
    }

    const statEntries = Object.values(stats).sort((a, b) => b.count - a.count);

    const canvas = document.createElement('canvas');
    const exportCellSize = 30; 
    const padding = 40;
    const rulerExportSize = 20;
    
    const statsCols = 4;
    const statsRows = Math.ceil(statEntries.length / statsCols);
    const statsRowHeight = 40;
    const statsAreaHeight = statEntries.length > 0 ? (statsRows * statsRowHeight + 60) : 0;

    canvas.width = cols * exportCellSize + padding * 2 + rulerExportSize;
    canvas.height = rows * exportCellSize + padding * 2 + rulerExportSize + statsAreaHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Translate to leave room for padding and rulers
    ctx.translate(padding + rulerExportSize, padding + rulerExportSize);

    // Draw Rulers
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, -rulerExportSize, cols * exportCellSize, rulerExportSize); // Top ruler bg
    ctx.fillRect(-rulerExportSize, 0, rulerExportSize, rows * exportCellSize); // Left ruler bg
    
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i < cols; i++) {
      ctx.fillText((i + 1).toString(), i * exportCellSize + exportCellSize / 2, -rulerExportSize / 2);
    }
    for (let i = 0; i < rows; i++) {
      ctx.fillText((i + 1).toString(), -rulerExportSize / 2, i * exportCellSize + exportCellSize / 2);
    }

    // Draw Grid Lines (with 5x5 emphasis)
    for (let i = 0; i <= cols; i++) {
      ctx.beginPath();
      ctx.moveTo(i * exportCellSize, 0);
      ctx.lineTo(i * exportCellSize, rows * exportCellSize);
      ctx.strokeStyle = (i % 5 === 0 && i !== 0 && i !== cols) ? '#ef4444' : '#e5e7eb';
      ctx.lineWidth = (i % 5 === 0 && i !== 0 && i !== cols) ? 2 : 1;
      ctx.stroke();
    }
    for (let i = 0; i <= rows; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * exportCellSize);
      ctx.lineTo(cols * exportCellSize, i * exportCellSize);
      ctx.strokeStyle = (i % 5 === 0 && i !== 0 && i !== rows) ? '#ef4444' : '#e5e7eb';
      ctx.lineWidth = (i % 5 === 0 && i !== 0 && i !== rows) ? 2 : 1;
      ctx.stroke();
    }

    // Draw Beads and Text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 12px sans-serif';

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const hex = grid[r][c];
        if (hex) {
          const bead = inventory.find(b => b.hex === hex);
          const cx = c * exportCellSize + exportCellSize / 2;
          const cy = r * exportCellSize + exportCellSize / 2;

          ctx.fillStyle = hex;
          ctx.beginPath();
          ctx.arc(cx, cy, exportCellSize / 2 - 2, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.beginPath();
          ctx.arc(cx - 4, cy - 4, exportCellSize / 6, 0, Math.PI * 2);
          ctx.fill();

          if (bead) {
            ctx.fillStyle = getTextColorForBackground(hex);
            ctx.fillText(bead.code, cx, cy);
          }
        }
      }
    }

    // Draw Statistics Area
    if (statEntries.length > 0) {
      ctx.translate(-(padding + rulerExportSize), rows * exportCellSize + padding);
      
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('所需拼豆统计', padding, 30);

      ctx.font = '14px sans-serif';
      const statColWidth = (canvas.width - padding * 2) / statsCols;

      statEntries.forEach((entry, index) => {
        const sr = Math.floor(index / statsCols);
        const sc = index % statsCols;
        const x = padding + sc * statColWidth;
        const y = 60 + sr * statsRowHeight;

        ctx.fillStyle = entry.bead.hex;
        ctx.beginPath();
        ctx.arc(x + 10, y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#e5e7eb';
        ctx.stroke();

        ctx.fillStyle = '#374151';
        ctx.textAlign = 'left';
        ctx.fillText(`${entry.bead.code}: ${entry.count} 颗`, x + 28, y);
      });
    }

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `pattern-${rows}x${cols}.png`;
    a.click();
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 relative overflow-hidden">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 p-2 flex flex-wrap items-center justify-between shrink-0 shadow-sm z-10 gap-2">
        <div className="flex items-center space-x-1 sm:space-x-2">
          <span className="text-xs sm:text-sm font-bold text-gray-700 flex items-center bg-gray-100 px-2 py-1 rounded-lg">
            <Grid3X3 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-gray-500" />
            {cols}x{rows}
          </span>
          <button onClick={addCol} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center" title="增加列">
            <Columns className="h-4 w-4" />
            <Plus className="h-3 w-3 -ml-1" />
          </button>
          <button onClick={addRow} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center" title="增加行">
            <Rows className="h-4 w-4" />
            <Plus className="h-3 w-3 -ml-1" />
          </button>
          <div className="w-px h-4 bg-gray-300 mx-1"></div>
          <button onClick={handleUndo} disabled={history.length === 0} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50" title="撤销">
            <Undo2 className="h-4 w-4" />
          </button>
          <button onClick={handleClear} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="清空画板">
            <Trash className="h-4 w-4" />
          </button>
          <div className="w-px h-4 bg-gray-300 mx-1"></div>
          <button onClick={handleZoomOut} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="缩小">
            <ZoomOut className="h-4 w-4" />
          </button>
          <button onClick={handleZoomIn} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="放大">
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
        <button 
          onClick={exportImage}
          className="flex items-center px-2 sm:px-3 py-1.5 bg-brand-600 text-white text-xs sm:text-sm font-medium rounded-lg shadow-sm hover:bg-brand-700 active:scale-95 transition-transform"
        >
          <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
          生成图纸
        </button>
      </div>

      {/* Background Image Controls */}
      <div className="bg-white border-b border-gray-200 p-2 flex items-center space-x-2 shrink-0 z-10 overflow-x-auto hide-scrollbar">
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-200 shrink-0"
        >
          <ImageIcon className="h-3 w-3 mr-1" />
          {bgImage ? '更换底图' : '添加底图'}
        </button>
        <input type="file" ref={fileInputRef} onChange={handleBgUpload} accept="image/*" className="hidden" />
        
        {bgImage && (
          <>
            <button 
              onClick={() => setIsBgLocked(!isBgLocked)}
              className={`flex items-center px-2 py-1 text-xs font-medium rounded-md shrink-0 ${isBgLocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
            >
              {isBgLocked ? <Lock className="h-3 w-3 mr-1" /> : <Unlock className="h-3 w-3 mr-1" />}
              {isBgLocked ? '已锁定' : '未锁定'}
            </button>
            <button 
              onClick={() => { setBgImage(null); setIsBgLocked(false); }}
              className="p-1 text-gray-500 hover:text-red-500 rounded-md shrink-0"
              title="移除底图"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            {!isBgLocked && (
              <div className="flex items-center space-x-2 ml-2 shrink-0">
                <span className="text-xs text-gray-500">透明度:</span>
                <input type="range" min="0.1" max="1" step="0.1" value={bgOpacity} onChange={(e) => setBgOpacity(parseFloat(e.target.value))} className="w-20" />
                <span className="text-xs text-gray-500 ml-2">缩放:</span>
                <input type="range" min="0.1" max="3" step="0.1" value={bgScale} onChange={(e) => setBgScale(parseFloat(e.target.value))} className="w-20" />
              </div>
            )}
          </>
        )}
      </div>

      {/* Canvas Area */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-hidden relative bg-gray-200/50 touch-none" 
        id="canvas-container"
        style={{ paddingBottom: `${paletteHeight}px` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {/* Transform Wrapper for Pan and Zoom */}
        <div 
          className="absolute origin-top-left"
          style={{ 
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
            width: cols * DEFAULT_CELL_SIZE + RULER_SIZE, 
            height: rows * DEFAULT_CELL_SIZE + RULER_SIZE,
            display: 'grid',
            gridTemplateColumns: `${RULER_SIZE}px 1fr`,
            gridTemplateRows: `${RULER_SIZE}px 1fr`
          }}
        >
          {/* Top-Left Corner */}
          <div className="bg-gray-100 border-b border-r border-gray-300 z-30"></div>

          {/* Top Ruler */}
          <div className="flex bg-gray-100 border-b border-gray-300 box-border z-20">
            {Array.from({ length: cols }).map((_, c) => (
              <div 
                key={c} 
                className="flex items-center justify-center text-[8px] text-gray-500 border-r border-gray-300 box-border shrink-0" 
                style={{ width: DEFAULT_CELL_SIZE }}
              >
                {c + 1}
              </div>
            ))}
          </div>

          {/* Left Ruler */}
          <div className="flex flex-col bg-gray-100 border-r border-gray-300 box-border z-20">
            {Array.from({ length: rows }).map((_, r) => (
              <div 
                key={r} 
                className="flex items-center justify-center text-[8px] text-gray-500 border-b border-gray-300 box-border shrink-0" 
                style={{ height: DEFAULT_CELL_SIZE }}
              >
                {r + 1}
              </div>
            ))}
          </div>

          {/* Main Grid Area */}
          <div className="relative">
            {/* Background Image Layer */}
            {bgImage && (
              <div 
                className={`absolute inset-0 overflow-hidden ${isBgLocked ? 'pointer-events-none' : 'cursor-move'}`}
                onPointerDown={handleBgPointerDown}
                onPointerMove={handleBgPointerMove}
                onPointerUp={() => setIsDraggingBg(false)}
                onPointerLeave={() => setIsDraggingBg(false)}
                style={{ zIndex: 1 }}
              >
                <img 
                  src={bgImage} 
                  alt="Background" 
                  style={{
                    opacity: bgOpacity,
                    transform: `translate(${bgOffsetX}px, ${bgOffsetY}px) scale(${bgScale})`,
                    transformOrigin: 'top left',
                    pointerEvents: 'none'
                  }}
                />
              </div>
            )}

            {/* Grid Layer */}
            <div 
              ref={gridRef}
              className={`absolute inset-0 shadow-md select-none ${!isBgLocked && bgImage ? 'pointer-events-none opacity-50' : 'bg-white/80'}`}
              style={{ 
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, ${DEFAULT_CELL_SIZE}px)`,
                gridTemplateRows: `repeat(${rows}, ${DEFAULT_CELL_SIZE}px)`,
                zIndex: 2
              }}
            >
              {grid.map((row, r) => 
                row.map((cellColor, c) => {
                  const isThickRight = (c + 1) % 5 === 0 && c !== cols - 1;
                  const isThickBottom = (r + 1) % 5 === 0 && r !== rows - 1;
                  
                  return (
                    <div
                      key={`${r}-${c}`}
                      data-row={r}
                      data-col={c}
                      className="box-border flex items-center justify-center"
                      style={{ 
                        backgroundColor: cellColor || 'transparent',
                        borderRightWidth: isThickRight ? '2px' : '1px',
                        borderRightStyle: 'solid',
                        borderRightColor: isThickRight ? '#ef4444' : (c === cols - 1 ? 'transparent' : '#e5e7eb'),
                        borderBottomWidth: isThickBottom ? '2px' : '1px',
                        borderBottomStyle: 'solid',
                        borderBottomColor: isThickBottom ? '#ef4444' : (r === rows - 1 ? 'transparent' : '#e5e7eb'),
                      }}
                    >
                      {cellColor && (
                        <div className="w-[80%] h-[80%] rounded-full shadow-sm pointer-events-none" style={{ backgroundColor: cellColor }}></div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Resizable Palette Area */}
      <div 
        ref={paletteRef}
        className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex flex-col z-20"
        style={{ height: `${paletteHeight}px` }}
      >
        {/* Drag Handle - Made more specific to avoid accidental drags */}
        <div 
          id="palette-drag-handle"
          className="h-8 w-full flex items-center justify-center cursor-ns-resize bg-gray-50 hover:bg-gray-100 shrink-0 border-b border-gray-100"
          onPointerDown={handlePaletteDragStart}
          onTouchStart={handlePaletteDragStart}
        >
          <div className="w-12 h-1.5 bg-gray-300 rounded-full pointer-events-none"></div>
        </div>

        {/* Category Filter */}
        <div className="flex overflow-x-auto py-2 px-2 gap-2 hide-scrollbar border-b border-gray-100 shrink-0">
          {dynamicCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat === '全部' ? '全部' : `${cat} 系列`}
            </button>
          ))}
        </div>

        {/* Colors Grid */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="flex flex-wrap gap-2">
            {/* Eraser Tool */}
            <button
              onClick={() => setIsErasing(true)}
              className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                isErasing ? 'border-brand-500 bg-brand-50 text-brand-600 scale-110 shadow-md' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
              }`}
              title="橡皮擦"
            >
              <Eraser className="h-4 w-4" />
            </button>
            
            <div className="w-px h-8 bg-gray-200 shrink-0 mx-1"></div>

            {/* Colors */}
            {filteredInventory.map(bead => (
              <button
                key={bead.id}
                onClick={() => {
                  setSelectedColor(bead.hex);
                  setIsErasing(false);
                }}
                className={`shrink-0 w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center relative ${
                  !isErasing && selectedColor === bead.hex ? 'border-brand-500 scale-110 shadow-md z-10' : 'border-transparent shadow-sm'
                }`}
                style={{ backgroundColor: bead.hex }}
                title={bead.name}
              >
                <span 
                  className="text-[8px] font-bold tracking-tighter"
                  style={{ color: getTextColorForBackground(bead.hex) }}
                >
                  {bead.code}
                </span>
                {!isErasing && selectedColor === bead.hex && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-brand-500 rounded-full border-2 border-white"></div>
                )}
              </button>
            ))}
            {filteredInventory.length === 0 && (
              <span className="text-sm text-gray-400 italic px-2 py-1">该分类下无颜色</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatternCreator;
