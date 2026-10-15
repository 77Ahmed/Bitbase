import { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { Video, Music, Download, ArrowLeft, Settings2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { MediaType, VideoFormat } from '../App';

interface OptionsSectionProps {
  mediaType: MediaType;
  setMediaType: (m: MediaType) => void;
  onDownload: () => void;
  onBack: () => void;
  isActive: boolean;
  videoFormats: VideoFormat[];
  selectedFormat: VideoFormat | null;
  setSelectedFormat: (f: VideoFormat | null) => void;
  selectedQuality: string;
  setSelectedQuality: (q: string) => void;
  error?: string;
}

const audioQualities = [
  { id: 'mp3-320', label: '320 kbps — Highest Quality', badge: 'MP3', quality: '320', badgeColor: '#93C5FD' },
  { id: 'mp3-256', label: '256 kbps — High Quality',   badge: 'MP3', quality: '256', badgeColor: '#93C5FD' },
  { id: 'mp3-128', label: '128 kbps — Standard',       badge: 'MP3', quality: '128', badgeColor: '#93C5FD' },
  { id: 'mp3-64',  label: '64 kbps — Small File',      badge: 'MP3', quality: '64',  badgeColor: '#93C5FD' },
];

const videoQualities = [
  { id: '2160', label: '4K Ultra HD',  badge: '4K',    quality: '2160', badgeColor: '#C4B5FD' },
  { id: '1080', label: '1080p Full HD',badge: '1080p', quality: '1080', badgeColor: '#FCA5A5' },
  { id: '720',  label: '720p HD',      badge: '720p',  quality: '720',  badgeColor: '#FCD34D' },
  { id: '480',  label: '480p Standard',badge: '480p',  quality: '480',  badgeColor: '#86EFAC' },
  { id: '360',  label: '360p Low',     badge: '360p',  quality: '360',  badgeColor: '#94A3B8' },
];

export default function OptionsSection({ mediaType, setMediaType, onDownload, onBack, isActive, videoFormats, selectedFormat, setSelectedFormat, selectedQuality, setSelectedQuality, error }: OptionsSectionProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  // Use real formats if available, else fallback presets
  const hasRealFormats = videoFormats && videoFormats.length > 0;

  useEffect(() => {
    if (!isActive) return;
    setDownloading(false);
    const ctx = gsap.context(() => {
      gsap.fromTo(cardRef.current, { y: 60, opacity: 0, scale: 0.95 }, { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out' });
      gsap.fromTo('.opt-card', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.07, delay: 0.3, ease: 'power3.out' });
    });
    return () => ctx.revert();
  }, [isActive, mediaType]);

  // Default select first on mount or mode change
  useEffect(() => {
    if (mediaType === 'video') {
      if (hasRealFormats && !selectedFormat) setSelectedFormat(videoFormats[0]);
      else if (!hasRealFormats) setSelectedQuality('1080');
    } else {
      setSelectedQuality('320');
    }
  }, [mediaType]);

  const handleDownload = async () => {
    setDownloading(true);
    await onDownload();
    setDownloading(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div ref={cardRef} className="glass-card p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm cursor-pointer">
            <ArrowLeft size={16} />Back
          </button>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings2 size={20} className="text-[#38BDF8]" />Format & Quality
          </h2>
          <div className="w-16" />
        </div>

        {/* Media toggle */}
        <div className="flex justify-center gap-3 mb-8">
          {(['video', 'audio'] as MediaType[]).map(t => (
            <button key={t} onClick={() => setMediaType(t)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 cursor-pointer ${mediaType === t ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
              style={{ background: mediaType === t ? 'linear-gradient(135deg,#38BDF8,#0EA5E9)' : 'rgba(255,255,255,0.05)', border: mediaType === t ? 'none' : '1px solid rgba(148,163,184,0.2)' }}>
              {t === 'video' ? <Video size={15} /> : <Music size={15} />}
              {t === 'video' ? 'Video (MP4)' : 'Audio (MP3)'}
            </button>
          ))}
        </div>

        {/* Formats */}
        {mediaType === 'video' ? (
          <div>
            <p className="text-slate-400 text-xs mb-3">
              {hasRealFormats ? `${videoFormats.length} formats available for this video` : 'Select preferred quality'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              {(hasRealFormats ? videoFormats.map(f => ({
                id: f.id, label: f.label, badge: f.badge, quality: String(f.height),
                badgeColor: f.height >= 2160 ? '#C4B5FD' : f.height >= 1080 ? '#FCA5A5' : '#FCD34D',
                size: f.size,
              })) : videoQualities).map(fmt => {
                const isSelected = hasRealFormats
                  ? selectedFormat?.id === fmt.id
                  : selectedQuality === fmt.quality;
                return (
                  <button key={fmt.id} onClick={() => {
                    if (hasRealFormats) setSelectedFormat(videoFormats.find(f => f.id === fmt.id) || null);
                    else setSelectedQuality(fmt.quality);
                  }}
                    className={`opt-card text-left p-4 rounded-xl transition-all duration-300 cursor-pointer ${isSelected ? 'border-2 border-[#38BDF8]' : 'border-2 border-transparent hover:border-[rgba(56,189,248,0.3)]'}`}
                    style={{ background: isSelected ? 'linear-gradient(135deg,rgba(56,189,248,0.12),rgba(14,165,233,0.04))' : 'rgba(255,255,255,0.03)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: `${fmt.badgeColor}20`, color: fmt.badgeColor }}>{fmt.badge}</span>
                        <span className="text-white text-sm font-medium">{fmt.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {(fmt as {size?: string}).size && <span className="text-slate-500 text-xs">{(fmt as {size?: string}).size}</span>}
                        {isSelected && <CheckCircle size={15} className="text-[#38BDF8]" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div>
            <p className="text-slate-400 text-xs mb-3">Audio will be extracted and converted to MP3</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              {audioQualities.map(fmt => {
                const isSelected = selectedQuality === fmt.quality;
                return (
                  <button key={fmt.id} onClick={() => setSelectedQuality(fmt.quality)}
                    className={`opt-card text-left p-4 rounded-xl transition-all duration-300 cursor-pointer ${isSelected ? 'border-2 border-[#38BDF8]' : 'border-2 border-transparent hover:border-[rgba(56,189,248,0.3)]'}`}
                    style={{ background: isSelected ? 'linear-gradient(135deg,rgba(56,189,248,0.12),rgba(14,165,233,0.04))' : 'rgba(255,255,255,0.03)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: `${fmt.badgeColor}20`, color: fmt.badgeColor }}>{fmt.badge}</span>
                        <span className="text-white text-sm font-medium">{fmt.label}</span>
                      </div>
                      {isSelected && <CheckCircle size={15} className="text-[#38BDF8]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-center gap-2 text-red-400 text-sm p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertCircle size={14} className="flex-shrink-0" />{error}
          </div>
        )}

        <button onClick={handleDownload} disabled={downloading}
          className="w-full btn-primary-glow py-4 text-lg flex items-center justify-center gap-3 cursor-pointer pulse-glow disabled:opacity-70">
          {downloading
            ? <><Loader2 size={20} className="animate-spin" />Starting download...</>
            : <><Download size={22} />Download Now</>}
        </button>

        <p className="text-center text-slate-600 text-xs mt-3">
          File will download directly to your browser's downloads folder
        </p>
      </div>
    </div>
  );
}
