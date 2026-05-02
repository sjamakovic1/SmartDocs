FROM node:20-slim AS build

WORKDIR /app

ENV DATABASE_URL="postgresql://user:password@localhost:5432/smartdocs"
ENV DIRECT_URL="postgresql://user:password@localhost:5432/smartdocs"

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY server/package*.json ./server/
COPY client/package*.json ./client/

RUN npm install --prefix server
RUN npm ci --prefix client

COPY server ./server
COPY client ./client

RUN npm run build --prefix client
RUN npm run build --prefix server

FROM node:20-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/server/package*.json ./server/
COPY --from=build /app/server/node_modules ./server/node_modules
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/prisma ./server/prisma
COPY --from=build /app/client/dist ./client/dist

EXPOSE 5000

CMD ["npm", "run", "start", "--prefix", "server"]
