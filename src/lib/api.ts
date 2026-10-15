const BASE = '';

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const e = await res.json().catch(() => ({}));
  return (e as any).detail || (e as any).error || fallback;
}

// Job id made in the browser so we can follow progress while the server is still downloading
function newJobId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
}

export async function fetchVideoInfo(url: string) {
  const res = await fetch(`${BASE}/api/info`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url })
  });
  if (!res.ok) throw new Error(await errorMessage(res, 'Failed to fetch video info'));
  return res.json();
}

export async function fetchPlaylist(url: string) {
  const res = await fetch(`${BASE}/api/playlist`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url })
  });
  if (!res.ok) throw new Error(await errorMessage(res, 'Failed to fetch playlist'));
  return res.json();
}

// Listen to SSE progress for a job
function listenProgress(jobId: string, onProgress: (p: number, status: string) => void): () => void {
  const es = new EventSource(`/api/progress/${jobId}`);
  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      onProgress(data.percent || 0, data.status || '');
      if (data.done || data.error) es.close();
    } catch {}
  };
  es.onerror = () => es.close();
  return () => es.close();
}

// Stream a response body and trigger browser download
async function streamToDownload(
  res: Response,
  onProgress: (p: number) => void,
  basePercent: number,
  rangePercent: number,
  hasLiveProgress: boolean
): Promise<string> {
  const filename = decodeURIComponent(res.headers.get('X-Filename') || 'download');
  const contentLength = parseInt(res.headers.get('Content-Length') || '0');

  const reader = res.body!.getReader();
  const chunks: ArrayBuffer[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
    received += value.length;
    if (!hasLiveProgress && contentLength > 0) {
      const mapped = basePercent + (received / contentLength) * rangePercent;
      onProgress(Math.min(mapped, basePercent + rangePercent - 1));
    }
  }

  const blob = new Blob(chunks);
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob), download: filename
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);

  return filename;
}

// ── Single download ───────────────────────────────────────────────────────────
export async function downloadSingle(
  url: string, formatId: string, mediaType: string, quality: string,
  onProgress: (p: number) => void
): Promise<string> {
  onProgress(5);
  const jobId = newJobId();
  const stop = listenProgress(jobId, (p) => onProgress(Math.min(p, 99)));

  try {
    const res = await fetch(`${BASE}/api/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, formatId, mediaType, quality, jobId }),
    });
    if (!res.ok) throw new Error(await errorMessage(res, 'Download failed'));

    const filename = await streamToDownload(res, onProgress, 0, 100, true);
    onProgress(100);
    return filename;
  } finally {
    stop();
  }
}

// ── Bulk download — each file downloaded separately, no ZIP ──────────────────
export async function downloadBulk(
  urls: string[],
  mediaType: string,
  quality: string,
  onProgress: (p: number, currentIndex: number, total: number, filename?: string) => void
): Promise<string[]> {
  const total = urls.length;
  const filenames: string[] = [];

  for (let i = 0; i < urls.length; i++) {
    // Each file gets an equal slice of 5%–98%
    const perFile = 93 / total;
    const fileBase = 5 + i * perFile;

    onProgress(Math.round(fileBase), i, total);

    const jobId = newJobId();
    const stop = listenProgress(jobId, (p) => onProgress(Math.round(fileBase + (p / 100) * perFile), i, total));
    try {
      const res = await fetch(`${BASE}/api/bulk-download/${i}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urls[i], mediaType, quality, jobId }),
      });

      if (!res.ok) {
        console.error(`Failed to download file ${i + 1}: ${await errorMessage(res, urls[i])}`);
        continue;
      }

      const filename = await streamToDownload(
        res,
        (p) => onProgress(Math.round(fileBase + (p / 100) * perFile), i, total),
        0, 100, true
      );

      filenames.push(filename);
      onProgress(Math.round(fileBase + perFile), i + 1, total, filename);
    } catch (e) {
      console.error(`Error downloading file ${i + 1}:`, e);
    } finally {
      stop();
    }

    // Small pause between files to avoid overwhelming browser
    if (i < urls.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  if (!filenames.length) throw new Error('None of the selected videos could be downloaded. Please try again.');
  onProgress(100, total, total);
  return filenames;
}

export async function submitContact(name: string, email: string, message: string) {
  const res = await fetch(`${BASE}/api/contact`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, message }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, 'Failed to send message'));
  return res.json();
}

export async function getDownloadsPath(): Promise<string> {
  const res = await fetch(`${BASE}/api/downloads-path`);
  const data = await res.json();
  return data.path;
}
