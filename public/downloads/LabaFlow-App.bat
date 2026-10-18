@echo off
rem LabaFlow - opens the shop app in its own window. Double-click to start.
setlocal
set "URL=https://chrstndzdlcrz.github.io/enter-LabaFlowLaundrySystem/"
set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
set "CHROME32=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
set "LOCAL=%LocalAppData%\Google\Chrome\Application\chrome.exe"
set "EDGE64=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if exist "%CHROME%" (
  start "" "%CHROME%" --app=%URL%
  goto :eof
)
if exist "%CHROME32%" (
  start "" "%CHROME32%" --app=%URL%
  goto :eof
)
if exist "%LOCAL%" (
  start "" "%LOCAL%" --app=%URL%
  goto :eof
)
if exist "%EDGE64%" (
  start "" "%EDGE64%" --app=%URL%
  goto :eof
)
if exist "%EDGE%" (
  start "" "%EDGE%" --app=%URL%
  goto :eof
)
rem No Chromium browser found in the usual places: open in the default browser.
start "" "%URL%"
