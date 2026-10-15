import { Youtube, Instagram, Twitter, Facebook, Globe, Music, Video, Tv } from 'lucide-react';

const sites = [
  { name:'YouTube', icon:Youtube, color:'#FF0000', desc:'Videos, Shorts, Playlists, Channels', bg:'rgba(255,0,0,0.08)' },
  { name:'Instagram', icon:Instagram, color:'#E4405F', desc:'Reels, Posts, Stories', bg:'rgba(228,64,95,0.08)' },
  { name:'Twitter / X', icon:Twitter, color:'#1DA1F2', desc:'Videos, GIFs, Tweets', bg:'rgba(29,161,242,0.08)' },
  { name:'Facebook', icon:Facebook, color:'#1877F2', desc:'Videos, Reels, Watch', bg:'rgba(24,119,242,0.08)' },
  { name:'TikTok', icon:Music, color:'#FF0050', desc:'Videos, Sounds', bg:'rgba(255,0,80,0.08)' },
  { name:'Vimeo', icon:Video, color:'#1AB7EA', desc:'HD Videos, Channels', bg:'rgba(26,183,234,0.08)' },
  { name:'Dailymotion', icon:Tv, color:'#0066DC', desc:'Videos, Live', bg:'rgba(0,102,220,0.08)' },
  { name:'1000+ More', icon:Globe, color:'#38BDF8', desc:'Any site yt-dlp supports', bg:'rgba(56,189,248,0.08)' },
];

export default function SitesSection() {
  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="text-center mb-12 animate-on-scroll">
        <h2 className="text-4xl font-extrabold text-white mb-4">Supported <span className="text-gradient-sky">Platforms</span></h2>
        <p className="text-slate-400 max-w-lg mx-auto">Paste any URL from any of these platforms and BitBase will handle the rest.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {sites.map(({ name, icon:Icon, color, desc, bg }) => (
          <div key={name} className="glass-card glass-card-hover p-6 text-center group cursor-default animate-on-scroll">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-transform duration-300 group-hover:scale-110" style={{ background:bg, border:`1px solid ${color}30` }}>
              <Icon size={30} style={{ color }}/>
            </div>
            <h3 className="text-white font-bold mb-1">{name}</h3>
            <p className="text-slate-400 text-sm">{desc}</p>
          </div>
        ))}
      </div>
      <div className="mt-10 glass-card p-6 text-center animate-on-scroll">
        <p className="text-slate-400 text-sm">
          Powered by <span className="text-[#38BDF8] font-semibold">yt-dlp</span> — supports YouTube, TikTok, Instagram, Twitter, Facebook, Vimeo, Dailymotion, SoundCloud, Twitch, Reddit, Pinterest, LinkedIn, and <span className="text-[#38BDF8] font-semibold">1000+ more sites</span>.
        </p>
      </div>
    </div>
  );
}
