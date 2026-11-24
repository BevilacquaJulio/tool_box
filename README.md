# Toolbox

Caixa de ferramentas para desenvolvedores em `toolbox.bevilabs.com.br`. Quase tudo roda **no navegador**:
senhas, hashes e arquivos não saem da sua máquina. O backend só atende a verificação de banco de dados.

## Ferramentas

- **Hash de senha:** identifica bcrypt, Argon2, scrypt, PBKDF2 (passlib/Django), phpass (WordPress/phpBB),
  MySQL 4.1+, digests MD5/SHA-1/SHA-2 e reconhece crypt do Linux (`$1$`, `$5$`, `$6$`, `$y$`), LDAP, Werkzeug,
  Drupal 7, Django e Cisco. Gera um novo hash no mesmo algoritmo e parâmetros quando suportado.
- **JWT aleatório:** HS256/384/512 com segredo do tamanho escolhido (mínimo exigido pelo algoritmo, até 512).
- **Conversão de documentos:** PDF, DOCX, ODT, RTF, TXT, Markdown, HTML, XLSX, CSV, JSON e XML para
  **PDF**, **Word (.docx)**, HTML, TXT, Markdown, CSV, XLSX, JSON, XML ou imagens (páginas do PDF).
  Títulos, negrito/itálico, listas, tabelas, código e citações são mantidos no PDF e no Word.
- **Verificação de banco (MySQL/MariaDB):** TCP + autenticação, TLS, ping, schema, privilégios e escrita temporária.
- Conversão de imagens e cores, JSON, QR Code, diff de texto.

## Stack

- Frontend: React + Vite + TypeScript, Tailwind CSS v4, TanStack Query, React Hook Form + Zod.
- Backend: NestJS (`/api`), mysql2, Pino. Protegido por chave interna injetada pelo nginx.

## Rodar localmente

```bash
npm install                 # raiz: concurrently
npm --prefix backend ci
npm --prefix frontend ci
npm run dev                 # API (:3000) + Web (:5173); ou dev:api / dev:web separados
```

No Windows, `iniciar-dev.bat` faz o mesmo com duplo clique. Antes, crie `backend/.env` e `frontend/.env`
a partir dos `.env.example` de cada pasta (`INTERNAL_API_KEY` igual nos dois, mínimo 32 caracteres).

## Testes

```bash
npm --prefix backend run ci     # lint, typecheck, unitários, e2e, build
npm --prefix frontend test
npm --prefix frontend run build
```

## Deploy

Imagens buildadas no GitHub Actions, publicadas no GHCR e implantadas na VPS por SSH com forced command.
Detalhes, `.env` de produção e passos de configuração em [.github/DEPLOYMENT.md](.github/DEPLOYMENT.md).
