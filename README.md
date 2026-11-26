# Toolbox

Console de ferramentas técnicas em `toolbox.bevilabs.com.br`. A maior parte dos utilitários roda **100% no navegador** (senhas, hashes e arquivos não saem da sua máquina); a API interna em NestJS atende a verificação de banco de dados e o extrator de mídia por URL.

## Ferramentas

- **Hash de senha:** identifica bcrypt, Argon2, scrypt, PBKDF2 (passlib/Django), phpass (WordPress/phpBB), MySQL 4.1+, digests MD5/SHA-1/SHA-2 e formatos crypt/LDAP/Werkzeug/Django/Cisco, gerando novos hashes compatíveis.
- **Gerador de JWT:** tokens HS256/384/512 com segredo aleatório e claims configuráveis.
- **JSON Formatter:** formata, minifica, valida e converte JSON, YAML, XML e CSV com indicação de linha e coluna.
- **Comparador de textos:** diff lado a lado com realce por caractere e exportação.
- **Verificação de banco (MySQL/MariaDB):** diagnóstico via API interna de TCP, autenticação, TLS, ping, schema, privilégios e escrita temporária.
- **Conversor de arquivos:** converte imagens (PNG, JPG, WebP, AVIF, BMP, GIF, SVG, HEIC/HEIF e RAW) e documentos/planilhas (PDF, DOCX, ODT, RTF, TXT, Markdown, HTML, XLSX/XLS/ODS, CSV/TSV, JSON e XML) localmente com detecção automática de formato e drag-and-drop.
- **Extrator de mídia:** analisa links públicos de YouTube, Instagram, TikTok e arquivos diretos via API interna (`yt-dlp` + `ffmpeg` opcional para MP3 e fallback oEmbed), permitindo baixar vídeo completo ou **somente áudio** (MP3/M4A) por streaming com token assinado e proteção SSRF.
- **QR Code:** geração local em PNG ou SVG para URL, texto, Wi-Fi, Pix, vCard, e-mail e telefone.
- **Laboratório de cores:** conversão entre HEX, RGB, HSL, HSV e CMYK, paletas, contraste WCAG e degradês CSS/Tailwind.

## Estrutura do projeto

```text
toolbox/
├── backend/          # API NestJS (/api): health, db-verify e media-extract
├── frontend/         # SPA React + Vite + Tailwind CSS v4 + TanStack Query
├── deploy/           # Docker Compose e templates de ambiente para produção (VPS)
├── docs/rules/       # Diretrizes técnicas de referência (NestJS e Docker Compose)
├── scripts/          # Scripts e testes de validação da pipeline CI/CD
├── .github/          # Workflows (CI, CD, PR title, rollback) e documentação de deploy
├── package.json      # Scripts da raiz (dev, build, test, ci)
└── iniciar-dev.bat   # Atalho Windows para iniciar API + Web localmente
```

## Stack

- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS v4, TanStack Query, React Hook Form + Zod, Phosphor Icons.
- **Backend:** NestJS 11 (`/api`), Zod (`nestjs-zod`), `mysql2`, Pino, `yt-dlp` (binário nativo). Protegido por `x-internal-api-key` injetada pelo proxy (Vite em dev, Nginx em produção).

## Rodar localmente

```bash
npm install                 # raiz: concurrently
npm --prefix backend ci
npm --prefix frontend ci
npm run dev                 # API (:3000) + Web (:5173); ou dev:api / dev:web separados
```

No Windows, `iniciar-dev.bat` faz o mesmo com duplo clique. Antes, crie `backend/.env` e `frontend/.env` a partir dos `.env.example` de cada pasta (`INTERNAL_API_KEY` igual nos dois, mínimo 32 caracteres). Para habilitar downloads de YouTube/Instagram/TikTok localmente, mantenha `yt-dlp` disponível no `PATH` (ou configure `YTDLP_BINARY_PATH` no `backend/.env`); em servidores onde o YouTube exigir verificação anti-bot, configure `YTDLP_COOKIES_PATH` apontando para um arquivo `cookies.txt` em formato Netscape fora do Git.

## Testes e build

```bash
npm run ci:api              # lint, typecheck, unitários, e2e e build do backend
npm run ci:web              # unitários e build do frontend
npm test                    # testes unitários de API + Web
npm run build               # build de API + Web
```

## Deploy

Imagens buildadas no GitHub Actions, publicadas no GHCR e implantadas na VPS por SSH com forced command. Detalhes, `.env` de produção e passos de configuração em [.github/DEPLOYMENT.md](.github/DEPLOYMENT.md).
