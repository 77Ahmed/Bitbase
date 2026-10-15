import { useState, useCallback, useEffect } from 'react';
import gsap from 'gsap';
import ParticleCanvas from './sections/ParticleCanvas';
import Navbar from './sections/Navbar';
import HeroSection from './sections/HeroSection';
import AnalyzeSection from './sections/AnalyzeSection';
import BulkSection from './sections/BulkSection';
import OptionsSection from './sections/OptionsSection';
import ProgressSection from './sections/ProgressSection';
import SuccessSection from './sections/SuccessSection';
import SitesSection from './sections/SitesSection';
import FeaturesSection from './sections/FeaturesSection';
import HistorySection from './sections/HistorySection';
import ContactSection from './sections/ContactSection';
import { fetchVideoInfo, fetchPlaylist, downloadSingle, downloadBulk, getDownloadsPath } from './lib/api';

export type AppStage = 'hero' | 'analyze' | 'bulk' | 'options' | 'progress' | 'success';
export type DownloadMode = 'single' | 'bulk';
export type MediaType = 'video' | 'audio';
export type NavPage = 'home' | 'sites' | 'features' | 'history' | 'contact';

export interface VideoFormat { id: string; label: string; height: number; ext: string; size: string; badge: string; }
export interface VideoData { id: string; title: string; channel: string; views: string; duration: string; thumbnail: string; size?: string; quality?: string; url?: string; formats?: VideoFormat[]; }
export interface HistoryItem { id: string; title: string; channel: string; thumbnail: string; mediaType: MediaType; quality: string; date: string; size?: string; count?: number; mode: DownloadMode; filename?: string; filePath?: string; filenames?: string[]; }

