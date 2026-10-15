import { useRef, useEffect, useMemo } from 'react';
import gsap from 'gsap';
import { FileCheck, Loader2, Layers, Video } from 'lucide-react';
import type { DownloadMode } from '../App';

interface Props {
  progress: number;
  isDownloading: boolean;
  isActive: boolean;
  downloadCount: number;
  mode: DownloadMode;
  statusText?: string;
  bulkCurrentIndex?: number;
}

export default function ProgressSection({ progress, isDownloading, isActive, downloadCount, mode, statusText, bulkCurrentIndex = 0 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clamped = Math.min(Math.round(progress), 100);
  const isBulk = mode === 'bulk' && downloadCount > 1;

  const particles = useMemo(() => Array.from({ length: 60 }, (_, i) => ({
    angle: (i / 60) * Math.PI * 2,
    radius: 100 + Math.random() * 80,
    speed: 0.5 + Math.random() * 1.5,
    size: 1 + Math.random() * 2,
  })), []);

  useEffect(() => {
    if (!isActive) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(containerRef.current, { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.8, ease: 'power3.out' });
    });
    return () => ctx.revert();
  }, [isActive]);

  useEffect(() => {
    if (ringRef.current) {
      const c = 2 * Math.PI * 120;
      ringRef.current.style.strokeDashoffset = String(c - (clamped / 100) * c);
    }
  }, [clamped]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    canvas.width = 400 * window.devicePixelRatio;
    canvas.height = 400 * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    let rot = 0, rafId: number;
    const draw = () => {
      ctx.clearRect(0, 0, 400, 400);
      rot += 0.003 + (clamped / 100) * 0.012;
      particles.forEach(p => {
        const a = p.angle + rot * p.speed;
        const r = p.radius * (0.5 + Math.sin(rot * 2 + p.angle) * 0.1);
        const x = 200 + Math.cos(a) * r, y = 200 + Math.sin(a) * r;
        const alpha = 0.2 + (clamped / 100) * 0.6;
        ctx.beginPath(); ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56,189,248,${alpha})`; ctx.fill();
        const g = ctx.createRadialGradient(x, y, 0, x, y, p.size * 4);
        g.addColorStop(0, `rgba(56,189,248,${alpha * 0.4})`);
        g.addColorStop(1, 'transparent');
        ctx.beginPath(); ctx.arc(x, y, p.size * 4, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
      });
      rafId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(rafId);
  }, [clamped, particles]);

  return (
    <div className="w-full max-w-lg mx-auto">
      <div ref={containerRef} className="glass-card p-8 md:p-10 text-center">

        {/* Bulk header */}
        {isBulk && (
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full"
            style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)' }}>
            <Layers size={14} className="text-[#38BDF8]" />
            <span className="text-[#38BDF8] text-sm font-medium">
              {isDownloading
                ? `File ${bulkCurrentIndex + 1} of ${downloadCount}`
                : `${downloadCount} files downloaded`}
            </span>
          </div>
        )}

        {/* Ring + canvas */}
        <div className="relative mx-auto mb-8" style={{ width: 300, height: 300 }}>
          <canvas ref={canvasRef} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 400, height: 400 }} />
          <svg width="300" height="300" viewBox="0 0 260 260" className="relative" style={{ zIndex: 2 }}>
            <circle cx="130" cy="130" r="120" fill="none" stroke="rgba(56,189,248,0.08)" strokeWidth="6" />
            <circle ref={ringRef} cx="130" cy="130" r="120" fill="none" stroke="url(#grad)"
              strokeWidth="6" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 120} strokeDashoffset={2 * Math.PI * 120}
              transform="rotate(-90 130 130)"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
            <defs>
              <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#0EA5E9" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ zIndex: 3 }}>
            {isDownloading ? (
              <>
                <div className="text-5xl font-extrabold text-gradient-sky mb-1 tabular-nums">{clamped}%</div>
                <Loader2 size={18} className="text-[#38BDF8] animate-spin mt-1" />
              </>
            ) : (
              <>
                <FileCheck size={52} className="text-emerald-400 mb-2" />
                <div className="text-xl font-bold text-emerald-400">Done!</div>
              </>
            )}
          </div>
        </div>

        {/* Bulk file-by-file progress dots */}
        {isBulk && isDownloading && (
          <div className="flex justify-center gap-1.5 mb-4 flex-wrap max-w-xs mx-auto">
            {Array.from({ length: downloadCount }).map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full transition-all duration-300"
                style={{
                  background: i < bulkCurrentIndex
                    ? '#34D399'
                    : i === bulkCurrentIndex
                    ? '#38BDF8'
                    : 'rgba(255,255,255,0.1)',
                  boxShadow: i === bulkCurrentIndex ? '0 0 6px rgba(56,189,248,0.8)' : 'none',
                }} />
            ))}
          </div>
        )}

        {/* Status text from backend */}
        <div className="mb-5 min-h-[40px]">
          <p className="text-[#38BDF8] text-sm font-medium transition-all duration-300">
            {statusText || (isDownloading ? 'Downloading...' : 'Complete!')}
          </p>
          {isBulk && isDownloading && (
            <p className="text-slate-500 text-xs mt-1">
              Each file downloads directly to your Downloads folder
            </p>
          )}
        </div>

        {/* Progress bar */}
        <div className="relative w-full h-4 rounded-full overflow-hidden mb-3"
          style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="h-full rounded-full progress-bar-animated transition-all duration-500"
            style={{ width: `${clamped}%` }} />
        </div>

        <div className="flex justify-between text-xs text-slate-500">
          <span>{clamped}% complete</span>
          <span className="flex items-center gap-1">
            <><Video size={10} /> MP4/MP3 files</>
          </span>
        </div>
      </div>
    </div>
  );
}
