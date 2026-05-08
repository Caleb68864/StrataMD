@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

if "%OBSIDIAN_VAULT%"=="" (
  set "OBSIDIAN_VAULT=%USERPROFILE%\Documents\Obsidian Vault"
)

set "PLUGIN_ID=stratamd"
set "TARGET_DIR=%OBSIDIAN_VAULT%\.obsidian\plugins\%PLUGIN_ID%"

echo.
echo [1/4] Running verify...
call npm run verify
if errorlevel 1 goto :fail

echo.
echo [2/4] Ensuring plugin target directory exists...
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

echo.
echo [3/4] Copying plugin files...
copy /Y "main.js" "%TARGET_DIR%\main.js" >nul
if errorlevel 1 goto :fail
copy /Y "manifest.json" "%TARGET_DIR%\manifest.json" >nul
if errorlevel 1 goto :fail
copy /Y "styles.css" "%TARGET_DIR%\styles.css" >nul
if errorlevel 1 goto :fail

echo.
echo [4/4] Done.
echo Installed to: %TARGET_DIR%
echo In Obsidian: disable/re-enable StrataMD (or restart Obsidian).
goto :eof

:fail
echo.
echo Build/install failed.
exit /b 1
