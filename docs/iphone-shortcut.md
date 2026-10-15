# BitBase iPhone Shortcut

Share a video link from YouTube, TikTok, Instagram and other apps, pick a quality, and the video is saved to **Photos**.

The Shortcut calls your Render server:

```
GET https://YOUR-APP.onrender.com/api/direct?url=<video link>&quality=720p&key=<API_KEY>
```

- **YOUR-APP.onrender.com**: your Render link.
- **API_KEY**: on Render, open the service → **Environment** → copy `API_KEY`.

Videos come back as **H.264 MP4**, which the iPhone Photos app plays.

## Build it (2 minutes)

1. Open **Shortcuts** → **+** → name it **BitBase**.
2. Tap **ⓘ** → turn on **Show in Share Sheet**. Under *Receive*, keep only **URLs** and **Text**. Set *If there's no input* → **Get Clipboard**.
3. Add these actions in order:

| # | Action | Set it to |
|---|---|---|
| 1 | **Get URLs from Input** | Shortcut Input |
| 2 | **URL Encode** | URLs |
| 3 | **List** | `1080p`, `720p`, `480p`, `360p` (one per line) |
| 4 | **Choose from List** | List · Prompt: `Video quality?` |
| 5 | **Text** | `https://YOUR-APP.onrender.com/api/direct?url=` *URL Encoded Text* `&quality=` *Chosen Item* `&key=YOUR_API_KEY` |
| 6 | **Get Contents of URL** | Text |
| 7 | **Save to Photo Album** | Contents of URL → Recents |
| 8 | **Show Notification** | `Saved to Gallery ✅` |

The *italic* parts in step 5 are blue variables: tap in the Text box → **Select Variable** → pick the result of step 2 or step 4.

The list stops at 1080p on purpose. YouTube's 4K isn't H.264, so the iPhone gallery often can't play it.

## Music (MP3) version

Make a second Shortcut. In step 5 use `&type=audio` instead of the quality, and replace step 7 with **Save File** (Photos can't store MP3s).

## Using it

- In YouTube: **Share → More → BitBase** → pick a quality.
- Or copy a link, then tap the BitBase Shortcut. Add it to your Home Screen from its ⓘ menu.
- The first time, iOS asks for permission to connect to your server and to Photos. Tap **Always Allow**.

## If it doesn't work

- **"Wrong or missing key":** the key in step 5 doesn't match `API_KEY` on Render.
- **YouTube fails but TikTok/Instagram work:** YouTube is blocking the server. On Render, add fresh cookies from a throwaway Google account as the Secret File `cookies.txt` (see the main README).
- **Very slow or times out:** long or 4K videos take a while on the free server. Pick 720p or lower.
