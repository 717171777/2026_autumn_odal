FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup -S odal && adduser -S odal -G odal
COPY --from=build --chown=odal:odal /app/.next/standalone ./
COPY --from=build --chown=odal:odal /app/.next/static ./.next/static
COPY --from=build --chown=odal:odal /app/public ./public
COPY --from=build --chown=odal:odal /app/scripts ./scripts
COPY --from=build --chown=odal:odal /app/db ./db
# Migration commands also need pg, which Next.js traces for server handlers.
USER odal
EXPOSE 3000
CMD ["node", "server.js"]
