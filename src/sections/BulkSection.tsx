import { useRef, useEffect, useState, useMemo } from 'react';
import gsap from 'gsap';
import { CheckSquare, Download, ArrowLeft, Video, Music, Search, Clock, Eye, HardDrive, Filter, AlertCircle, Loader2, Shuffle } from 'lucide-react';
import type { VideoData, MediaType } from '../App';

interface BulkSectionProps {
  videos: VideoData[]; selectedIds: string[]; setSelectedIds: (ids:string[])=>void;
  mediaType: MediaType; setMediaType: (m:MediaType)=>void;
  onDownload: ()=>void; onBack: ()=>void; isActive: boolean;
  inputUrl: string; quality: string; setQuality: (q:string)=>void; error?: string;
}

export default function BulkSection({ videos, selectedIds, setSelectedIds, mediaType, setMediaType, onDownload, onBack, isActive, inputUrl, quality, setQuality, error }: BulkSectionProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all'|'selected'|'unselected'>('all');
  const [downloading, setDownloading] = useState(false);
  const [rangeFrom, setRangeFrom] = useState('1');
  const [rangeTo, setRangeTo] = useState('');
  const [rangeError, setRangeError] = useState('');
  const colors = ['#38BDF8','#34D399','#A78BFA','#F472B6','#FB923C','#FBBF24','#60A5FA','#4ADE80'];

  useEffect(() => {
    if (!isActive || !videos.length) return;
    setDownloading(false);
    if (!rangeTo) setRangeTo(String(videos.length));
    const ctx = gsap.context(() => {
      gsap.fromTo(cardRef.current, {y:60,opacity:0,scale:0.95}, {y:0,opacity:1,scale:1,duration:0.8,ease:'power3.out'});
      gsap.fromTo('.bulk-row', {x:-30,opacity:0}, {x:0,opacity:1,duration:0.4,stagger:0.03,delay:0.3,ease:'power3.out'});
    });
    return () => ctx.revert();
  }, [isActive, videos]);

  const qualityOptions = mediaType === 'video'
    ? [['2160','4K Ultra HD'],['1080','1080p Full HD'],['720','720p HD'],['480','480p'],['360','360p']]
    : [['320','320 kbps (Best)'],['256','256 kbps'],['128','128 kbps'],['64','64 kbps']];

  useEffect(() => {
    if (!qualityOptions.some(([v]) => v === quality)) setQuality(mediaType === 'video' ? '1080' : '320');
  }, [mediaType]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleOne = (id:string) => setSelectedIds(selectedIds.includes(id) ? selectedIds.filter(s=>s!==id) : [...selectedIds,id]);
  const toggleAll = () => setSelectedIds(selectedIds.length===videos.length ? [] : videos.map(v=>v.id));

  const applyRange = () => {
    setRangeError('');
    const from = parseInt(rangeFrom);
    const to = parseInt(rangeTo);
    if (isNaN(from)||isNaN(to)||from<1||to>videos.length||from>to) {
      setRangeError(`Enter valid range between 1 and ${videos.length}`);
      return;
    }
    setSelectedIds(videos.slice(from-1, to).map(v=>v.id));
  };

  const filtered = useMemo(() => videos.filter(v => {
    const ms = v.title.toLowerCase().includes(search.toLowerCase());
    const mf = filter==='all'?true:filter==='selected'?selectedIds.includes(v.id):!selectedIds.includes(v.id);
    return ms && mf;
  }), [videos, search, filter, selectedIds]);

  const estimateSize = useMemo(() => {
    let total = 0;
    videos.filter(v=>selectedIds.includes(v.id)).forEach(v => {
      const m = v.size?.match(/([\d.]+)\s*(MB|GB)/);
      total += m ? (m[2]==='GB' ? parseFloat(m[1])*1024 : parseFloat(m[1])) : 50;
    });
    return total>1024 ? `~${(total/1024).toFixed(1)} GB` : `~${Math.round(total)} MB`;
  }, [videos, selectedIds]);

  const handleDownload = async () => { setDownloading(true); await onDownload(); setDownloading(false); };

  if (!videos.length) return (
    <div className="glass-card p-8 text-center text-slate-400 max-w-md mx-auto">
      <p>No videos loaded. Go back and enter a channel/playlist URL.</p>
      <button onClick={onBack} className="mt-4 flex items-center gap-2 text-[#38BDF8] mx-auto cursor-pointer text-sm"><ArrowLeft size={14}/>Back</button>
    </div>
  );

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div ref={cardRef} className="glass-card p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm cursor-pointer"><ArrowLeft size={15}/>Back</button>
          <div className="text-center">
            <h2 className="text-xl font-bold text-white">Bulk Download</h2>
            <p className="text-xs text-slate-500 truncate max-w-xs mt-0.5">{inputUrl}</p>
          </div>
          <div className="text-right">
            <p className="text-[#38BDF8] font-bold text-sm">{videos.length} videos found</p>
            <p className="text-slate-500 text-xs">{selectedIds.length} selected</p>
          </div>
        </div>

        {/* Media + Quality */}
        <div className="flex flex-wrap justify-center gap-3 mb-5">
          {(['video','audio'] as MediaType[]).map(t=>(
            <button key={t} onClick={()=>setMediaType(t)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer ${mediaType===t?'text-white':'text-slate-400 hover:text-slate-200'}`}
              style={{background:mediaType===t?'linear-gradient(135deg,#38BDF8,#0EA5E9)':'rgba(255,255,255,0.05)',border:mediaType===t?'none':'1px solid rgba(148,163,184,0.2)'}}>
              {t==='video'?<Video size={14}/>:<Music size={14}/>}{t==='video'?'Video (MP4)':'Audio (MP3)'}
            </button>
          ))}
          <select value={quality} onChange={e=>setQuality(e.target.value)} className="px-3 py-2 rounded-full text-sm cursor-pointer text-white" style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(148,163,184,0.2)'}}>
            {qualityOptions.map(([v,l])=><option key={v} value={v} style={{background:'#1E293B'}}>{l}</option>)}
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[{label:'Total Found',value:videos.length},{label:'Selected',value:selectedIds.length},{label:'Est. Size',value:selectedIds.length>0?estimateSize:'—'}].map(({label,value})=>(
            <div key={label} className="rounded-xl p-3 text-center" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
              <p className="text-white font-bold text-xl leading-tight">{value}</p>
              <p className="text-slate-500 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Custom Range Selection */}
        <div className="mb-5 p-4 rounded-2xl" style={{background:'rgba(56,189,248,0.05)',border:'1px solid rgba(56,189,248,0.15)'}}>
          <p className="text-[#38BDF8] text-sm font-semibold mb-3 flex items-center gap-2"><Shuffle size={14}/>Custom Range Selection</p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm">From</span>
              <input type="number" value={rangeFrom} min={1} max={videos.length} onChange={e=>setRangeFrom(e.target.value)}
                className="w-20 px-3 py-2 rounded-lg text-sm text-white text-center" style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(56,189,248,0.3)'}}/>
              <span className="text-slate-400 text-sm">To</span>
              <input type="number" value={rangeTo} min={1} max={videos.length} onChange={e=>setRangeTo(e.target.value)}
                className="w-20 px-3 py-2 rounded-lg text-sm text-white text-center" style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(56,189,248,0.3)'}}/>
              <span className="text-slate-500 text-xs">of {videos.length}</span>
            </div>
            <button onClick={applyRange} className="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all text-white" style={{background:'linear-gradient(135deg,#38BDF8,#0EA5E9)'}}>
              Apply Range
            </button>
            <div className="flex gap-2 flex-wrap">
              {[[1,10],[1,25],[1,50],[51,100]].filter(([,b])=>b<=videos.length||(b===100&&videos.length>50)).map(([a,b])=>(
                <button key={`${a}-${b}`} onClick={()=>{setRangeFrom(String(a));setRangeTo(String(Math.min(b,videos.length)));setTimeout(()=>setSelectedIds(videos.slice(a-1,Math.min(b,videos.length)).map(v=>v.id)),0);}}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all text-slate-300 hover:text-white"
                  style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)'}}>
                  {a}–{Math.min(b,videos.length)}
                </button>
              ))}
            </div>
          </div>
          {rangeError && <p className="text-red-400 text-xs mt-2">{rangeError}</p>}
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
            <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search videos..." className="w-full pl-8 pr-4 py-2 input-glow text-sm"/>
          </div>
          <div className="flex gap-2">
            {(['all','selected','unselected'] as const).map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                className={`px-3 py-2 rounded-lg text-xs font-medium cursor-pointer capitalize ${filter===f?'text-[#38BDF8]':'text-slate-500 hover:text-slate-300'}`}
                style={{background:filter===f?'rgba(56,189,248,0.1)':'rgba(255,255,255,0.03)',border:`1px solid ${filter===f?'rgba(56,189,248,0.3)':'rgba(255,255,255,0.06)'}`}}>
                <Filter size={9} className="inline mr-1"/>{f}
              </button>
            ))}
          </div>
        </div>

        {/* Select All */}
        <div className="flex items-center justify-between px-4 py-3 rounded-xl mb-3 cursor-pointer"
          style={{background:'rgba(56,189,248,0.05)',border:'1px solid rgba(56,189,248,0.15)'}} onClick={toggleAll}>
          <div className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded flex items-center justify-center ${selectedIds.length===videos.length?'bg-[#38BDF8]':'border-2 border-slate-600 hover:border-[#38BDF8]'}`}>
              {selectedIds.length===videos.length && <CheckSquare size={11} className="text-white"/>}
            </div>
            <span className="text-white font-medium text-sm">{selectedIds.length===videos.length?'Deselect All':'Select All'}</span>
          </div>
          <span className="text-slate-400 text-xs">{filtered.length} shown</span>
        </div>

        {/* Video list */}
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 mb-5" style={{scrollbarWidth:'thin',scrollbarColor:'rgba(56,189,248,0.3) transparent'}}>
          {filtered.map((video, i) => {
            const isSelected = selectedIds.includes(video.id);
            const color = colors[i % colors.length];
            const globalIndex = videos.indexOf(video) + 1;
            return (
              <div key={video.id} onClick={()=>toggleOne(video.id)}
                className={`bulk-row flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${isSelected?'border border-[rgba(56,189,248,0.3)]':'border border-transparent hover:border-[rgba(255,255,255,0.08)]'}`}
                style={{background:isSelected?'rgba(56,189,248,0.06)':'rgba(255,255,255,0.02)'}}>
                <div className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center ${isSelected?'bg-[#38BDF8]':'border-2 border-slate-600'}`}>
                  {isSelected && <CheckSquare size={11} className="text-white"/>}
                </div>
                <span className="text-slate-600 text-xs w-6 text-right flex-shrink-0">{globalIndex}</span>
                <div className="w-14 h-9 rounded-lg flex-shrink-0 overflow-hidden">
                  {video.thumbnail
                    ? <img src={video.thumbnail} alt="" className="w-full h-full object-cover"/>
                    : <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold" style={{background:`linear-gradient(135deg,${color}30,${color}15)`}}>{globalIndex}</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate leading-snug">{video.title}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-slate-500 text-xs flex items-center gap-1"><Eye size={9}/>{video.views}</span>
                    <span className="text-slate-500 text-xs flex items-center gap-1"><Clock size={9}/>{video.duration}</span>
                    {video.size&&<span className="text-slate-500 text-xs flex items-center gap-1"><HardDrive size={9}/>{video.size}</span>}
                  </div>
                </div>
                {video.quality&&<span className="text-xs font-bold px-2 py-0.5 rounded flex-shrink-0" style={{background:`${color}20`,color}}>{video.quality}</span>}
              </div>
            );
          })}
          {filtered.length===0&&<div className="text-center py-10 text-slate-500 text-sm">No videos match your search.</div>}
        </div>

        {error&&<div className="mb-4 flex items-center gap-2 text-red-400 text-sm p-3 rounded-xl" style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)'}}><AlertCircle size={14} className="flex-shrink-0"/>{error}</div>}

        {selectedIds.length===0
          ? <p className="text-center text-slate-500 text-sm py-4">Select at least one video to download.</p>
          : <button onClick={handleDownload} disabled={downloading}
              className="w-full btn-primary-glow py-4 text-lg flex items-center justify-center gap-3 cursor-pointer pulse-glow disabled:opacity-70">
              {downloading
                ? <><Loader2 size={20} className="animate-spin"/>Downloading {selectedIds.length} files...</>
                : <><Download size={22}/>Download {selectedIds.length} {selectedIds.length===1?'Video':'Videos'} <span className="text-sm opacity-80">({estimateSize})</span></>}
            </button>}
        <p className="text-center text-slate-600 text-xs mt-3">Each file is saved separately to your browser's downloads folder</p>
      </div>
    </div>
  );
}
