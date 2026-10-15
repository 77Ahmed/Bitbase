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

# ffmpeg merges HD video + audio and makes MP3s; nodejs lets yt-dlp solve YouTube's JS checks
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg nodejs && \
    rm -rf /var/lib/apt/lists/*

COPY server_py/requirements.txt server_py/requirements.txt
RUN pip install --no-cache-dir -r server_py/requirements.txt

COPY server_py/ ./server_py/
COPY run.py .
COPY --from=ui /app/dist ./dist

ENV PORT=4000
EXPOSE 4000
CMD ["python", "run.py"]
