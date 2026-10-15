import { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { Link, Layers, Youtube, Instagram, Twitter, Facebook, Search, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import type { DownloadMode } from '../App';

interface HeroSectionProps {
  mode: DownloadMode;
  setMode: (m: DownloadMode) => void;
  onAnalyzeSingle: (url: string) => void;
  onAnalyzeBulk: (url: string) => void;
  isActive: boolean;
  globalError?: string;
}

const siteBadges = [
  { icon: Youtube, label: 'YouTube', color: '#FF0000' },
  { icon: Instagram, label: 'Instagram', color: '#E4405F' },
  { icon: Twitter, label: 'Twitter / X', color: '#1DA1F2' },
  { icon: Facebook, label: 'Facebook', color: '#1877F2' },
];

function isValidUrl(str: string) {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}

export default function HeroSection({ mode, setMode, onAnalyzeSingle, onAnalyzeBulk, isActive, globalError }: HeroSectionProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isActive) return;
    setLoading(false);
    const ctx = gsap.context(() => {
      gsap.fromTo(cardRef.current, { y: 80, opacity: 0, scale: 0.95 }, { y: 0, opacity: 1, scale: 1, duration: 1, ease: 'power3.out' });
      gsap.fromTo(titleRef.current, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, delay: 0.2, ease: 'power3.out' });
    });
    return () => ctx.revert();
  }, [isActive]);

  // Show global errors from parent (API errors)
  useEffect(() => {
    if (globalError && isActive) {
      setLoading(false);
      setError(globalError);
    }
  }, [globalError, isActive]);

  const handleAnalyze = async () => {
    setError('');
    if (!url.trim()) {
      setError('Please paste a URL first.');
      gsap.to(cardRef.current, { x: '+=10', duration: 0.1, repeat: 3, yoyo: true });
      gsap.to(cardRef.current, { x: 0, duration: 0.1, delay: 0.4 });
      inputRef.current?.focus();
      return;
    }
    if (!isValidUrl(url.trim())) {
      setError('Please enter a valid URL (must start with https://)');
      return;
    }
    setLoading(true);
    setError('');
    if (mode === 'bulk') {
      await onAnalyzeBulk(url.trim());
    } else {
      await onAnalyzeSingle(url.trim());
    }
    setLoading(false);
  };

  const handleModeSwitch = (m: DownloadMode) => {
    setMode(m); setError(''); setUrl('');
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="text-center mb-10 animate-on-scroll">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6"
          style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)' }}>
          <Sparkles size={14} className="text-[#38BDF8]" />
          <span className="text-sm text-[#38BDF8] font-medium">1000+ Platforms Supported</span>
        </div>
        <h1 ref={titleRef} className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-4 leading-tight">
          <span className="text-gradient-sky glow-text">BitBase</span><br />
          <span className="text-white">Downloader</span>
        </h1>
        <p className="text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
          Download videos & audio from <span className="text-[#38BDF8] font-semibold">1000+ platforms</span> in HD quality. Fast, free & unlimited.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3 mb-8 animate-on-scroll">
        {siteBadges.map(({ icon: Icon, label, color }) => (
          <div key={label} className="flex items-center gap-2 px-4 py-2.5 rounded-full glass-card glass-card-hover cursor-default">
            <Icon size={18} style={{ color }} />
            <span className="text-sm font-medium text-slate-200">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-full glass-card cursor-default">
          <span className="text-[#38BDF8] font-bold text-sm">+</span>
          <span className="text-sm font-medium text-slate-400">1000 More</span>
        </div>
      </div>

      <div ref={cardRef} className="glass-card p-6 md:p-8 relative overflow-hidden animate-on-scroll">
        <div className="shimmer absolute inset-0 pointer-events-none" />

        <div className="flex justify-center gap-3 mb-6">
          {(['single', 'bulk'] as DownloadMode[]).map(m => (
            <button key={m} onClick={() => handleModeSwitch(m)}
              className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 cursor-pointer ${mode === m ? 'btn-primary-glow text-white shadow-lg' : 'glass-card text-slate-400 hover:text-slate-200'}`}>
              {m === 'single' ? <><Link size={16} />Single URL</> : <><Layers size={16} />Bulk Download</>}
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-slate-500 mb-4">
          {mode === 'single'
            ? 'Paste any single video URL — YouTube, TikTok, Instagram, Twitter, Vimeo & more.'
            : 'Paste a YouTube playlist or channel URL to fetch ALL videos, then choose which to download.'}
          {' '}<span className="text-slate-600">Not sure? Just paste it — we detect playlists automatically.</span>
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input ref={inputRef} type="url" value={url}
              onChange={e => { setUrl(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && !loading && handleAnalyze()}
              placeholder={mode === 'single' ? 'https://youtube.com/watch?v=...' : 'https://youtube.com/@channel or playlist URL'}
              className="w-full px-5 py-4 input-glow text-base" disabled={loading} />
            {url && !loading && (
              <button onClick={() => { setUrl(''); setError(''); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">✕</button>
            )}
          </div>
          <button onClick={handleAnalyze} disabled={loading}
            className="btn-primary-glow px-8 py-4 text-base flex items-center justify-center gap-3 min-w-[160px] cursor-pointer disabled:opacity-70">
            {loading
              ? <><Loader2 size={18} className="animate-spin" /><span>{mode === 'bulk' ? 'Scanning...' : 'Fetching...'}</span></>
              : <><Search size={18} /><span>{mode === 'bulk' ? 'Scan' : 'Get Video'}</span></>}
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 text-red-400 text-sm p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertCircle size={14} className="flex-shrink-0" />{error}
          </div>
        )}

        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.1), transparent 70%)', filter: 'blur(40px)' }} />
      </div>

      <div className="absolute top-20 left-10 text-[rgba(56,189,248,0.15)] floating hidden lg:block"><Youtube size={40} /></div>
      <div className="absolute top-40 right-16 text-[rgba(56,189,248,0.12)] floating-delay-1 hidden lg:block"><Instagram size={32} /></div>
      <div className="absolute bottom-40 left-16 text-[rgba(56,189,248,0.1)] floating-delay-2 hidden lg:block"><Twitter size={28} /></div>
    </div>
  );
}
