@echo off
setlocal
cd /d "%~dp0"
echo KOL Compass will run at http://127.0.0.1:5175
echo This project intentionally does not use ports 5173 or 5174.
start "" "http://127.0.0.1:5175"
python -m http.server 5175 --bind 127.0.0.1
