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

# Sem root: por isso escuta na 8080. A imagem já traz envsubst e o wget do busybox.
FROM nginxinc/nginx-unprivileged:alpine AS runtime
# O script de entrada reescreve o default.conf no start: o arquivo precisa ser do usuário do nginx.
COPY --chown=nginx:root nginx.conf /etc/nginx/conf.d/default.conf
COPY --chmod=755 docker-entrypoint.d/99-subst-internal-api-key.sh /docker-entrypoint.d/99-subst-internal-api-key.sh
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=6 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
