"""BitBase Downloader — Python backend (FastAPI + yt-dlp).

Serves the JSON API used by the web UI and the built UI itself (../dist).
Run:  python main.py   (dev, auto-reload)   or   python start.py   (production)
"""
import os
import re
import json
import time
import uuid
import sys
import shutil
import secrets
import asyncio
import tempfile
import urllib.parse
from pathlib import Path
from datetime import datetime
from typing import Optional, AsyncGenerator

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import yt_dlp

for _stream in (sys.stdout, sys.stderr):   # emoji-safe console output on Windows
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

# ── Setup ─────────────────────────────────────────────────────────────────────
app = FastAPI(title="BitBase Downloader API")

BASE_DIR      = Path(__file__).parent
DIST_DIR      = BASE_DIR.parent / "dist"
DOWNLOADS_DIR = BASE_DIR / "downloads"
MESSAGES_FILE = BASE_DIR / "messages.json"
COOKIES_FILE  = BASE_DIR / "cookies.txt"

MAX_PLAYLIST_ITEMS = 500
FILE_MAX_AGE = 30 * 60          # temp files older than this are deleted (seconds)

DOWNLOADS_DIR.mkdir(exist_ok=True)
if not MESSAGES_FILE.exists():
    MESSAGES_FILE.write_text("[]")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Filename", "X-Job-Id", "X-Index", "Content-Disposition", "Content-Length"],
)

# ── Cookies (fixes YouTube bot detection on servers) ──────────────────────────
_tmp_cookie_path = None

def get_cookies_file():
    """server_py/cookies.txt if present, else the YOUTUBE_COOKIES env variable."""
    global _tmp_cookie_path
    if COOKIES_FILE.exists() and COOKIES_FILE.stat().st_size > 100:
        return str(COOKIES_FILE)
    env = os.environ.get("YOUTUBE_COOKIES", "").strip()
    if env:
        if _tmp_cookie_path and os.path.exists(_tmp_cookie_path):
            return _tmp_cookie_path
        tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False)
        tmp.write(env.replace('\\n', '\n'))
        tmp.close()
        _tmp_cookie_path = tmp.name
        return _tmp_cookie_path
    return None

def get_ffmpeg() -> Optional[str]:
    """System ffmpeg if installed, otherwise the copy bundled with the imageio-ffmpeg package."""
    found = shutil.which("ffmpeg")
    if found:
        return found
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return None

def has_ffmpeg() -> bool:
    return get_ffmpeg() is not None

def ydl_opts(**extra) -> dict:
    opts = {
        "quiet": True, "no_warnings": True, "noprogress": True,
        "js_runtimes": {"deno": {}, "node": {}},   # YouTube needs a JS runtime for most formats
        **extra,
    }
    ffmpeg = get_ffmpeg()
    if ffmpeg and not shutil.which("ffmpeg"):
        opts["ffmpeg_location"] = ffmpeg
    cf = get_cookies_file()
    if cf:
        opts["cookiefile"] = cf
    return opts

# ── Models ────────────────────────────────────────────────────────────────────
class InfoRequest(BaseModel):
    url: str

class PlaylistRequest(BaseModel):
    url: str

class DownloadRequest(BaseModel):
    url: str
    formatId: Optional[str] = "best"
    mediaType: Optional[str] = "video"
    quality: Optional[str] = "1080"     # video: max height · audio: MP3 kbps
    jobId: Optional[str] = None         # lets the UI follow progress before the file arrives

class ContactRequest(BaseModel):
    name: str
    email: str
    message: str

# ── Progress store ────────────────────────────────────────────────────────────
progress_store: dict = {}

def set_progress(job_id: str, percent: float, status: str, done: bool = False, error: Optional[str] = None):
    progress_store[job_id] = {"percent": percent, "status": status, "done": done,
                              "error": error, "time": time.time()}

