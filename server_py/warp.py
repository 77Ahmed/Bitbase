"""Optional Cloudflare WARP proxy for YouTube (free, no cookies).

YouTube blocks most cloud servers (Render, AWS, ...) with "Sign in to confirm you're
not a bot". With YOUTUBE_WARP=1, BitBase creates a free Cloudflare WARP account
(wgcf) and runs it as a local SOCKS5 proxy (wireproxy, no admin rights needed),
then sends only YouTube traffic through it. Other sites still connect directly.
"""
import os
import shutil
import socket
import subprocess
import tempfile
import threading
import time
from pathlib import Path
from typing import Optional

SOCKS_PORT = int(os.environ.get("WARP_SOCKS_PORT", "40000"))
WARP_DIR = Path(os.environ.get("WARP_DIR") or Path(tempfile.gettempdir()) / "bitbase-warp")

_ready = threading.Event()
_lock = threading.Lock()
_started = False
_error: Optional[str] = None
_proc: Optional[subprocess.Popen] = None


def enabled() -> bool:
    return os.environ.get("YOUTUBE_WARP", "0").strip().lower() in ("1", "true", "yes", "on")


def _port_open() -> bool:
    try:
        with socket.create_connection(("127.0.0.1", SOCKS_PORT), timeout=1):
            return True
    except OSError:
        return False


def _run(args: list) -> None:
    result = subprocess.run(args, cwd=WARP_DIR, capture_output=True, text=True, timeout=60)
    if result.returncode != 0:
        raise RuntimeError(f"{Path(args[0]).name} {args[1]} failed: {(result.stderr or result.stdout).strip()[-300:]}")


def start() -> None:
    """Register (once), generate the WireGuard profile and start the proxy. Blocking."""
    global _started, _error, _proc
    with _lock:
        if _started or not enabled():
            return
        _started = True

    wgcf, wireproxy = shutil.which("wgcf"), shutil.which("wireproxy")
    if not (wgcf and wireproxy):
        _error = "wgcf/wireproxy are not installed (they come with the Docker image)"
        print(f"⚠️  WARP: {_error}")
        return
    try:
        WARP_DIR.mkdir(parents=True, exist_ok=True)
        if not (WARP_DIR / "wgcf-account.toml").exists():
            _run([wgcf, "register", "--accept-tos"])
        _run([wgcf, "generate"])
        config = WARP_DIR / "wireproxy.conf"
        config.write_text(
            f"WGConfig = {WARP_DIR / 'wgcf-profile.conf'}\n\n"
            f"[Socks5]\nBindAddress = 127.0.0.1:{SOCKS_PORT}\n"
        )
        _proc = subprocess.Popen([wireproxy, "-c", str(config)],
                                 stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(60):
            if _port_open():
                _ready.set()
                print(f"✅ WARP proxy ready on 127.0.0.1:{SOCKS_PORT} (used for YouTube)")
                return
            if _proc.poll() is not None:
                break
            time.sleep(0.5)
        _error = "wireproxy did not start"
    except Exception as e:  # never crash the app because of WARP
        _error = str(e)
    print(f"⚠️  WARP: {_error} — YouTube will connect directly")


def start_in_background() -> None:
    if enabled():
        threading.Thread(target=start, daemon=True).start()


def proxy_url(wait: float = 20) -> Optional[str]:
    """SOCKS5 URL for yt-dlp, or None if WARP is off or failed. Waits briefly while it starts."""
    if not enabled() or _error:
        return None
    _ready.wait(wait)
    return f"socks5://127.0.0.1:{SOCKS_PORT}" if _ready.is_set() else None


def status() -> str:
    if not enabled():
        return "off"
    if _ready.is_set():
        return "on"
    return f"error: {_error}" if _error else "starting"


def stop() -> None:
    if _proc and _proc.poll() is None:
        _proc.terminate()
