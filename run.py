"""One command to run BitBase.

    python run.py          build the web UI (first time only) and start the app on :4000
    python run.py --dev    developer mode: Python backend with auto-reload + live UI on :3000
    python run.py --build  rebuild the web UI, then start
"""
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SERVER_DIR = ROOT / "server_py"
DIST_INDEX = ROOT / "dist" / "index.html"

for _stream in (sys.stdout, sys.stderr):   # emoji-safe console output on Windows
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass


def npm(*args: str) -> None:
    exe = shutil.which("npm")
    if not exe:
        sys.exit("❌ Node.js is needed once to build the web UI → https://nodejs.org (LTS)")
    subprocess.run([exe, *args], cwd=ROOT, check=True)


def build_ui(force: bool = False) -> None:
    if DIST_INDEX.exists() and not force:
        return
    if not (ROOT / "node_modules").exists():
        print("📦 Installing web UI packages (first run only)…")
        npm("install", "--no-audit", "--no-fund")
    print("🛠  Building web UI…")
    npm("run", "build")


def check_tools() -> None:
    try:
        import fastapi, uvicorn, yt_dlp  # noqa: F401
    except ImportError:
        sys.exit("❌ Python packages missing. Run:  pip install -r server_py/requirements.txt")
    sys.path.insert(0, str(SERVER_DIR))
    from main import has_ffmpeg
    if not has_ffmpeg():
        print("⚠️  ffmpeg not found — run:  pip install -r server_py/requirements.txt")


def main() -> None:
    args = set(sys.argv[1:])
    check_tools()
    port = os.environ.get("PORT", "4000")

    if "--dev" in args:
        if not (ROOT / "node_modules").exists():
            npm("install", "--no-audit", "--no-fund")
        backend = subprocess.Popen([sys.executable, "main.py"], cwd=SERVER_DIR)
        print("✅ Open http://localhost:3000  (Ctrl+C to stop)")
        try:
            npm("run", "dev")
        except (KeyboardInterrupt, subprocess.CalledProcessError):
            pass
        finally:
            backend.terminate()
        return

    build_ui(force="--build" in args)
    print(f"✅ BitBase is running → http://localhost:{port}  (Ctrl+C to stop)")
    os.chdir(SERVER_DIR)
    sys.path.insert(0, str(SERVER_DIR))
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(port), timeout_keep_alive=300)


if __name__ == "__main__":
    main()