class ProgressHook:
    """yt-dlp hook: maps the server-side download to 5–90% of the progress bar.

    YouTube HD = a video stream then an audio stream, so the first file fills 5–70%
    and the rest fills 70–90%. The bar never moves backwards.
    """
    def __init__(self, job_id: str):
        self.job_id = job_id
        self.files_done = 0
        self.last = 5.0

    def __call__(self, d):
        if d["status"] == "downloading":
            downloaded = d.get("downloaded_bytes") or 0
            total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
            file_pct = min(downloaded / total * 100, 100) if total > 0 else 0
            start, span = (5, 65) if self.files_done == 0 else (70, 20)
            self.last = max(self.last, round(start + file_pct / 100 * span, 1))
            # one percentage (the ring) is enough — the text says what is downloading and how fast
            info = d.get("info_dict") or {}
            part = "video" if info.get("vcodec") not in (None, "none") else "audio"
            speed = (d.get("_speed_str") or "").strip().replace("KiB", "KB").replace("MiB", "MB")
            set_progress(self.job_id, self.last,
                         f"Downloading {part}..." + (f" · {speed}" if speed and "Unknown" not in speed else ""))
        elif d["status"] == "finished":
            self.files_done += 1
            self.last = max(self.last, 70 if self.files_done == 1 else 90)
            set_progress(self.job_id, self.last, "Merging video and audio..." if self.files_done > 1 else "Processing...")

# ── Helpers ───────────────────────────────────────────────────────────────────
def format_duration(seconds):
    if not seconds: return "Unknown"
    seconds = int(seconds)
    h, m, s = seconds // 3600, (seconds % 3600) // 60, seconds % 60
    return f"{h}:{m:02d}:{s:02d}" if h > 0 else f"{m}:{s:02d}"

def format_views(n):
    if not n: return "Unknown"
    if n >= 1_000_000: return f"{n/1_000_000:.1f}M views"
    if n >= 1_000:     return f"{n/1_000:.0f}K views"
    return f"{n} views"

def safe_filename(name: str) -> str:
    """Strip characters that are illegal in file names but keep unicode (Urdu, Hindi, ...)."""
    name = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '_', name)
    name = re.sub(r'\s+', ' ', name).strip(' ._')
    return name or 'download'

def ascii_filename(name: str) -> str:
    """Fallback name for old browsers that can't read the UTF-8 header."""
    stem, ext = os.path.splitext(name)
    stem = stem.encode('ascii', 'ignore').decode('ascii')
    stem = re.sub(r'[^\w\s\-_.()\[\]]', '_', stem)
    stem = re.sub(r'_+', '_', stem).strip('_ .')
    return f"{stem or 'download'}{ext}"

def clean_error(e: Exception) -> str:
    msg = re.sub(r'\x1b\[[0-9;]*m', '', str(e)).replace('ERROR: ', '').strip()
    if "Sign in to confirm" in msg:
        return "YouTube is blocking this server (bot check). Add cookies — see the README."
    if "Unsupported URL" in msg:
        return "This link isn't supported. Paste a direct video, playlist or channel link."
    if "Requested format is not available" in msg:
        return "This quality isn't available for this video. Try a lower quality."
    if "is not a valid URL" in msg:
        return "That doesn't look like a valid link."
    return msg or "Something went wrong."

def get_downloads_folder():
    return str(Path.home() / "Downloads")

def cleanup_old_downloads():
    now = time.time()
    for item in DOWNLOADS_DIR.iterdir():
        try:
            if now - item.stat().st_mtime > FILE_MAX_AGE:
                shutil.rmtree(item) if item.is_dir() else item.unlink()
        except OSError:
            pass
    for job_id, data in list(progress_store.items()):
        if now - data.get("time", now) > FILE_MAX_AGE:
            progress_store.pop(job_id, None)

def parse_quality(media_type: str, quality: Optional[str]) -> int:
    """Turn the UI's quality value into a safe number (height or kbps)."""
    try:
        q = int(float(quality or 0))
    except ValueError:
        q = 0
    if media_type == "audio":
        return q if 64 <= q <= 320 else 320
    return q if 144 <= q <= 4320 else 1080

