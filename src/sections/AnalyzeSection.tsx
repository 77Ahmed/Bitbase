import { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { Play, User, Eye, Clock, CheckCircle, Video, Music, ArrowLeft, ArrowRight, Sparkles, ExternalLink } from 'lucide-react';
import type { VideoData, MediaType } from '../App';

interface AnalyzeSectionProps {
  videoData: VideoData | null;
  mediaType: MediaType;
  setMediaType: (m: MediaType) => void;
  onNext: () => void;
  onBack: () => void;
  isActive: boolean;
}

export default function AnalyzeSection({ videoData, mediaType, setMediaType, onNext, onBack, isActive }: AnalyzeSectionProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isActive || !videoData) return;
    setReady(false);
    const ctx = gsap.context(() => {
      gsap.fromTo(cardRef.current, { y: 60, opacity: 0, scale: 0.95 }, { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out' });
      gsap.delayedCall(0.6, () => setReady(true));
    });
    return () => ctx.revert();
  }, [isActive, videoData]);

  if (!videoData) return (
    <div className="glass-card p-8 text-center text-slate-400 max-w-md mx-auto">
      <p>Enter a URL on the home section to analyze.</p>
    </div>
  );

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div ref={cardRef} className="glass-card p-6 md:p-8 relative overflow-hidden">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 text-sm cursor-pointer">
          <ArrowLeft size={16} />Back to Home
        </button>

        {/* Video card */}
        <div className="flex flex-col md:flex-row gap-6 p-5 rounded-2xl mb-6"
          style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.08), rgba(14,165,233,0.04))', border: '1px solid rgba(56,189,248,0.15)' }}>
          {/* Thumbnail */}
          <div className="relative w-full md:w-72 h-44 rounded-2xl overflow-hidden flex-shrink-0 group">
            {videoData.thumbnail ? (
              <img src={videoData.thumbnail} alt={videoData.title} className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0EA5E9, #0284C7)' }}>
                <Play size={48} className="text-white opacity-80" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
              <Play size={36} className="text-white opacity-0 group-hover:opacity-90 transition-opacity duration-300" />
            </div>
            <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md text-xs font-bold text-white" style={{ background: 'rgba(0,0,0,0.75)' }}>
              {videoData.duration}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 flex flex-col justify-center">
            <h3 className="text-xl font-bold text-white mb-3 leading-snug">{videoData.title}</h3>
            <div className="space-y-2 mb-4">
              <p className="flex items-center gap-2 text-slate-400 text-sm"><User size={14} className="text-[#38BDF8]" />{videoData.channel}</p>
              <p className="flex items-center gap-2 text-slate-400 text-sm"><Eye size={14} className="text-[#38BDF8]" />{videoData.views}</p>
              <p className="flex items-center gap-2 text-slate-400 text-sm"><Clock size={14} className="text-[#38BDF8]" />{videoData.duration}</p>
            </div>
            {videoData.url && (
              <a href={videoData.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[#38BDF8] text-xs hover:underline w-fit">
                <ExternalLink size={12} />View original
              </a>
            )}
            {ready && (
              <div className="flex items-center gap-2 mt-3">
                <CheckCircle size={16} className="text-emerald-400" />
                <span className="text-emerald-400 text-sm font-medium">Ready to download!</span>
              </div>
            )}
          </div>
        </div>

        {/* Format choice */}
        {ready && (
          <div>
            <h4 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2">
              <Sparkles size={14} className="text-[#38BDF8]" />Choose download type
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {[
                { type: 'video' as MediaType, icon: Video, title: 'Download Video', desc: 'Video with audio — MP4' },
                { type: 'audio' as MediaType, icon: Music, title: 'Audio Only', desc: 'MP3 format, high quality' },
              ].map(({ type, icon: Icon, title, desc }) => (
                <button key={type} onClick={() => setMediaType(type)}
                  className={`relative p-6 rounded-2xl text-left transition-all duration-300 cursor-pointer ${mediaType === type ? 'border-2 border-[#38BDF8]' : 'border-2 border-transparent hover:border-[rgba(56,189,248,0.3)]'}`}
                  style={{ background: mediaType === type ? 'linear-gradient(135deg,rgba(56,189,248,0.15),rgba(14,165,233,0.05))' : 'rgba(255,255,255,0.03)' }}>
                  {mediaType === type && (
                    <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[#38BDF8] flex items-center justify-center">
                      <CheckCircle size={12} className="text-white" />
                    </div>
                  )}
                  <Icon size={30} className={`mb-3 ${mediaType === type ? 'text-[#38BDF8]' : 'text-slate-500'}`} />
                  <h4 className="text-white font-semibold mb-1">{title}</h4>
                  <p className="text-slate-400 text-sm">{desc}</p>
                </button>
              ))}
            </div>
            <button onClick={onNext} className="w-full btn-primary-glow py-4 text-base flex items-center justify-center gap-3 cursor-pointer">
              Continue to Format Selection <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
