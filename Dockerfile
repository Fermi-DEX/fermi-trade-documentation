# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV ASTRO_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
# Optional session CA for managed environments; normal VMs use system trust.
RUN --mount=type=secret,id=proxy_ca \
    if [ -s /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm ci --no-audit --no-fund
COPY . .
ARG DOCS_DOMAIN=docs.fermi.trade
ENV DOCS_DOMAIN=$DOCS_DOMAIN
RUN npm test && npm run build && npm run check:site

FROM node:24-bookworm-slim AS oauth
WORKDIR /app
COPY --chown=node:node server/oauth.mjs ./oauth.mjs
USER node
ENV NODE_ENV=production
CMD ["node", "oauth.mjs"]

FROM caddy:2-alpine AS web
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