def build_ydl_opts(media_type: str, quality: Optional[str], out_dir: Path, hook) -> dict:
    ffmpeg = has_ffmpeg()
    q = parse_quality(media_type, quality)
    base = ydl_opts(
        noplaylist=True,
        progress_hooks=[hook],
        outtmpl=str(out_dir / "%(title).150B.%(ext)s"),
        windowsfilenames=True,
    )
    if media_type == "audio":
        if not ffmpeg:   # can't convert to MP3 without ffmpeg -> send the original audio (m4a/webm)
            return {**base, "format": "bestaudio[ext=m4a]/bestaudio/best"}
        return {**base,
            "format": "bestaudio/best",
            "postprocessors": [{"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": str(q)}],
        }
    if not ffmpeg:       # can't merge separate video+audio streams -> pick one file that has both
        return {**base, "format": f"best[height<={q}][ext=mp4]/best[height<={q}]/best"}
    # Up to 1080p prefer H.264 (avc1): it plays everywhere, including the iPhone Photos app.
    # Above 1080p YouTube only offers VP9/AV1, so take the best available.
    h264 = f"bestvideo[height<={q}][vcodec^=avc1]+bestaudio[ext=m4a]/" if q <= 1080 else ""
    return {**base,
        "format": f"{h264}bestvideo[height<={q}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<={q}]+bestaudio/best[height<={q}]/best",
        "merge_output_format": "mp4",
    }

def _dl(opts, url):
    with yt_dlp.YoutubeDL(opts) as ydl:
        ydl.download([url])

MIME_TYPES = {".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".webm": "video/webm",
              ".mp4": "video/mp4", ".mkv": "video/x-matroska", ".opus": "audio/ogg"}

async def stream_file(file_path: Path, job_id: str, filename: str, extra_headers: Optional[dict] = None):
    file_size = file_path.stat().st_size
    mime = MIME_TYPES.get(file_path.suffix.lower(), "application/octet-stream")

    async def file_gen():
        chunk_size = 1024 * 512
        sent = 0
        try:
            with open(file_path, "rb") as f:
                while True:
                    chunk = f.read(chunk_size)
                    if not chunk: break
                    sent += len(chunk)
                    set_progress(job_id, min(90 + round(sent / file_size * 9), 99), "Sending to browser...")
                    yield chunk
            set_progress(job_id, 100, "Done!", done=True)
        finally:
            shutil.rmtree(file_path.parent, ignore_errors=True)

    quoted = urllib.parse.quote(filename)
    headers = {
        # filename= for old browsers, filename*= carries the real unicode name
        "Content-Disposition": f'attachment; filename="{ascii_filename(filename)}"; filename*=UTF-8\'\'{quoted}',
        "Content-Length": str(file_size),
        "X-Filename": quoted,          # UI decodes this with decodeURIComponent
        "X-Job-Id": job_id,
        **(extra_headers or {}),
    }
    return StreamingResponse(file_gen(), media_type=mime, headers=headers)

def new_job(job_id: Optional[str]) -> tuple[str, Path]:
    cleanup_old_downloads()
    if not job_id or not re.fullmatch(r"[A-Za-z0-9-]{8,64}", job_id):
        job_id = str(uuid.uuid4())
    out_dir = DOWNLOADS_DIR / job_id
    out_dir.mkdir(parents=True, exist_ok=True)
    set_progress(job_id, 5, "Starting...")
    return job_id, out_dir

async def run_download(req: DownloadRequest, extra_headers: Optional[dict] = None):
    job_id, out_dir = new_job(req.jobId)
    try:
        opts = build_ydl_opts(req.mediaType or "video", req.quality, out_dir, ProgressHook(job_id))
        await asyncio.get_running_loop().run_in_executor(None, lambda: _dl(opts, req.url))
        files = [f for f in out_dir.iterdir() if f.is_file() and not f.name.endswith((".part", ".ytdl"))]
        if not files: raise Exception("No file was downloaded")
        file_path = max(files, key=lambda f: f.stat().st_size)
        return await stream_file(file_path, job_id, safe_filename(file_path.name), extra_headers)
    except Exception as e:
        shutil.rmtree(out_dir, ignore_errors=True)
        set_progress(job_id, 0, "Failed", done=True, error=clean_error(e))
        raise HTTPException(500, f"Download failed: {clean_error(e)}")

