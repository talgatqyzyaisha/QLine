FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev --no-audit --no-fund; else npm install --omit=dev --no-audit --no-fund; fi
COPY Backend/src ./Backend/src
COPY Frontend ./Frontend
COPY shared ./shared
USER node
EXPOSE 3000
CMD ["node", "Backend/src/server.js"]
