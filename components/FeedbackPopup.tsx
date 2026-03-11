import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Image as ImageIcon, Trash2, HelpCircle, User as UserIcon, Plus, Loader2, CheckCircle2, AlertCircle, Pencil, Check, RotateCcw, Type, Square, ArrowUpRight, MousePointer2, Undo2, MousePointerClick, Move } from 'lucide-react';
import { supabaseService } from '../services/supabaseService.ts';

interface ImageEditorProps {
  imageSrc: string;
  onSave: (newSrc: string) => void;
  onClose: () => void;
}

type Tool = 'select' | 'pencil' | 'rect' | 'arrow' | 'text';

interface Shape {
  id: string;
  type: Tool;
  color: string;
  lineWidth: number;
  points: { x: number; y: number }[];
  text?: string;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ imageSrc, onSave, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [history, setHistory] = useState<Shape[][]>([]);
  const [tool, setTool] = useState<Tool>('pencil');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState<{ x: number, y: number } | null>(null);
  const [color, setColor] = useState('#ef4444');
  const [lineWidth, setLineWidth] = useState(4);
  const [baseImage, setBaseImage] = useState<HTMLImageElement | null>(null);
  
  const [textInput, setTextInput] = useState<{ visualX: number, visualY: number, canvasX: number, canvasY: number, value: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textInput && inputRef.current) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [textInput]);

  useEffect(() => {
    const img = document.createElement('img');
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const maxWidth = window.innerWidth * 0.8;
      const maxHeight = window.innerHeight * 0.6;
      let width = img.width;
      let height = img.height;
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      if (ratio < 1) {
        width *= ratio;
        height *= ratio;
      }
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = width;
        canvas.height = height;
      }
      setBaseImage(img);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !baseImage) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);

    shapes.forEach(shape => {
      ctx.strokeStyle = shape.color;
      ctx.fillStyle = shape.color;
      ctx.lineWidth = shape.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (selectedId === shape.id) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#3b82f6';
      } else {
        ctx.shadowBlur = 0;
      }

      if (shape.type === 'pencil') {
        if (shape.points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(shape.points[0].x, shape.points[0].y);
        shape.points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
      } else if (shape.type === 'rect') {
        const start = shape.points[0];
        const end = shape.points[1];
        if (!start || !end) return;
        ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
      } else if (shape.type === 'arrow') {
        const start = shape.points[0];
        const end = shape.points[1];
        if (!start || !end) return;
        drawArrow(ctx, start.x, start.y, end.x, end.y, shape.lineWidth);
      } else if (shape.type === 'text') {
        const pos = shape.points[0];
        if (!pos || !shape.text) return;
        const fontSize = shape.lineWidth * 6;
        ctx.font = `bold ${fontSize}px sans-serif`;
        
        ctx.shadowColor = 'white';
        ctx.shadowBlur = 4;
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.strokeText(shape.text, pos.x, pos.y);
        
        ctx.shadowBlur = 0;
        ctx.fillStyle = shape.color;
        ctx.fillText(shape.text, pos.x, pos.y);
        ctx.lineWidth = shape.lineWidth;
      }
      ctx.shadowBlur = 0;
    });
  }, [shapes, baseImage, selectedId]);

  const drawArrow = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, width: number) => {
    const headlen = width * 4;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  };

  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, rawX: 0, rawY: 0, rect: null as any };
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    const relX = (clientX - rect.left) / rect.width;
    const relY = (clientY - rect.top) / rect.height;
    
    return { 
      x: relX * canvas.width, 
      y: relY * canvas.height,
      rawX: clientX - rect.left,
      rawY: clientY - rect.top,
      rect
    };
  };

  const isHit = (shape: Shape, p: { x: number, y: number }) => {
    const threshold = 30;
    if (shape.type === 'rect') {
      const s = shape.points[0];
      const e = shape.points[1];
      return p.x >= Math.min(s.x, e.x) - threshold && p.x <= Math.max(s.x, e.x) + threshold &&
             p.y >= Math.min(s.y, e.y) - threshold && p.y <= Math.max(s.y, e.y) + threshold;
    }
    if (shape.type === 'text') {
      const s = shape.points[0];
      return Math.abs(p.x - s.x) < 100 && Math.abs(p.y - s.y) < 40;
    }
    return shape.points.some(pt => Math.sqrt((pt.x - p.x)**2 + (pt.y - p.y)**2) < threshold);
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (textInput) return;

    const { x, y, rawX, rawY } = getCanvasPos(e);
    const pos = { x, y };
    
    if (tool === 'select') {
      const hit = [...shapes].reverse().find(s => isHit(s, pos));
      if (hit) {
        setSelectedId(hit.id);
        setIsDragging(true);
        setLastPos(pos);
        setHistory([...history, shapes]);
      } else {
        setSelectedId(null);
      }
      return;
    }

    if (tool === 'text') {
      setTextInput({ 
        visualX: rawX, 
        visualY: rawY,
        canvasX: x,
        canvasY: y,
        value: '' 
      });
      return;
    }

    setHistory([...history, shapes]);
    setIsDrawing(true);
    setSelectedId(null);
    const newShape: Shape = {
      id: Math.random().toString(36).substr(2, 9),
      type: tool,
      color: color,
      lineWidth: lineWidth,
      points: [pos, pos]
    };
    setShapes([...shapes, newShape]);
  };

  const handleTextCommit = () => {
    if (textInput && textInput.value.trim()) {
      setHistory([...history, shapes]);
      const newShape: Shape = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'text',
        color: color,
        lineWidth: lineWidth,
        points: [{ x: textInput.canvasX, y: textInput.canvasY }],
        text: textInput.value
      };
      setShapes([...shapes, newShape]);
    }
    setTextInput(null);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    const { x, y } = getCanvasPos(e);
    const pos = { x, y };

    if (isDragging && selectedId && lastPos) {
      const dx = pos.x - lastPos.x;
      const dy = pos.y - lastPos.y;
      
      setShapes(prev => prev.map(s => {
        if (s.id === selectedId) {
          return {
            ...s,
            points: s.points.map(p => ({ x: p.x + dx, y: p.y + dy }))
          };
        }
        return s;
      }));
      setLastPos(pos);
      return;
    }

    if (!isDrawing || tool === 'select' || tool === 'text') return;
    
    const newShapes = [...shapes];
    const currentShape = { ...newShapes[newShapes.length - 1] };
    if (tool === 'pencil') {
      currentShape.points = [...currentShape.points, pos];
    } else {
      currentShape.points = [currentShape.points[0], pos];
    }
    newShapes[newShapes.length - 1] = currentShape;
    setShapes(newShapes);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setIsDragging(false);
    setLastPos(null);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    setShapes(history[history.length - 1]);
    setHistory(history.slice(0, -1));
    setSelectedId(null);
  };

  const handleDeleteSelected = () => {
    if (!selectedId) return;
    setHistory([...history, shapes]);
    setShapes(shapes.filter(s => s.id !== selectedId));
    setSelectedId(null);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const oldId = selectedId;
    setSelectedId(null);
    requestAnimationFrame(() => {
      onSave(canvas.toDataURL('image/png'));
      setSelectedId(oldId);
    });
  };

  return (
    <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-w-full">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Pencil className="w-4 h-4 text-blue-600" /> Annotate Screenshot
            </h3>
            <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl">
              {[
                { id: 'select', icon: <MousePointer2 className="w-4 h-4" />, label: 'Select' },
                { id: 'pencil', icon: <Pencil className="w-4 h-4" />, label: 'Draw' },
                { id: 'rect', icon: <Square className="w-4 h-4" />, label: 'Box' },
                { id: 'arrow', icon: <ArrowUpRight className="w-4 h-4" />, label: 'Arrow' },
                { id: 'text', icon: <Type className="w-4 h-4" />, label: 'Text' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setTool(t.id as Tool); setSelectedId(null); setTextInput(null); }}
                  className={`p-2 rounded-lg transition-all flex items-center gap-1.5 ${tool === t.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                  title={t.label}
                >
                  {t.icon}
                  <span className="text-[10px] font-bold uppercase hidden sm:inline">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleUndo} disabled={history.length === 0} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 disabled:opacity-30" title="Undo"><Undo2 className="w-4 h-4" /></button>
            <button onClick={() => { if(confirm("Discard all?")) { setShapes([]); setHistory([]); setSelectedId(null); } }} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500" title="Reset All"><RotateCcw className="w-4 h-4" /></button>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="p-8 bg-slate-100 flex justify-center overflow-auto max-h-[70vh] relative">
          <div className="relative inline-block shadow-lg bg-white">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className={`block ${tool === 'select' ? (isDragging ? 'cursor-grabbing' : 'cursor-default') : 'cursor-crosshair'}`}
            />
            
            {textInput && (
              <div 
                className="absolute z-[160]" 
                style={{ 
                  left: `${textInput.visualX}px`, 
                  top: `${textInput.visualY - (lineWidth * 4)}px`, 
                  pointerEvents: 'auto'
                }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={textInput.value}
                  onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleTextCommit();
                    if (e.key === 'Escape') setTextInput(null);
                  }}
                  onBlur={handleTextCommit}
                  className="bg-white border-2 border-blue-600 rounded px-2 py-1 text-sm font-bold shadow-2xl outline-none min-w-[120px] text-slate-900"
                  style={{ color: color, fontSize: `${lineWidth * 4}px` }}
                  placeholder="Type message..."
                />
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-lg">
              {[
                { name: 'Red', val: '#ef4444' },
                { name: 'Yellow', val: '#eab308' },
                { name: 'Blue', val: '#3b82f6' },
                { name: 'Green', val: '#22c55e' }
              ].map((c) => (
                <button
                  key={c.val}
                  onClick={() => setColor(c.val)}
                  className={`w-6 h-6 rounded-md border-2 transition-all ${color === c.val ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c.val }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-bold text-slate-400 uppercase">Size</span>
               <input type="range" min="2" max="20" value={lineWidth} onChange={(e) => setLineWidth(parseInt(e.target.value))} className="w-20 accent-blue-600" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            {selectedId && (
              <button onClick={handleDeleteSelected} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-all border border-red-200"><Trash2 className="w-4 h-4" /> Erase Selected</button>
            )}
            <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95"><Check className="w-4 h-4" /> Apply Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const FeedbackPopup: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dragging state
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isPopupDragging, setIsPopupDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedText = sessionStorage.getItem('bioport_feedback_text');
    const savedImages = sessionStorage.getItem('bioport_feedback_images');
    if (savedText) setText(savedText);
    if (savedImages) {
      try { setImages(JSON.parse(savedImages)); } catch (e) {}
    }
    supabaseService.auth.getUser().then(u => {
      if (u) setUser({ name: (u as any).user_metadata?.full_name || (u as any).user_metadata?.name, email: (u as any).email });
    });
  }, []);

  useEffect(() => {
    sessionStorage.setItem('bioport_feedback_text', text);
    sessionStorage.setItem('bioport_feedback_images', JSON.stringify(images));
  }, [text, images]);

  // Center the popup when it opens
  useEffect(() => {
    if (isOpen) {
      setPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    }
  }, [isOpen]);

  const handleDragStart = (e: React.MouseEvent) => {
    if (popupRef.current) {
      const rect = popupRef.current.getBoundingClientRect();
      dragOffset.current = {
        x: e.clientX - (rect.left + rect.width / 2),
        y: e.clientY - (rect.top + rect.height / 2)
      };
      setIsPopupDragging(true);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isPopupDragging) {
        setPos({
          x: e.clientX - dragOffset.current.x,
          y: e.clientY - dragOffset.current.y
        });
      }
    };
    const handleMouseUp = () => setIsPopupDragging(false);

    if (isPopupDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPopupDragging]);

  const handleClearContent = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Clear all feedback text and screenshots?")) {
      setText('');
      setImages([]);
      sessionStorage.removeItem('bioport_feedback_text');
      sessionStorage.removeItem('bioport_feedback_images');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: any) => {
        const reader = new FileReader();
        reader.onloadend = () => { setImages(prev => [...prev, reader.result as string]); };
        reader.readAsDataURL(file as Blob);
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onloadend = () => { setImages(prev => [...prev, reader.result as string]); };
          reader.readAsDataURL(blob);
        }
      }
    }
  };

  const removeImage = (index: number) => { setImages(prev => prev.filter((_, i) => i !== index)); };

  const saveEditedImage = (newSrc: string) => {
    if (editingIndex === null) return;
    const newImages = [...images];
    newImages[editingIndex] = newSrc;
    setImages(newImages);
    setEditingIndex(null);
  };

  const handleSendFeedback = async () => {
    if (!text.trim() || status === 'sending') return;
    setStatus('sending');
    setErrorMsg(null);
    try {
      if (!supabaseService.isConfigured()) {
        const recipient = 'galea.charlesa@gmail.com';
        const subject = encodeURIComponent('Feedback for BioPort AI app');
        let body = `User: ${user?.name || 'Unknown User'}\nEmail: ${user?.email || 'N/A'}\n\nFeedback:\n${text}\n\n`;
        if (images.length > 0) body += `\n[Note: User attached screenshots]`;
        window.location.href = `mailto:${recipient}?subject=${subject}&body=${encodeURIComponent(body)}`;
        setStatus('success');
      } else {
        await supabaseService.submitFeedback(text, images);
        setStatus('success');
      }
      setTimeout(() => {
        setText(''); setImages([]);
        sessionStorage.removeItem('bioport_feedback_text');
        sessionStorage.removeItem('bioport_feedback_images');
        setIsOpen(false); setStatus('idle');
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send."); setStatus('error');
    }
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all group border border-blue-500/50">
        <MessageSquare className="w-5 h-5 group-hover:rotate-12 transition-transform" />
        <span className="font-bold text-sm">Feedback</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[110] p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 overflow-hidden pointer-events-none">
          <div 
            ref={popupRef}
            style={{ 
              left: pos.x, 
              top: pos.y, 
              transform: 'translate(-50%, -50%)',
              position: 'fixed'
            }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-[400px] overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200 select-none pointer-events-auto"
          >
            <div 
              onMouseDown={handleDragStart}
              className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center cursor-move active:cursor-grabbing hover:bg-slate-100 transition-colors group/header"
            >
              <div className="flex items-center gap-2 pointer-events-none">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 shadow-sm"><MessageSquare className="w-4 h-4" /></div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Send Feedback</h3>
                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                    <Move className="w-2.5 h-2.5" /> Hold to Move
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                onMouseDown={(e) => e.stopPropagation()}
                className="p-1.5 hover:bg-white hover:shadow-sm rounded-full transition-all text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh] select-text">
              <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <HelpCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <div className="text-[10px] text-blue-700 leading-relaxed font-medium">
                  Describe bugs or suggestions. Upload or <strong>paste</strong> screenshots. Click images to annotate.
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Your Comments</label>
                <textarea 
                  value={text} 
                  onChange={(e) => setText(e.target.value)} 
                  onPaste={handlePaste} 
                  disabled={status === 'sending' || status === 'success'} 
                  placeholder="What's on your mind?" 
                  style={{ backgroundColor: 'white', color: '#0f172a' }}
                  className="w-full h-32 p-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all text-sm resize-none disabled:bg-slate-50 font-medium" 
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Screenshots ({images.length})</label>
                  {images.length > 0 && (
                    <span className="text-[9px] font-black text-blue-600 uppercase flex items-center gap-1.5 bg-blue-50 px-2 py-0.5 rounded animate-pulse">
                      <MousePointerClick className="w-3 h-3" /> Click to edit
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative rounded-xl border-2 border-slate-200 overflow-hidden bg-slate-100 group aspect-video cursor-pointer transition-all hover:border-blue-500 hover:shadow-lg" onClick={() => setEditingIndex(idx)}>
                      <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                      <div className="absolute top-2 right-2 bg-blue-600/90 text-white text-[8px] font-black uppercase px-2 py-1 rounded-md shadow-md flex items-center gap-1.5 backdrop-blur-sm">
                        <Pencil className="w-2.5 h-2.5" /> Editable
                      </div>
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                        className="absolute bottom-2 right-2 p-1.5 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  
                  {status !== 'sending' && status !== 'success' && (
                    <button type="button" onClick={() => fileInputRef.current?.click()} className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl hover:bg-slate-50 hover:border-blue-400 transition-all group ${images.length > 0 ? 'aspect-video' : 'w-full py-6 col-span-2'}`}>
                      <ImageIcon className="w-6 h-6 text-slate-300 group-hover:text-blue-500" />
                      <span className="text-[10px] font-bold text-slate-500">Upload or paste</span>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                    </button>
                  )}
                </div>
              </div>

              {status === 'error' && <div className="p-3 bg-red-50 text-red-600 text-[11px] rounded-xl flex gap-2 font-mono"><AlertCircle className="w-4 h-4 shrink-0" />{errorMsg}</div>}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center"><UserIcon className="w-3 h-3 text-slate-500" /></div>
                  <span className="text-[10px] font-medium text-slate-500">Sending as: <strong>{user?.name || user?.email || 'Guest'}</strong></span>
                </div>
                {(text.trim() || images.length > 0) && (
                  <button 
                    type="button"
                    onClick={handleClearContent}
                    className="flex items-center gap-1 text-[10px] font-black uppercase text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete Content
                  </button>
                )}
              </div>
              <button onClick={handleSendFeedback} disabled={!text.trim() || status === 'sending' || status === 'success'} className={`w-full rounded-xl py-3.5 font-bold transition-all shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 ${status === 'success' ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                {status === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : status === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                {status === 'sending' ? 'Sending...' : status === 'success' ? 'Sent!' : 'Send Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingIndex !== null && <ImageEditor imageSrc={images[editingIndex]} onSave={saveEditedImage} onClose={() => setEditingIndex(null)} />}
    </>
  );
};

export default FeedbackPopup;