FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chmod=755 /app/dist ./dist
COPY --from=build --chmod=755 /app/server ./server
EXPOSE 8080
USER node
CMD ["node", "server/server.mjs"]
