@echo off
REM ===========================================================================
REM  HireHub - one-click start
REM
REM  Double-click this file. It is the only thing you need to run.
REM  The site will always be at the same address:
REM
REM        opencode
REM
REM  The port is fixed at 8000 on purpose. If something else is already using
REM  it, this script says what and stops, rather than quietly moving to a
REM  different port - a port that changes on every restart is exactly the
REM  problem this file exists to remove.
REM ===========================================================================
setlocal enabledelayedexpansion
title HireHub
cd /d "%~dp0"

set "PORT=8000"
set "URL=http://localhost:%PORT%"
set "XAMPP=C:\xampp"

REM A portable delay. `timeout` is ambiguous: when this file is run from a Git
REM Bash or MSYS shell, /t is rewritten into a path and the command fails.
REM Ping is present everywhere and behaves the same in cmd and PowerShell.
set /a HH_SLEEP=3

echo.
echo   HireHub - starting...
echo.

REM --- 1. Is the port free? ------------------------------------------------
REM Checked before anything is started, so a clash is reported up front rather
REM than after the database has been left half-taken.
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /r /c:":%PORT% .*LISTENING"') do set "PORTPID=%%P"

if defined PORTPID (
    echo   STOPPED - port %PORT% is already in use.
    echo.
    REM PowerShell rather than `tasklist /fi`: the slash options get mangled
    REM into file paths when this is launched from a Git Bash or MSYS shell,
    REM which silently produces a blank process name. Dash options are immune,
    REM and reading .Name directly avoids a pipe, which cmd would have to
    REM escape and in doing so pass the escape through to PowerShell.
    set "PROCNAME="
    for /f "usebackq delims=" %%P in (`powershell -NoProfile -Command "(Get-Process -Id %PORTPID% -ErrorAction SilentlyContinue).Name"`) do set "PROCNAME=%%P"
    if "!PROCNAME!"=="" set "PROCNAME=an unknown process"

    REM Read with ! not %: inside a parenthesised block, %VAR% is substituted
    REM when the block is parsed, which happens before the loop above has run.
    REM That silently printed an empty name even though the lookup succeeded.
    echo     Process : !PROCNAME!
    echo     PID     : !PORTPID!
    echo.
    echo   HireHub has NOT been started, and the port has NOT been changed.
    echo   Close that program - or stop any earlier HireHub window - and
    echo   double-click this file again.
    echo.
    pause
    exit /b 1
)

echo   [1/4] Port %PORT% is free.

REM --- 2. MySQL ------------------------------------------------------------
REM XAMPP's MySQL does not survive a Windows restart unless its service is set
REM to start automatically. Rather than assume it is running, ask the port: a
REM listening 3306 means the database is up regardless of how it got there.
set "DBUP="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /r /c:":3306 .*LISTENING"') do set "DBUP=%%P"

if defined DBUP (
    echo   [2/4] MySQL is already running.
) else (
    echo   [2/4] MySQL is not running - starting it...
    REM my.ini lives in mysql\bin, not the mysql root, and points at the
    REM datadir that holds the existing hirehub data. Getting this path wrong
    REM starts a second server against an empty directory, which looks like the
    REM whole database having vanished.
    if not exist "%XAMPP%\mysql\bin\my.ini" (
        echo     ERROR: my.ini not found at %XAMPP%\mysql\bin\my.ini
        echo     Start MySQL from the XAMPP Control Panel to see the real error.
        echo.
        pause
        exit /b 1
    )
    if not exist "%XAMPP%\mysql\bin\mysqld.exe" (
        echo     ERROR: mysqld.exe not found at %XAMPP%\mysql\bin
        echo     Check that XAMPP is installed in C:\xampp, or set XAMPP in this file.
        echo.
        pause
        exit /b 1
    )

    REM --standalone matches how XAMPP itself launches the server, so this
    REM instance behaves identically to one started from the control panel.
    start "HireHub MySQL" /min "%XAMPP%\mysql\bin\mysqld.exe" --defaults-file="%XAMPP%\mysql\bin\my.ini" --standalone

    REM Wait for it rather than assuming: hitting Laravel a moment too early
    REM gives a confusing "connection refused" instead of a clean start.
    set /a WAITED=0
    :waitmysql
    ping -n 2 127.0.0.1 >nul
    set /a WAITED+=1
    netstat -ano ^| findstr /r /c:":3306 .*LISTENING" >nul && goto mysqlready
    if !WAITED! lss 45 (
        echo     ERROR: MySQL did not come up within 45 seconds.
        echo     Open the XAMPP Control Panel and start MySQL to see the real error.
        echo.
        pause
        exit /b 1
    )
    goto waitmysql
    :mysqlready
    echo     MySQL is up.
)

REM --- 3. Clear stale config -----------------------------------------------
REM config:cache bakes APP_URL and the CORS/Sanctum origins into a compiled
REM file. After an edit - or a reboot that changed something - the cached copy
REM is what the app keeps using, which is a common cause of a site that refuses
REM to load until someone remembers to clear it. Clearing here means it cannot
REM be forgotten.
echo   [3/4] Clearing cached config...
pushd backend
call php artisan config:clear >nul 2>&1
call php artisan view:clear >nul 2>&1
popd

REM --- 4. Serve ------------------------------------------------------------
REM If the web app has never been built, build it now so the very first
REM double-click produces a working site rather than a "please run npm build"
REM page. Later starts skip this, because the check is instant.
if not exist "backend\public\build\index.html" (
    echo   [4/4] First run - building the web app, please wait...
    call npm run build
    if errorlevel 1 (
        echo     ERROR: the build failed. See the messages above.
        echo.
        pause
        exit /b 1
    )
) else (
    echo   [4/4] Starting HireHub...
)

echo.
echo   ==========================================================
echo     HireHub is starting at %URL%
echo.
echo     Keep this window open while you use the site.
echo     Close it to stop HireHub.
echo   ==========================================================
echo.

REM Give the server a moment to bind before the browser asks for the page,
REM otherwise the first load can show a connection error.
ping -n %HH_SLEEP% 127.0.0.1 >nul
start "" "%URL%"

REM pushd, not cd: the popd below has to match it, or the pop lands on an
REM unrelated directory and the window ends up somewhere unexpected.
pushd backend
call php artisan serve --port=%PORT%
popd
echo.
echo   HireHub has stopped.
pause
