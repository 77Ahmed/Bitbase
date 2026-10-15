import { History, Trash2, Video, Music, Download, Clock, FolderOpen, Layers, FileVideo, FileAudio, Copy, CheckCircle, Package } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { HistoryItem } from '../App';
import { getDownloadsPath } from '../lib/api';

interface Props { history: HistoryItem[]; onClear: () => void; }

export default function HistorySection({ history, onClear }: Props) {
  const [downloadsPath, setDownloadsPath] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Show the server's Downloads path only when BitBase runs on this same computer
  useEffect(() => {
    const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname) && !window.matchMedia('(pointer: coarse)').matches;
    if (isLocal) getDownloadsPath().then(p => setDownloadsPath(p)).catch(() => {});
  }, []);

  const sep = downloadsPath.includes('\\') ? '\\' : '/';

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openFolder = () => {
    if (!downloadsPath) return;
    navigator.clipboard.writeText(downloadsPath).catch(() => {});
    alert(`📂 Downloads folder path copied!\n\n${downloadsPath}\n\nPaste in your file explorer address bar to open.`);
  };

  const fullPath = (filename: string) => downloadsPath ? downloadsPath + sep + filename : filename;

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    if (d < 7) return `${d}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="text-center mb-8 animate-on-scroll">
        <h2 className="text-4xl font-extrabold text-white mb-3">Download <span className="text-gradient-sky">History</span></h2>
        <p className="text-slate-400 text-sm">Everything you've downloaded on this device.</p>
      </div>

      <div className="glass-card p-6 animate-on-scroll">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History size={15} className="text-[#38BDF8]" />
            <span className="text-white font-semibold text-sm">{history.length} download{history.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex gap-2">
            {downloadsPath && (
              <button onClick={openFolder}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer text-[#38BDF8] hover:text-white transition-all"
                style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)' }}>
                <FolderOpen size={12} />Open Downloads
              </button>
            )}
            {history.length > 0 && (
              <button onClick={onClear}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer text-red-400 hover:text-white transition-all"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <Trash2 size={12} />Clear All
              </button>
            )}
          </div>
        </div>

        {/* Downloads folder path */}
        {downloadsPath && (
          <div onClick={openFolder}
            className="mb-4 px-3 py-2 rounded-lg flex items-center gap-2 cursor-pointer group"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <FolderOpen size={13} className="text-[#38BDF8] flex-shrink-0" />
            <span className="text-slate-400 text-xs font-mono flex-1 truncate">{downloadsPath}</span>
            <Copy size={11} className="text-slate-700 group-hover:text-[#38BDF8] transition-colors flex-shrink-0" />
          </div>
        )}

        {/* Empty */}
        {history.length === 0 ? (
          <div className="text-center py-14">
            <Download size={36} className="mx-auto mb-3 text-slate-700" />
            <p className="text-slate-500 font-medium text-sm">No downloads yet</p>
            <p className="text-slate-600 text-xs mt-1">Your download history appears here after your first download.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(56,189,248,0.3) transparent' }}>
            {history.map(item => {
              const isBulk = item.mode === 'bulk';
              const hasMultiple = isBulk && item.filenames && item.filenames.length > 1;
              const isExpanded = expanded === item.id;
              const extColor = item.mediaType === 'audio' ? '#A78BFA' : '#34D399';
              const ext = item.mediaType === 'audio' ? 'MP3' : 'MP4';

              return (
                <div key={item.id} className="rounded-xl overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>

                  {/* Main row */}
                  <div className="flex items-start gap-3 p-3">
                    {/* Thumbnail */}
                    <div className="w-14 h-10 rounded-lg overflow-hidden flex-shrink-0 mt-0.5">
                      {item.thumbnail ? (
                        <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"
                          style={{ background: `${extColor}15` }}>
                          {item.mediaType === 'audio'
                            ? <FileAudio size={15} style={{ color: extColor }} />
                            : <FileVideo size={15} style={{ color: extColor }} />}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium leading-snug line-clamp-1">{item.title}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{item.channel}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs flex items-center gap-1" style={{ color: extColor }}>
                          {item.mediaType === 'audio' ? <Music size={9} /> : <Video size={9} />}
                          {ext} · {item.quality}{item.mediaType === 'video' ? 'p' : 'kbps'}
                        </span>
                        {isBulk && item.count && (
                          <span className="text-slate-500 text-xs flex items-center gap-1">
                            <Layers size={9} />{item.count} files
                          </span>
                        )}
                        <span className="text-slate-600 text-xs flex items-center gap-1">
                          <Clock size={9} />{timeAgo(item.date)}
                        </span>
                      </div>
                    </div>

                    {/* Badge */}
                    <span className="text-xs font-bold px-2 py-0.5 rounded flex-shrink-0 mt-0.5"
                      style={{ background: `${extColor}15`, color: extColor }}>
                      {isBulk ? `${item.count || 1}×${ext}` : ext}
                    </span>
                  </div>

                  {/* Single file path */}
                  {!hasMultiple && item.filename && (
                    <div className="px-3 pb-3">
                      <button onClick={() => copyText(fullPath(item.filename!), item.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left group/p cursor-pointer transition-all"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {item.mediaType === 'audio'
                          ? <Music size={11} className="text-purple-400 flex-shrink-0" />
                          : <Video size={11} className="text-blue-400 flex-shrink-0" />}
                        <span className="flex-1 min-w-0 text-xs font-mono truncate">
                          <span className="text-slate-600">{downloadsPath}{sep}</span>
                          <span className="text-slate-200 font-medium">{item.filename}</span>
                        </span>
                        {copiedId === item.id
                          ? <CheckCircle size={11} className="text-emerald-400 flex-shrink-0" />
                          : <Copy size={11} className="text-slate-700 group-hover/p:text-[#38BDF8] transition-colors flex-shrink-0" />}
                      </button>
                    </div>
                  )}

                  {/* Bulk — multiple filenames */}
                  {hasMultiple && item.filenames && (
                    <div className="px-3 pb-3">
                      <button onClick={() => setExpanded(isExpanded ? null : item.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left cursor-pointer transition-all mb-1.5"
                        style={{ background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.15)' }}>
                        <Package size={11} className="text-[#38BDF8] flex-shrink-0" />
                        <span className="text-[#38BDF8] text-xs font-medium flex-1">
                          {item.filenames.length} files in Downloads folder
                        </span>
                        <span className="text-slate-500 text-xs">{isExpanded ? '▲ hide' : '▼ show all'}</span>
                      </button>

                      {isExpanded && (
                        <div className="space-y-1 max-h-48 overflow-y-auto"
                          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(56,189,248,0.2) transparent' }}>
                          {item.filenames.map((fname, fi) => (
                            <button key={fi} onClick={() => copyText(fullPath(fname), `${item.id}-${fi}`)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left group/f cursor-pointer transition-all"
                              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                              <span className="text-slate-600 text-xs w-5 flex-shrink-0 text-right">{fi + 1}.</span>
                              {item.mediaType === 'audio'
                                ? <Music size={10} className="text-purple-400 flex-shrink-0" />
                                : <Video size={10} className="text-blue-400 flex-shrink-0" />}
                              <span className="flex-1 min-w-0 text-xs font-mono truncate text-slate-300">{fname}</span>
                              {copiedId === `${item.id}-${fi}`
                                ? <CheckCircle size={10} className="text-emerald-400 flex-shrink-0" />
                                : <Copy size={10} className="text-slate-700 group-hover/f:text-[#38BDF8] transition-colors flex-shrink-0" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
