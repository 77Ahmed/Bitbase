# Stage 1: build the web UI
FROM node:20-slim AS ui
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

# Stage 2: Python app
FROM python:3.12-slim
WORKDIR /app

# ffmpeg merges HD video + audio and makes MP3s
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Deno lets yt-dlp solve YouTube's JavaScript checks (needed for most formats)
COPY --from=denoland/deno:bin-2.9.6 /deno /usr/local/bin/deno

# Cloudflare WARP tools: only used when YOUTUBE_WARP=1 (helps when YouTube blocks the server)
ADD https://github.com/ViRb3/wgcf/releases/download/v2.3.0/wgcf_2.3.0_linux_amd64 /usr/local/bin/wgcf
ADD https://github.com/windtf/wireproxy/releases/download/v1.1.3/wireproxy_linux_amd64.tar.gz /tmp/wireproxy.tar.gz
RUN tar -xzf /tmp/wireproxy.tar.gz -C /usr/local/bin wireproxy && rm /tmp/wireproxy.tar.gz &&     chmod 755 /usr/local/bin/wgcf /usr/local/bin/wireproxy

COPY server_py/requirements.txt server_py/requirements.txt
RUN pip install --no-cache-dir -r server_py/requirements.txt

COPY server_py/ ./server_py/
COPY run.py .
COPY --from=ui /app/dist ./dist

# Render (and most hosts) pass their own PORT; 4000 is the local default
ENV PORT=4000
EXPOSE 4000
CMD ["python", "run.py"]