# ── SSE progress ──────────────────────────────────────────────────────────────
@app.get("/api/progress/{job_id}")
async def stream_progress(job_id: str):
    async def gen() -> AsyncGenerator[str, None]:
        for _ in range(1500):                     # ~20 minutes max
            await asyncio.sleep(0.8)
            data = progress_store.get(job_id, {"percent": 5, "status": "Starting...", "done": False, "error": None})
            yield f"data: {json.dumps({k: v for k, v in data.items() if k != 'time'})}\n\n"
            if data.get("done") or data.get("error"): break
    return StreamingResponse(gen(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "ytdlp": yt_dlp.version.__version__,
        "ffmpeg": has_ffmpeg(),
        "cookies": get_cookies_file() is not None,
        "cookies_source": "file" if COOKIES_FILE.exists() else "env" if os.environ.get("YOUTUBE_COOKIES") else "none",
        "backend": "Python + FastAPI",
    }

@app.get("/api/downloads-path")
def downloads_path():
    return {"path": get_downloads_folder()}

# ── Single video info ─────────────────────────────────────────────────────────
@app.post("/api/info")
async def get_info(req: InfoRequest):
    try:
        def fetch():
            opts = ydl_opts(noplaylist=True, extract_flat="in_playlist", playlistend=1)
            with yt_dlp.YoutubeDL(opts) as ydl:
                return ydl.extract_info(req.url.strip(), download=False)
        info = await asyncio.get_running_loop().run_in_executor(None, fetch)
    except Exception as e:
        raise HTTPException(500, f"Could not fetch video info: {clean_error(e)}")

    # Playlist / channel link pasted in Single mode -> tell the UI to switch to Bulk
    if info.get("_type") == "playlist" or info.get("entries") is not None:
        return {"isPlaylist": True}

    formats, seen = [], set()
    for f in reversed(info.get("formats") or []):
        h = f.get("height")
        if h and f.get("vcodec", "none") != "none" and h not in seen:
            seen.add(h)
            fsize = f.get("filesize") or f.get("filesize_approx")
            formats.append({
                "id": f["format_id"],
                "label": f"{h}p{' 4K' if h >= 2160 else ' Full HD' if h >= 1080 else ' HD' if h >= 720 else ''}",
                "height": h, "ext": "mp4",
                "size": (f"~{round(fsize/1024/1024)} MB" if fsize >= 1024*1024 else "< 1 MB") if fsize else "Unknown",
                "badge": "4K" if h >= 2160 else f"{h}p",
            })
    formats.sort(key=lambda x: x["height"], reverse=True)

    return {
        "id": info.get("id"), "title": info.get("title"),
        "channel": info.get("uploader") or info.get("channel") or "Unknown",
        "views": format_views(info.get("view_count")),
        "duration": format_duration(info.get("duration")),
        "thumbnail": info.get("thumbnail"),
        "url": info.get("webpage_url") or req.url,
        "formats": formats[:8],
    }

# ── Playlist ──────────────────────────────────────────────────────────────────
@app.post("/api/playlist")
async def get_playlist(req: PlaylistRequest):
    try:
        def fetch():
            opts = ydl_opts(extract_flat="in_playlist", playlistend=MAX_PLAYLIST_ITEMS)
            with yt_dlp.YoutubeDL(opts) as ydl:
                return ydl.extract_info(req.url.strip(), download=False)
        info = await asyncio.get_running_loop().run_in_executor(None, fetch)
    except Exception as e:
        raise HTTPException(500, f"Could not fetch playlist: {clean_error(e)}")

    entries = info.get("entries")
    if entries is None:          # a single video pasted in Bulk mode -> a list of one
        entries = [info]

    videos = []
    for v in entries:
        if not v: continue
        vid_id = v.get("id", "")
        thumb = v.get("thumbnail") or ((v.get("thumbnails") or [{}])[-1].get("url", ""))
        videos.append({
            "id": vid_id or str(uuid.uuid4()), "title": v.get("title") or "Untitled",
            "channel": v.get("uploader") or info.get("uploader") or "Unknown",
            "duration": format_duration(v.get("duration")),
            "views": format_views(v.get("view_count")),
            "thumbnail": thumb,
            "url": v.get("webpage_url") or v.get("url") or f"https://www.youtube.com/watch?v={vid_id}",
            "size": f"~{round(v['filesize_approx']/1024/1024)} MB" if v.get("filesize_approx") else None,
        })
    if not videos:
        raise HTTPException(404, "No videos were found at this link.")
    return {"total": len(videos), "videos": videos}

# ── Downloads ─────────────────────────────────────────────────────────────────
@app.post("/api/download")
async def download_single(req: DownloadRequest):
    return await run_download(req)

# Bulk: the UI calls this once per video, so every file arrives separately (no ZIP)
@app.post("/api/bulk-download/{index}")
async def bulk_download_one(index: int, req: DownloadRequest):
    return await run_download(req, {"X-Index": str(index)})

# iPhone Shortcut: one GET request that returns the file, e.g.
#   /api/shortcut?url=https://youtu.be/...&type=video&quality=1080&key=...
# Set the SHORTCUT_KEY env variable on your server so only your Shortcut can use it.
@app.get("/api/shortcut")
async def shortcut_download(url: str, type: str = "video", quality: str = "", key: str = ""):
    expected = os.environ.get("SHORTCUT_KEY", "")
    if expected and not secrets.compare_digest(key, expected):
        raise HTTPException(403, "Wrong or missing key.")
    media_type = "audio" if type.lower() in ("audio", "mp3") else "video"
    return await run_download(DownloadRequest(url=url.strip(), mediaType=media_type,
                                              quality=quality or ("320" if media_type == "audio" else "1080")))

# ── Contact ───────────────────────────────────────────────────────────────────
@app.post("/api/contact")
def contact(req: ContactRequest):
    if not all([req.name.strip(), req.email.strip(), req.message.strip()]):
        raise HTTPException(400, "All fields required")
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", req.email.strip()):
        raise HTTPException(400, "Please enter a valid email address.")
    try:
        msgs = json.loads(MESSAGES_FILE.read_text("utf-8") or "[]")
        msgs.append({"id": str(uuid.uuid4()), "name": req.name.strip(), "email": req.email.strip(),
                     "message": req.message.strip()[:5000], "date": datetime.now().isoformat()})
        MESSAGES_FILE.write_text(json.dumps(msgs, indent=2, ensure_ascii=False), "utf-8")
        return {"success": True, "message": "Message received! We will get back to you soon."}
    except (OSError, ValueError):
        raise HTTPException(500, "Failed to save message")

# ── Serve React frontend ──────────────────────────────────────────────────────
if (DIST_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="assets")

NOT_BUILT = {"error": "The web UI isn't built yet. Run:  python run.py  (or: npm install && npm run build)"}

@app.get("/")
async def serve_root():
    index = DIST_DIR / "index.html"
    if index.exists(): return FileResponse(str(index), media_type="text/html")
    return JSONResponse(NOT_BUILT, status_code=404)

@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    if full_path.startswith("api/"): raise HTTPException(404)
    static_file = (DIST_DIR / full_path).resolve()
    if static_file.is_file() and DIST_DIR.resolve() in static_file.parents:   # no ../ escapes
        return FileResponse(str(static_file))
    index = DIST_DIR / "index.html"
    if index.exists(): return FileResponse(str(index), media_type="text/html")
    return JSONResponse(NOT_BUILT, status_code=404)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 4000))
    print(f"✅ BitBase Python backend → http://localhost:{port}")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
