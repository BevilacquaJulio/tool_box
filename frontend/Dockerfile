# syntax=docker/dockerfile:1
# Node 24 = LTS ativo em 2026-08 (https://endoflife.date/nodejs)
# VITE_* sao build-time (baked no bundle). VITE_API_URL vazio = browser chama /api no mesmo dominio.

FROM node:24-alpine AS build
WORKDIR /app
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS runtime
RUN apk add --no-cache wget gettext
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.d/99-subst-internal-api-key.sh /docker-entrypoint.d/99-subst-internal-api-key.sh
RUN chmod +x /docker-entrypoint.d/99-subst-internal-api-key.sh
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
