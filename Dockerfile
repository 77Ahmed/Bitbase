# Stage 1: build the web UI
FROM node:20-slim AS ui
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

# Stage 2: YouTube PO-token server (bgutil) packages
FROM node:22-bookworm-slim AS pot
WORKDIR /opt/bgutil
ADD https://github.com/Brainicism/bgutil-ytdlp-pot-provider/archive/refs/tags/2.0.0.tar.gz /tmp/bgutil.tar.gz
RUN tar -xzf /tmp/bgutil.tar.gz --strip-components=2 -C /opt/bgutil bgutil-ytdlp-pot-provider-2.0.0/server &&     npm ci --omit=dev --no-audit --no-fund

# Stage 3: Python app
FROM python:3.12-slim
WORKDIR /app

# ffmpeg merges HD video + audio and makes MP3s
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Deno lets yt-dlp solve YouTube's JavaScript checks (needed for most formats)
COPY --from=denoland/deno:bin-2.9.6 /deno /usr/local/bin/deno

# PO-token server for YouTube, run by Deno (BitBase starts it on 127.0.0.1:4416)
ENV DENO_DIR=/opt/bgutil/.cache/deno DENO_NO_PROMPT=1 DENO_NO_UPDATE_CHECK=1
COPY --from=pot /opt/bgutil /opt/bgutil
RUN deno cache --frozen /opt/bgutil/src/main.ts

COPY server_py/requirements.txt server_py/requirements.txt
RUN pip install --no-cache-dir -r server_py/requirements.txt

COPY server_py/ ./server_py/
COPY run.py .
COPY --from=ui /app/dist ./dist

# Render (and most hosts) pass their own PORT; 4000 is the local default
ENV PORT=4000
EXPOSE 4000
CMD ["python", "run.py"]
