@echo off
setlocal EnableExtensions
title Sougetsu Akira FX - installer
rem Installs the unsigned (debug) CEP build. Run it from the unzipped folder.

rem --- ask for admin rights once (needed to remove old copies a ZXP installer put in Program Files) ---
net session >nul 2>&1
if errorlevel 1 (
  echo Asking for administrator rights...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

set "ID=com.sougetsu.akirafx"
set "SRC=%~dp0%ID%"
if not exist "%SRC%\CSXS\manifest.xml" (
  echo.
  echo ERROR: the folder "%ID%" was not found next to this file.
  echo Right-click the zip ^> Extract All, then run INSTALL_WINDOWS.bat from the extracted folder.
  pause & exit /b 1
)

tasklist /FI "IMAGENAME eq AfterFX.exe" 2>nul | find /I "AfterFX.exe" >nul
if not errorlevel 1 (
  echo.
  echo Please close After Effects first, then run this again.
  pause & exit /b 1
)

echo.
echo Removing older Sougetsu Akira FX copies...
for %%R in ("%APPDATA%\Adobe\CEP\extensions" "%ProgramFiles(x86)%\Common Files\Adobe\CEP\extensions" "%ProgramFiles%\Common Files\Adobe\CEP\extensions") do (
  if exist "%%~R" (
    for /d %%D in ("%%~R\*") do (
      if exist "%%~D\CSXS\manifest.xml" (
        findstr /m /c:"%ID%" "%%~D\CSXS\manifest.xml" >nul 2>&1 && (
          echo   removing %%~D
          rmdir /s /q "%%~D"
        )
      )
    )
  )
)

set "DEST=%APPDATA%\Adobe\CEP\extensions\%ID%"
echo Copying to %DEST% ...
if not exist "%APPDATA%\Adobe\CEP\extensions" mkdir "%APPDATA%\Adobe\CEP\extensions"
robocopy "%SRC%" "%DEST%" /E /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 (
  echo ERROR: copy failed.
  pause & exit /b 1
)

echo Enabling unsigned extensions (PlayerDebugMode) for CEP 7-13...
for %%V in (7 8 9 10 11 12 13) do reg add "HKCU\Software\Adobe\CSXS.%%V" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul

if not exist "%DEST%\host\akira_loader.jsx" (
  echo ERROR: install check failed - host\akira_loader.jsx missing in %DEST%
  pause & exit /b 1
)
echo.
echo ============================================================
echo  Installed. Start After Effects, then open:
echo    Window ^> Extensions (Legacy) ^> Sougetsu Akira FX
echo  (older AE versions: Window ^> Extensions ^> Sougetsu Akira FX)
echo ============================================================
pause
