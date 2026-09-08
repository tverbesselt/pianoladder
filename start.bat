@echo off
cd /d "%~dp0"
title Pianoladder

rem py is de officiele Windows-launcher en staat altijd in C:\Windows.
where py >nul 2>nul
if %errorlevel%==0 (
    py tools\start.py
    goto klaar
)

where python >nul 2>nul
if %errorlevel%==0 (
    python tools\start.py
    goto klaar
)

echo.
echo   Ik kan Python niet vinden.
echo   Installeer het via https://www.python.org/downloads/ en vink
echo   "Add python.exe to PATH" aan, of open de Microsoft Store en
echo   installeer Python daaruit.
echo.

:klaar
echo.
pause
