FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S sentinel && adduser -S sentinel -G sentinel
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
USER sentinel
EXPOSE 8787
CMD ["node", "src/server.js"]
