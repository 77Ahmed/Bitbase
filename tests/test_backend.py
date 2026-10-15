"""Fast tests for the Python backend (no internet needed).  Run:  pytest"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "server_py"))

from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402

client = TestClient(main.app)


def test_health():
    data = client.get("/api/health").json()
    assert data["status"] == "ok"
    assert data["backend"] == "Python + FastAPI"


def test_format_helpers():
    assert main.format_duration(19) == "0:19"
    assert main.format_duration(3725) == "1:02:05"
    assert main.format_duration(None) == "Unknown"
    assert main.format_views(444_200_000) == "444.2M views"
    assert main.format_views(1_500) == "2K views"


def test_filenames_keep_unicode_and_stay_safe():
    assert main.safe_filename("گانا اردو.mp4") == "گانا اردو.mp4"
    assert main.safe_filename('a/b:c?.mp3') == "a_b_c_.mp3"
    assert main.ascii_filename("گانا اردو.mp4") == "download.mp4"
    assert main.ascii_filename("Me at the zoo.mp4") == "Me at the zoo.mp4"


def test_quality_is_always_valid():
    assert main.parse_quality("audio", "0") == 320        # old UI value -> best MP3
    assert main.parse_quality("audio", "1080") == 320     # video value sent for audio
    assert main.parse_quality("audio", "128") == 128
    assert main.parse_quality("video", "720") == 720
    assert main.parse_quality("video", "abc") == 1080


def test_video_format_selector_respects_quality(tmp_path):
    opts = main.build_ydl_opts("video", "720", tmp_path, hook=lambda d: None)
    assert "height<=720" in opts["format"]


def test_contact_validation():
    r = client.post("/api/contact", json={"name": "A", "email": "not-an-email", "message": "hi"})
    assert r.status_code == 400
    r = client.post("/api/contact", json={"name": " ", "email": "a@b.co", "message": "hi"})
    assert r.status_code == 400


def test_unknown_api_route_is_404():
    assert client.get("/api/does-not-exist").status_code == 404


def test_direct_download_requires_key_when_set(monkeypatch):
    monkeypatch.setenv("API_KEY", "secret")
    r = client.get("/api/direct", params={"url": "https://youtu.be/x", "key": "wrong"})
    assert r.status_code == 403


def test_up_to_1080p_prefers_h264(tmp_path):
    opts = main.build_ydl_opts("video", "1080", tmp_path, hook=lambda d: None)
    assert opts["format"].startswith("bestvideo[height<=1080][vcodec^=avc1]")
    opts_4k = main.build_ydl_opts("video", "2160", tmp_path, hook=lambda d: None)
    assert "avc1" not in opts_4k["format"]


def test_quality_accepts_labels():
    assert main.parse_quality("video", "720p") == 720
    assert main.parse_quality("video", "480p ") == 480
    assert main.parse_quality("video", "4K") == 2160
    assert main.parse_quality("audio", "128kbps") == 128


def test_keep_awake_is_off_outside_render(monkeypatch):
    import asyncio
    monkeypatch.delenv("RENDER_EXTERNAL_URL", raising=False)
    asyncio.run(asyncio.wait_for(main.keep_awake(), timeout=1))   # returns at once, no loop
