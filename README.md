# CriaByCrypt

Ferramenta **100% frontend** para identificar o tipo de hash de senha e gerar um novo hash no mesmo algoritmo e parametros do hash de referencia.

Tudo roda **localmente no navegador** — senha e hash nunca saem da sua maquina.

## Stack

- React + Vite + TypeScript
- Tailwind CSS v4
- TanStack Query + React Hook Form + Zod
- bcryptjs, hash-wasm (Argon2/scrypt), Web Crypto API, @noble/hashes

## Algoritmos suportados

| Algoritmo | Identificar | Gerar |
|---|---|---|
| bcrypt (`$2a$`, `$2b$`, `$2y$`) | Sim | Sim |
| Argon2 (`id`, `i`, `d`) | Sim | Sim |
| scrypt | Sim | Sim |
| phpass (`$P$`, `$H$`) | Sim | Sim |
| PBKDF2-SHA256 / SHA512 | Sim | Sim |
| Django PBKDF2-SHA256 | Sim | Sim |
| MD5 / SHA-1 / SHA-256 / SHA-512 | Sim | Sim (com aviso) |

## Como rodar

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

## Build para producao

```bash
cd frontend
npm run build
npm run preview
```

O `dist/` pode ser publicado em qualquer host estatico (Netlify, Vercel, nginx).

## Testes

```bash
cd frontend
npm test
```

## Fluxo de uso

1. Cole o hash de referencia (ex.: um hash bcrypt `$2y$10$...`)
2. Clique em **Identificar tipo**
3. Informe a senha desejada
4. Clique em **Gerar novo hash**

## Interface

Monocromatica preto e branco com alternancia entre modo claro e escuro.
