@echo off
echo ============================================
echo   DreamerZ Full Clean Restart
echo ============================================
echo.

echo [1/6] Killing existing Node and Python processes...
taskkill /f /im node.exe 2>nul
taskkill /f /im python.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/6] Installing openai package in backend venv...
cd /d "%~dp0backend"
call venv\Scripts\activate
pip install openai>=1.30.0 --quiet
echo    openai installed!

echo [3/6] Clearing backend __pycache__...
for /d /r "%~dp0backend" %%d in (__pycache__) do (
    if exist "%%d" (
        rmdir /s /q "%%d" 2>nul
    )
)
echo    Backend cache cleared!

echo [4/6] Clearing frontend build cache...
cd /d "%~dp0frontend"
if exist "node_modules\.cache" (
    rmdir /s /q "node_modules\.cache"
    echo    Frontend cache cleared!
) else (
    echo    No frontend cache to clear.
)
if exist "build" (
    rmdir /s /q "build"
    echo    Old build removed!
)

echo [5/6] Starting backend server...
cd /d "%~dp0backend"
start "DreamerZ Backend" cmd /k "call venv\Scripts\activate && python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload"
timeout /t 3 /nobreak >nul

echo [6/6] Starting frontend dev server...
cd /d "%~dp0frontend"
echo.
echo    Backend running on http://localhost:8001
echo    Frontend starting on http://localhost:3000
echo    Press Ctrl+C to stop frontend.
echo.
call yarn start
