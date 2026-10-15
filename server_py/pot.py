"""PO-token server for YouTube (bgutil-ytdlp-pot-provider).

YouTube asks cloud servers for "Proof of Origin" tokens. Without them it may only
offer 360p or show "Sign in to confirm you're not a bot". The Docker image ships
the bgutil token server in /opt/bgutil; BitBase starts it on 127.0.0.1:4416, where
the bgutil yt-dlp plugin finds it automatically. Nothing happens if it isn't installed.
"""
import os
import shutil
import subprocess
import threading
import time
import urllib.request
from pathlib import Path
from typing import Optional

PORT = int(os.environ.get("BGUTIL_PORT", "4416"))
SERVER_DIR = Path(os.environ.get("BGUTIL_SERVER_DIR", "/opt/bgutil"))

_proc: Optional[subprocess.Popen] = None
_status = "not installed"


def _command() -> Optional[list]:
    node_modules = SERVER_DIR / "node_modules"
    deno, node = shutil.which("deno"), shutil.which("node")
    if deno and (SERVER_DIR / "src" / "main.ts").exists():
        return [deno, "run", "--allow-env", "--allow-net",
                f"--allow-ffi={node_modules}", f"--allow-read={node_modules}",
                str(SERVER_DIR / "src" / "main.ts"), "--port", str(PORT)]
    if node and (SERVER_DIR / "build" / "main.js").exists():
        return [node, str(SERVER_DIR / "build" / "main.js"), "--port", str(PORT)]
    return None


def _ping() -> bool:
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/ping", timeout=2) as r:
            return r.status == 200
    except Exception:
        return False


def start() -> None:
    global _proc, _status
    if _ping():
        _status = "running"
        return
    cmd = _command()
    if not cmd:
        return
    _status = "starting"
    try:
        _proc = subprocess.Popen(cmd, cwd=SERVER_DIR, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except OSError as e:
        _status = f"error: {e}"
        return
    for _ in range(120):
        if _ping():
            _status = "running"
            print(f"✅ PO-token server running on 127.0.0.1:{PORT}")
            return
        if _proc.poll() is not None:
            break
        time.sleep(0.5)
    _status = "error: did not start"
    print(f"⚠️  PO-token server {_status}")


def start_in_background() -> None:
    threading.Thread(target=start, daemon=True).start()


def status() -> str:
    return _status


def stop() -> None:
    if _proc and _proc.poll() is None:
        _proc.terminate()
