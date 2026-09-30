@echo off
REM ===========================================================================
REM  HireHub - DEVELOPMENT workflow (optional)
REM
REM  Normal use does not need this file. Double-click start-hirehub.bat instead:
REM  that serves the site at http://localhost:8000, which is the fixed address
REM  to bookmark.
REM
REM  Use this one only when you are changing the code and want Vite's hot
REM  module replacement, which needs its own dev server on port 5173. It starts
REM  the same API on port 8000, so do not run both at once - they would collide
REM  on that port.
REM ===========================================================================
title HireHub dev servers
cd /d "%~dp0"
node scripts\dev.mjs
echo.
echo Press any key to close this window.
pause >nul
