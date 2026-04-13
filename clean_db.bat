@echo off
echo Cleaning Spoken and Writing English data from MongoDB...
cd /d C:\DreamerZCode-Claude\dreamerZ-tutorial-main
backend\venv\Scripts\python.exe -c "import asyncio; from motor.motor_asyncio import AsyncIOMotorClient; from dotenv import load_dotenv; from pathlib import Path; import os; load_dotenv(Path('backend/.env')); client = AsyncIOMotorClient(os.environ['MONGO_URL']); db = client[os.environ['DB_NAME']]; r1 = asyncio.get_event_loop().run_until_complete(db.tools.delete_many({'category_id': 'spoken-writing-english'})); r2 = asyncio.get_event_loop().run_until_complete(db.modules.delete_many({'tool_id': 'spoken-english-30day'})); print(f'Deleted {r1.deleted_count} tools, {r2.deleted_count} modules'); client.close(); print('Done! Restart backend to re-seed.')"
pause
