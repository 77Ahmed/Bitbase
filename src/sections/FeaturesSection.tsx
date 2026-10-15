import { Zap, ShieldCheck, Infinity, Smartphone, Download, Layers, Music, Video, Globe, Lock, Clock, HardDrive } from 'lucide-react';

const features = [
  { icon:Zap, title:'Lightning Fast', desc:'Multi-threaded downloads powered by yt-dlp. Get your files in seconds.', color:'#38BDF8' },
  { icon:ShieldCheck, title:'100% Safe', desc:'No malware, no spyware, no ads. Open source engine you can trust.', color:'#34D399' },
  { icon:Infinity, title:'No Limits', desc:'Download entire channels, playlists with hundreds of videos at once.', color:'#A78BFA' },
  { icon:Smartphone, title:'Any Device', desc:'Works in any modern browser on Windows, Mac, Linux, iOS, Android.', color:'#F472B6' },
  { icon:Video, title:'HD Quality', desc:'Download in 4K, 1080p, 720p — whatever the source offers.', color:'#FB923C' },
  { icon:Music, title:'Audio Extract', desc:'Extract MP3 audio from any video at 320kbps quality.', color:'#FBBF24' },
  { icon:Layers, title:'Bulk Download', desc:'Select custom ranges — download videos 1-50, 20-80, or any range.', color:'#60A5FA' },
  { icon:Globe, title:'1000+ Sites', desc:'YouTube, TikTok, Instagram, Twitter, Vimeo, Dailymotion and more.', color:'#4ADE80' },
  { icon:Lock, title:'Private & Secure', desc:'No account needed. No tracking. Your downloads stay yours.', color:'#F87171' },
  { icon:Clock, title:'Download History', desc:'Track all your previous downloads with full details.', color:'#C084FC' },
  { icon:HardDrive, title:'Smart Compression', desc:'Bulk downloads zipped automatically for easy transfer.', color:'#34D399' },
  { icon:Download, title:'Direct to Device', desc:'Files save straight to your downloads folder, no cloud needed.', color:'#38BDF8' },
];

export default function FeaturesSection() {
  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="text-center mb-12 animate-on-scroll">
        <h2 className="text-4xl font-extrabold text-white mb-4">Why <span className="text-gradient-sky">BitBase?</span></h2>
        <p className="text-slate-400 max-w-lg mx-auto">Everything you need in a video downloader, nothing you don't.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {features.map(({ icon:Icon, title, desc, color }) => (
          <div key={title} className="glass-card glass-card-hover p-5 group cursor-default animate-on-scroll">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110" style={{ background:`${color}15` }}>
              <Icon size={22} style={{ color }}/>
            </div>
            <h3 className="text-white font-semibold mb-1 text-sm">{title}</h3>
            <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
