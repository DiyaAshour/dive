FROM node:22-bookworm-slim AS app
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN npm install && npm run db:generate && npm run build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm","run","start","-w","@platform/web"]
