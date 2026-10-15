import { useEffect, useRef, useState } from 'react';
import { CloudDownload, Home, Globe, Zap, History, Mail, Menu, X } from 'lucide-react';
import type { AppStage, NavPage } from '../App';

interface NavbarProps {
  stage: AppStage;
  navPage: NavPage;
  onReset: () => void;
  onNavPage: (page: NavPage) => void;
}

const navLinks = [
  { id: 'home' as NavPage, icon: Home, label: 'Home' },
  { id: 'sites' as NavPage, icon: Globe, label: 'Sites' },
  { id: 'features' as NavPage, icon: Zap, label: 'Features' },
  { id: 'history' as NavPage, icon: History, label: 'History' },
  { id: 'contact' as NavPage, icon: Mail, label: 'Contact' },
];

export default function Navbar({ navPage, onReset, onNavPage }: NavbarProps) {
  const navRef = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  const handleNav = (page: NavPage) => {
    onNavPage(page);
    setMobileOpen(false);
  };

  return (
    <nav ref={navRef} className="fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-500"
      style={{ width: scrolled ? '92%' : '88%', maxWidth: 1100 }}>
      <div className="flex items-center justify-between px-5 py-3 rounded-full transition-all duration-500"
        style={{
          background: scrolled ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          border: `1px solid ${scrolled ? 'rgba(56,189,248,0.3)' : 'rgba(56,189,248,0.1)'}`,
          boxShadow: scrolled ? '0 8px 32px rgba(0,0,0,0.3)' : 'none'
        }}>

        {/* Logo */}
        <button onClick={onReset} className="flex items-center gap-2.5 group cursor-pointer">
          <div className="relative">
            <CloudDownload size={26} className="text-[#38BDF8] transition-transform duration-300 group-hover:scale-110" />
            <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: 'radial-gradient(circle,rgba(56,189,248,0.4),transparent 70%)', filter: 'blur(8px)' }} />
          </div>
          <div className="leading-none">
            <span className="text-base font-extrabold text-gradient-sky block">BitBase</span>
            <span className="text-[10px] text-slate-600 block">by BitBase Team</span>
          </div>
        </button>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => handleNav(id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 cursor-pointer ${navPage === id ? 'text-[#38BDF8]' : 'text-slate-400 hover:text-slate-200'}`}
              style={{ background: navPage === id ? 'rgba(56,189,248,0.1)' : 'transparent' }}>
              <Icon size={14} />{label}
            </button>
          ))}
        </div>

        {/* CTA + mobile toggle */}
        <div className="flex items-center gap-2">
          <button onClick={onReset}
            className="hidden sm:block btn-primary-glow px-4 py-2 text-sm rounded-full cursor-pointer">
            Download Now
          </button>
          <button onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-slate-400 hover:text-white p-1 cursor-pointer">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="mt-2 rounded-2xl p-3 md:hidden"
          style={{ background: 'rgba(15,23,42,0.97)', backdropFilter: 'blur(24px)', border: '1px solid rgba(56,189,248,0.2)' }}>
          {navLinks.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => handleNav(id)}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${navPage === id ? 'text-[#38BDF8] bg-[rgba(56,189,248,0.08)]' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}>
              <Icon size={16} className="text-[#38BDF8]" />{label}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}