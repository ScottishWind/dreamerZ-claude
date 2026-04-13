@echo off
echo Starting DreamerZ Backend and Frontend...

:: Start Backend
echo Launching Backend on port 8001...
start "DreamerZ Backend" cmd /k "cd /d C:\DreamerZCode-Claude\dreamerZ-tutorial-main\backend && venv\Scripts\activate && uvicorn server:app --host 0.0.0.0 --port 8001 --reload"

:: Wait a moment for backend to initialize
timeout /t 3 /nobreak >nul

:: Start Frontend
echo Launching Frontend...
start "DreamerZ Frontend" cmd /k "cd /d C:\DreamerZCode-Claude\dreamerZ-tutorial-main\frontend && yarn start"

:: Wait for frontend to start then open browser
timeout /t 8 /nobreak >nul
echo Opening browser...
start http://localhost:3000

echo Done! Both services are starting up.
