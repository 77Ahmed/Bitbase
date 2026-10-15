import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { CheckCircle, Zap, ShieldCheck, Heart, Download, RotateCcw, Sparkles, Star, Layers, Package, FolderOpen } from 'lucide-react';
import type { DownloadMode } from '../App';
import { useState } from 'react';
import { getDownloadsPath } from '../lib/api';

interface Props { onReset:()=>void; isActive:boolean; downloadCount:number; mode:DownloadMode; }

export default function SuccessSection({ onReset, isActive, downloadCount, mode }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [downloadsPath, setDownloadsPath] = useState('');
  const isBulk = mode==='bulk'&&downloadCount>1;

  useEffect(()=>{ getDownloadsPath().then(p=>setDownloadsPath(p)).catch(()=>{}); },[]);

  useEffect(()=>{
    if (!isActive) return;
    const ctx = gsap.context(()=>{
      gsap.fromTo(containerRef.current,{scale:0.8,opacity:0},{scale:1,opacity:1,duration:0.8,ease:'elastic.out(1,0.5)'});
      containerRef.current?.querySelectorAll('.sparkle').forEach((el,i)=>{
        gsap.fromTo(el,{scale:0,rotation:0,opacity:1},{scale:1.5,rotation:360,opacity:0,duration:1.5,delay:i*0.1,ease:'power2.out'});
      });
    });
    return ()=>ctx.revert();
  },[isActive]);

  const openDownloads = () => {
    if (downloadsPath) {
      navigator.clipboard.writeText(downloadsPath).catch(()=>{});
      alert(`Downloads folder path copied!\n\n${downloadsPath}\n\nPaste in your file explorer to open.`);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div ref={containerRef} className="glass-card p-8 md:p-12 text-center relative overflow-hidden">
        {Array.from({length:12}).map((_,i)=>(
          <div key={i} className="sparkle absolute pointer-events-none" style={{top:`${10+Math.random()*80}%`,left:`${5+Math.random()*90}%`}}>
            {i%2===0?<Sparkles size={14+Math.random()*10} className="text-[#38BDF8]"/>:<Star size={10+Math.random()*8} className="text-amber-400"/>}
          </div>
        ))}

        <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-full mb-6" style={{background:'linear-gradient(135deg,rgba(52,211,153,0.2),rgba(16,185,129,0.1))',border:'2px solid rgba(52,211,153,0.3)'}}>
          {isBulk?<Package size={44} className="text-emerald-400"/>:<CheckCircle size={48} className="text-emerald-400"/>}
          <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{background:'rgba(52,211,153,0.3)'}}/>
        </div>

        <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">
          {isBulk?`${downloadCount} Files Downloaded!`:'Download Complete!'}
        </h2>

        {isBulk&&(
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4" style={{background:'rgba(56,189,248,0.1)',border:'1px solid rgba(56,189,248,0.2)'}}>
            <Layers size={14} className="text-[#38BDF8]"/>
            <span className="text-[#38BDF8] text-sm">Each file saved separately</span>
          </div>
        )}

        <p className="text-slate-400 max-w-md mx-auto mb-3">
          {isBulk?`All ${downloadCount} files have been saved to your downloads folder.`:'Your file has been saved to your downloads folder.'}
        </p>

        {downloadsPath&&(
          <p className="text-slate-600 text-xs mb-8 font-mono">{downloadsPath}</p>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <button onClick={onReset} className="btn-primary-glow px-8 py-4 flex items-center justify-center gap-3 text-base cursor-pointer">
            <RotateCcw size={18}/>Download Another
          </button>
          <button onClick={openDownloads}
            className="px-8 py-4 rounded-2xl text-base font-semibold flex items-center justify-center gap-3 transition-all duration-300 cursor-pointer"
            style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(56,189,248,0.2)',color:'#38BDF8'}}>
            <FolderOpen size={18}/>Open Downloads Folder
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            {icon:Zap,text:'Lightning Fast',color:'#38BDF8'},
            {icon:ShieldCheck,text:'100% Safe',color:'#34D399'},
            {icon:Download,text:'Unlimited Downloads',color:'#A78BFA'},
          ].map(({icon:Icon,text,color})=>(
            <div key={text} className="flex items-center gap-2 justify-center p-3 rounded-xl" style={{background:`${color}0a`,border:`1px solid ${color}20`}}>
              <Icon size={14} style={{color}}/><span className="text-slate-300 text-xs font-medium">{text}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-slate-600 text-xs mt-6 flex items-center justify-center gap-1">
        BitBase Downloader <Heart size={10} className="text-red-400 fill-red-400"/> by BitBase Team
      </p>
    </div>
  );
}
