# Build context must be the repository root:  docker build -f apps/api/Dockerfile .
FROM node:25-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/sdk/package.json ./packages/sdk/package.json
COPY apps/api/package.json ./apps/api/package.json
RUN npm ci

COPY tsconfig.base.json ./
COPY deployments ./deployments
COPY packages/sdk ./packages/sdk
COPY apps/api ./apps/api

ENV NODE_ENV=production
ENV PORT=8788
EXPOSE 8788

CMD ["npm", "run", "start", "-w", "@tessera/api"]
