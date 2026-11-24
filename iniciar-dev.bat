@echo off
rem Atalho de duplo clique: sobe API (NestJS) e Web (Vite) via "npm run dev" da raiz.
setlocal
cd /d "%~dp0"
title Toolbox - dev

where npm >nul 2>&1 || (
  echo [ERRO] npm nao encontrado no PATH. Instale o Node.js 22+ LTS.
  goto :fail
)

for %%D in (backend frontend) do if not exist "%%D\.env" (
  echo [ERRO] Falta %%D\.env. Copie %%D\.env.example para %%D\.env e defina INTERNAL_API_KEY igual nos dois.
  goto :fail
)

rem Instala dependencias apenas quando ausentes, seguindo os lockfiles existentes.
if not exist "node_modules\" (
  echo Instalando dependencias da raiz...
  call npm ci || goto :fail
)
for %%D in (backend frontend) do if not exist "%%D\node_modules\" (
  echo Instalando dependencias de %%D...
  call npm --prefix %%D ci || goto :fail
)

echo.
echo API: http://127.0.0.1:3000/api   Web: http://localhost:5173
echo Pressione Ctrl+C para encerrar os dois servicos.
echo.
call npm run dev
if errorlevel 1 goto :fail
exit /b 0

:fail
set "CODE=%ERRORLEVEL%"
if "%CODE%"=="0" set "CODE=1"
echo.
echo [ERRO] Inicializacao interrompida (codigo %CODE%). Veja as mensagens acima.
pause
exit /b %CODE%
