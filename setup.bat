@echo off
title Buenos Dias — Instalacion y Setup
cd /d "%~dp0"

echo ============================================================
echo        BUENOS DIAS - SETUP AUTOMATICO DEL SISTEMA           
echo ============================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado en este equipo.
    echo Por favor descargalo e instalalo desde: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [1/4] Verificando e instalando dependencias (npm install)...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Fallo la instalacion de dependencias de npm.
    pause
    exit /b 1
)
echo      Dependencias instaladas correctamente.
echo.

echo [2/4] Verificando archivo de configuracion (.env)...
if not exist ".env" (
    copy ".env.example" ".env" >nul
    echo      Se creo el archivo .env a partir de .env.example.
    echo      IMPORTANTE: Abrí el archivo .env y completa tu GROQ_API_KEY o GEMINI_API_KEY.
) else (
    echo      El archivo .env ya existe.
)
echo.

echo [3/4] Verificando carpetas de datos y credenciales...
if not exist "data" mkdir "data"
if not exist "reportes" mkdir "reportes"
if not exist "credentials" mkdir "credentials"
if not exist "credentials\credentials.json" (
    echo      [AVISO] No se encontro credentials/credentials.json.
    echo      Para leer Gmail, descarga tu OAuth client JSON desde Google Cloud Console
    echo      y guardalo en credentials/credentials.json (ver README.md).
) else (
    echo      Credenciales de Gmail detectadas.
)
echo.

echo [4/4] Setup finalizado con exito!
echo.
echo ============================================================
echo ACCIONES RAPIDAS:
echo  1. Ejecutar reporte ahora:     Doble clic en 'iniciar.bat' (o npm start)
echo  2. Vincular WhatsApp:          Doble clic en 'vincular.bat' (o npm run vincular)
echo  3. Automatizar en Windows:     Ejecutar 'configurar-despertador.ps1'
echo ============================================================
echo.
pause