// Animate screen transitions
function animateIn(el: HTMLElement | null) {
  if (!el) return;
  gsap.fromTo(el,
    { opacity: 0, y: 40, scale: 0.97 },
    { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out' }
  );
}

function App() {
  const [stage, setStage] = useState<AppStage>('hero');
  const [navPage, setNavPage] = useState<NavPage>('home');
  const [mode, setMode] = useState<DownloadMode>('single');
  const [mediaType, setMediaType] = useState<MediaType>('video');
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [bulkVideos, setBulkVideos] = useState<VideoData[]>([]);
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadCount, setDownloadCount] = useState(0);
  const [inputUrl, setInputUrl] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<VideoFormat | null>(null);
  const [selectedQuality, setSelectedQuality] = useState('1080');
  const [error, setError] = useState('');
  const [statusText, setStatusText] = useState('');
  const [bulkCurrentIndex, setBulkCurrentIndex] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('bitbase_history') || '[]'); } catch { return []; }
  });

  const saveHistory = useCallback((item: HistoryItem) => {
    setHistory(prev => {
      const next = [item, ...prev].slice(0, 50);
      localStorage.setItem('bitbase_history', JSON.stringify(next));
      return next;
    });
  }, []);

  // Animate every screen change
  const goToStage = useCallback((s: AppStage) => {
    setStage(s);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      animateIn(document.getElementById('main-screen'));
    }, 50);
  }, []);

  const goToNav = useCallback((page: NavPage) => {
    setNavPage(page);
    if (page !== 'home') setStage('hero'); // reset download flow when going to other pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => animateIn(document.getElementById('main-screen')), 50);
  }, []);

  // Animate on first load
  useEffect(() => {
    setTimeout(() => animateIn(document.getElementById('main-screen')), 100);
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleAnalyzeBulk = useCallback(async (url: string) => {
    setInputUrl(url); setError('');
    try {
      const data = await fetchPlaylist(url);
      setMode('bulk');
      setBulkVideos(data.videos);
      setSelectedBulkIds(data.videos.map((v: VideoData) => v.id));
      goToStage('bulk');
    } catch (e: any) { setError(e.message); }
  }, [goToStage]);

  const handleAnalyzeSingle = useCallback(async (url: string) => {
    setInputUrl(url); setError('');
    try {
      const info = await fetchVideoInfo(url);
      if (info.isPlaylist) return handleAnalyzeBulk(url);   // playlist / channel link -> bulk screen
      setMode('single');
      setVideoData(info);
      setSelectedFormat(info.formats?.[0] || null);
      goToStage('analyze');
    } catch (e: any) { setError(e.message); }
  }, [goToStage, handleAnalyzeBulk]);

  const handleStartSingleDownload = useCallback(async () => {
    if (!videoData) return;
    setDownloadCount(1);
    goToStage('progress');
    setIsDownloading(true);
    setProgress(0);
    setError('');
    try {
      // video: height of the chosen format · audio: chosen MP3 bitrate
      const quality = mediaType === 'video' && selectedFormat ? String(selectedFormat.height) : selectedQuality;
      const filename = await downloadSingle(
        videoData.url || inputUrl,
        selectedFormat?.id || 'best',
        mediaType,
        quality,
        p => setProgress(p)
      );
      setIsDownloading(false);
      const dlPath = await getDownloadsPath().catch(() => '~/Downloads');
      saveHistory({
        id: crypto.randomUUID(), title: videoData.title, channel: videoData.channel,
        thumbnail: videoData.thumbnail, mediaType, quality,
        date: new Date().toISOString(), size: videoData.size, mode: 'single', count: 1,
        filename, filePath: dlPath + '/' + filename
      });
      setTimeout(() => goToStage('success'), 400);
    } catch (e: any) {
      setIsDownloading(false);
      setError(e.message);
      goToStage('options');
    }
  }, [videoData, inputUrl, selectedFormat, mediaType, selectedQuality, goToStage, saveHistory]);

  const handleStartBulkDownload = useCallback(async () => {
    const selected = bulkVideos.filter(v => selectedBulkIds.includes(v.id));
    if (!selected.length) return;
    setDownloadCount(selected.length);
    goToStage('progress');
    setIsDownloading(true);
    setProgress(0);
    setError('');
    setStatusText('');
    try {
      const urls = selected.map(v => v.url || `https://www.youtube.com/watch?v=${v.id}`);
      const filenames = await downloadBulk(urls, mediaType, selectedQuality, (p, idx, total, fname) => {
        setProgress(p);
        setBulkCurrentIndex(idx);
        setStatusText(fname ? `Downloaded: ${fname}` : `Downloading file ${idx + 1} of ${total}...`);
      });
      setIsDownloading(false);
      setDownloadCount(filenames.length);   // only count files that actually downloaded
      const dlPath = await getDownloadsPath().catch(() => '~/Downloads');
      const bulkTitles = selected.slice(0, 3).map(v => v.title).join(', ') + (selected.length > 3 ? ` +${selected.length - 3} more` : '');
      saveHistory({
        id: crypto.randomUUID(), title: bulkTitles, channel: selected[0]?.channel || 'Various',
        thumbnail: selected[0]?.thumbnail || '', mediaType, quality: selectedQuality,
        date: new Date().toISOString(), mode: 'bulk', count: filenames.length,
        filenames, filePath: dlPath, filename: filenames[0]
      });
      setTimeout(() => goToStage('success'), 400);
    } catch (e: any) {
      setIsDownloading(false);
      setError(e.message);
      goToStage('bulk');
    }
  }, [bulkVideos, selectedBulkIds, mediaType, selectedQuality, goToStage, saveHistory]);

  const handleReset = useCallback(() => {
    setStage('hero');
    setNavPage('home');
    setVideoData(null);
    setBulkVideos([]);
    setSelectedBulkIds([]);
    setProgress(0);
    setIsDownloading(false);
    setInputUrl('');
    setError('');
    setSelectedFormat(null);
    setStatusText('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => animateIn(document.getElementById('main-screen')), 50);
  }, []);

  // ── What to render ───────────────────────────────────────────────────────────
  const renderScreen = () => {
    // Nav pages (Sites, Features, History, Contact)
    if (navPage === 'sites') return <SitesSection />;
    if (navPage === 'features') return <FeaturesSection />;
    if (navPage === 'history') return <HistorySection history={history} onClear={() => { setHistory([]); localStorage.removeItem('bitbase_history'); }} />;
    if (navPage === 'contact') return <ContactSection />;

    // Download flow screens
    switch (stage) {
      case 'hero':
        return <HeroSection mode={mode} setMode={setMode} onAnalyzeSingle={handleAnalyzeSingle} onAnalyzeBulk={handleAnalyzeBulk} isActive={true} globalError={error} />;
      case 'analyze':
        return <AnalyzeSection videoData={videoData} mediaType={mediaType} setMediaType={setMediaType} onNext={() => goToStage('options')} onBack={handleReset} isActive={true} />;
      case 'bulk':
        return <BulkSection videos={bulkVideos} selectedIds={selectedBulkIds} setSelectedIds={setSelectedBulkIds} mediaType={mediaType} setMediaType={setMediaType} onDownload={handleStartBulkDownload} onBack={handleReset} isActive={true} inputUrl={inputUrl} quality={selectedQuality} setQuality={setSelectedQuality} error={error} />;
      case 'options':
        return <OptionsSection mediaType={mediaType} setMediaType={setMediaType} onDownload={handleStartSingleDownload} onBack={() => goToStage('analyze')} isActive={true} videoFormats={videoData?.formats || []} selectedFormat={selectedFormat} setSelectedFormat={setSelectedFormat} selectedQuality={selectedQuality} setSelectedQuality={setSelectedQuality} error={error} />;
      case 'progress':
        return <ProgressSection progress={progress} isDownloading={isDownloading} isActive={true} downloadCount={downloadCount} mode={mode} statusText={statusText} bulkCurrentIndex={bulkCurrentIndex} />;
      case 'success':
        return <SuccessSection onReset={handleReset} isActive={true} downloadCount={downloadCount} mode={mode} />;
      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: '#0F172A' }}>
      {/* Background */}
      <ParticleCanvas />
      <div className="blob" style={{ width: 500, height: 500, background: 'radial-gradient(circle,rgba(56,189,248,0.3),transparent 70%)', top: '10%', left: '-10%', animationDelay: '0s' }} />
      <div className="blob" style={{ width: 400, height: 400, background: 'radial-gradient(circle,rgba(14,165,233,0.25),transparent 70%)', top: '60%', right: '-5%', animationDelay: '-7s' }} />
      <div className="blob" style={{ width: 300, height: 300, background: 'radial-gradient(circle,rgba(56,189,248,0.2),transparent 70%)', bottom: '10%', left: '30%', animationDelay: '-14s' }} />
      <div className="fixed inset-0 stars-bg pointer-events-none" style={{ zIndex: 0 }} />

      {/* Content */}
      <div className="relative" style={{ zIndex: 10 }}>
        <Navbar
          stage={stage}
          navPage={navPage}
          onReset={handleReset}
          onNavPage={goToNav}
        />

        {/* Single screen — no scrolling between sections */}
        <main className="min-h-screen flex items-center justify-center px-4 pt-24 pb-12">
          <div id="main-screen" className="w-full">
            {renderScreen()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;