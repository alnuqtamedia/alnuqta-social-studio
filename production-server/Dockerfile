FROM mcr.microsoft.com/playwright:v1.56.1-noble
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund && npm install --no-save --package-lock=false --ignore-scripts playwright@1.56.1
COPY production-server ./production-server
RUN mkdir /data && chown pwuser:pwuser /data
USER pwuser
ENV PORT=8080 STUDIO_JOB_DIR=/data/jobs
EXPOSE 8080
VOLUME /data
CMD ["node","production-server/server.mjs"]
