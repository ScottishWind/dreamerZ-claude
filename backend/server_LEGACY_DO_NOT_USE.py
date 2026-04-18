from fastapi import FastAPI, APIRouter, HTTPException, Request, Header, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
import time
import json
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional
import uuid
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from passlib.context import CryptContext
import jwt
from jwt import ExpiredSignatureError, InvalidTokenError

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Load curriculum seed data for new MongoDB collections
CURRICULUM_JSON_PATH = ROOT_DIR / 'curriculum_data.json'

try:
    with open(CURRICULUM_JSON_PATH, 'r', encoding='utf-8') as curriculum_file:
        CURRICULUM_DATA = json.load(curriculum_file)
except FileNotFoundError:
    logging.warning(f"Curriculum seed file not found: {CURRICULUM_JSON_PATH}")
    CURRICULUM_DATA = {"tools": [], "journeys": {}}

# Load site config seed data (pricing, FAQs, trust points, etc.)
SITE_CONFIG_JSON_PATH = ROOT_DIR / 'site_config_seed.json'
try:
    with open(SITE_CONFIG_JSON_PATH, 'r', encoding='utf-8') as site_config_file:
        SITE_CONFIG_SEED = json.load(site_config_file)
except FileNotFoundError:
    logging.warning(f"Site config seed file not found: {SITE_CONFIG_JSON_PATH}")
    SITE_CONFIG_SEED = {}

# Categories from seed (fallback-safe)
CATEGORIES_DATA = [
    {
        "id": "spoken-writing-english",
        "name": "Spoken and Writing English",
        "description": "Spoken and Writing English for West Bengal teens with story-based lessons, voice read-aloud practice, and quizzes.",
    },
    {
        "id": "ai-learning",
        "name": "AI Learning",
        "description": "AI learning tools and curriculum.",
    }
]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Rate limiting (in-memory for beta, config from env)
rate_limit_store = defaultdict(list)
RATE_LIMIT_REQUESTS = int(os.environ.get('RATE_LIMIT_REQUESTS', 10))
RATE_LIMIT_WINDOW = int(os.environ.get('RATE_LIMIT_WINDOW', 60))

# Authentication helpers
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_SECRET = os.environ.get('JWT_SECRET', 'change-this-secret')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION_MINUTES = int(os.environ.get('JWT_EXPIRATION_MINUTES', '1440'))  # 24 hours
EMAIL_REGEX = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
USERNAME_REGEX = re.compile(r'^[a-zA-Z0-9_]{3,30}$')

# ── NoSQL Injection Protection ──────────────────────────
# MongoDB operator injection: if an attacker sends {"$gt":""} instead of a
# plain string, the query semantics change.  These helpers ensure every
# value that lands inside a Mongo filter is a *plain* Python str.

SAFE_ID_PATTERN = re.compile(r'^[a-zA-Z0-9_\-]{1,100}$')

def sanitize_str(value: str, field_name: str = "input") -> str:
    """Reject any value that is not a plain string (blocks operator injection)."""
    if not isinstance(value, str):
        raise HTTPException(status_code=400, detail=f"Invalid {field_name}: must be a string")
    return value

def sanitize_id(value: str, field_name: str = "id") -> str:
    """Validate an identifier is a safe alphanumeric slug."""
    value = sanitize_str(value, field_name)
    if not SAFE_ID_PATTERN.match(value):
        raise HTTPException(status_code=400, detail=f"Invalid {field_name}: only letters, numbers, hyphens, underscores (max 100 chars)")
    return value

def sanitize_query_dict(d: dict) -> dict:
    """Strip any keys starting with $ from a dict (defence-in-depth)."""
    return {k: v for k, v in d.items() if not str(k).startswith("$")}

# Safety filter patterns — code-level config (no DB needed)
UNSAFE_PATTERNS = [
    r'\b(kill|murder|suicide|self.?harm|cut.?myself)\b',
    r'\b(sex|porn|nude|naked|xxx)\b',
    r'\b(hate|racist|discrimination)\b',
    r'\b(bombs?|weapons?|guns?|terror)\b',
    r'\b(my.?phone|my.?address|my.?school|where.?i.?live)\b',
    r'\b(credit.?card|password|bank.?account)\b',
]

SAFETY_MESSAGE = """I can't help with that topic. If you're going through a difficult time, please talk to a trusted adult like a parent, teacher, or school counselor. You can also reach out to:

- iCall: 9152987821 (India)
- Vandrevala Foundation: 1860-2662-345 (India)

Let's focus on learning about AI together! Is there something else I can help you with?"""

# ── Static site content (presentation data — lives in code, not DB) ──
TRUST_POINTS = [
    {"id": "tp-safe", "icon": "Shield", "text": "Safe for teens (12-18)", "color": "text-emerald-500"},
    {"id": "tp-lifetime", "icon": "Clock", "text": "Lifetime access", "color": "text-blue-500"},
    {"id": "tp-cert", "icon": "Award", "text": "Certificates on completion", "color": "text-amber-500"},
    {"id": "tp-bengali", "icon": "Users", "text": "Built for Bengali students", "color": "text-violet-500"},
]

AI_TOOLS_LIST = [
    {"id": "aitool-chatgpt", "name": "ChatGPT", "modules": 7, "description": "Conversations & prompts"},
    {"id": "aitool-claude", "name": "Claude", "modules": 3, "description": "Analysis & reasoning"},
    {"id": "aitool-gemini", "name": "Gemini", "modules": 3, "description": "Multimodal AI"},
    {"id": "aitool-canva", "name": "Canva", "modules": 3, "description": "AI-powered design"},
    {"id": "aitool-syllaby", "name": "Syllaby", "modules": 2, "description": "Video & content"},
]

ENGLISH_WEEKS = [
    {"id": "ew-1", "week": "Week 1", "title": "Foundations", "topics": "Greetings, introductions, daily routines"},
    {"id": "ew-2", "week": "Week 2", "title": "Social Skills", "topics": "School talk, hobbies, food & restaurants"},
    {"id": "ew-3", "week": "Week 3", "title": "Real World", "topics": "Shopping, directions, phone calls"},
    {"id": "ew-4", "week": "Week 4", "title": "Confidence", "topics": "Interviews, debates, storytelling"},
]

BENEFITS = [
    {"id": "ben-safe", "icon": "Shield", "title": "Safe & Age-Appropriate", "description": "Content filters, safety guidelines, no ads — designed for teens.", "color": "text-emerald-600 bg-emerald-50"},
    {"id": "ben-future", "icon": "Brain", "title": "Future-Ready Skills", "description": "AI prompt engineering + English fluency — skills that matter.", "color": "text-indigo-600 bg-indigo-50"},
    {"id": "ben-path", "icon": "Target", "title": "Structured Path", "description": "Day-by-day modules, quizzes, XP tracking — never feel lost.", "color": "text-amber-600 bg-amber-50"},
    {"id": "ben-bengali", "icon": "Languages", "title": "Bengali Context", "description": "Tips for common Bengali mistakes, vocab with Bangla meanings.", "color": "text-rose-600 bg-rose-50"},
]

STATS = [
    {"id": "stat-modules", "value": "48+", "label": "Total Modules"},
    {"id": "stat-tools", "value": "6", "label": "Learning Tools"},
    {"id": "stat-english", "value": "30", "label": "Day English Journey"},
    {"id": "stat-roleplay", "value": "5", "label": "AI Roleplay Characters"},
]

# ── Course access config (code-level, no DB needed) ──
# How many modules are free per course category before paywall kicks in
FREE_PREVIEW_MODULES = {
    "ai-learning": 2,          # first 2 modules of each AI tool free
    "spoken-writing-english": 2,  # first 2 days of English course free
}

# YouTube preview video per tool (embed URLs — update when you have real videos)
COURSE_PREVIEW_VIDEOS = {
    "chatgpt": "https://www.youtube.com/embed/zegMOOKy_6A",
    "claude": "https://www.youtube.com/embed/zegMOOKy_6A",
    "gemini": "https://www.youtube.com/embed/zegMOOKy_6A",
    "canva": "https://www.youtube.com/embed/zegMOOKy_6A",
    "syllaby": "https://www.youtube.com/embed/zegMOOKy_6A",
    "spoken-english-30day": "https://www.youtube.com/embed/zegMOOKy_6A",
}

# Maps tool_id → pricing plan id for paywall lookups
TOOL_TO_PLAN = {
    "chatgpt": "ai-learning",
    "claude": "ai-learning",
    "gemini": "ai-learning",
    "canva": "ai-learning",
    "syllaby": "ai-learning",
    "spoken-english-30day": "spoken-english",
}

# Demo responses for when no API key is configured
DEMO_RESPONSES = {
    "default": "This is a demo response! In the full version, I would provide a helpful answer about AI and learning. Connect an API key to unlock the full AI experience!",
    "prompt_lab": {
        "base": """Here's a general answer to help you understand:

Artificial Intelligence (AI) is a branch of computer science that focuses on creating smart machines that can perform tasks requiring human-like intelligence. This includes learning from examples, solving problems, understanding language, and making decisions.

AI systems work by processing large amounts of data to find patterns. They use algorithms (step-by-step instructions) to learn and improve over time.

Common examples include:
• Voice assistants (Siri, Alexa)
• Recommendation systems (YouTube, Spotify)
• Image recognition
• Translation apps""",
        
        "context": """Since you're a student learning about technology, let me explain AI in a way that connects to your daily life!

**What is AI?**
Think of AI like teaching a computer to learn and improve, similar to how you get better at subjects with practice. The more data AI sees, the smarter it becomes.

**Examples you use every day:**
• When Instagram suggests posts you might like
• When Google completes your search as you type
• When games adapt difficulty to your skill
• When Spotify creates playlists for you

**Why it matters:**
Understanding AI helps you use these tools better and maybe even build cool things yourself someday!

**Key Takeaway:** AI isn't magic - it's pattern recognition on a massive scale.""",
        
        "best": """# Understanding AI: A Teen's Complete Guide 🤖

## Quick Definition
AI (Artificial Intelligence) = Teaching computers to think and learn like humans.

## How It Works (The Cricket Analogy 🏏)
| AI Concept | Cricket Comparison |
|------------|-------------------|
| Training Data | Watching 1000s of match videos |
| Learning | Noticing patterns (bowler's tells) |
| Prediction | Guessing the next delivery |
| Improving | Getting better with each game |

## 3 Types of AI You Use Daily:

1. **Narrow AI** - Does one thing well
   - Example: Spotify recommendations

2. **Machine Learning** - Learns from data
   - Example: Instagram's Explore page

3. **Deep Learning** - Complex pattern recognition
   - Example: Face filters on Snapchat

## Key Points:
✅ AI is not magic - it's math + data
✅ AI makes mistakes (that's why we need humans!)
✅ You can learn to build AI applications

**🎯 Fun Fact:** The AI in video games uses similar tech to what helps doctors detect diseases early!

---
*This response used the perfect prompt formula: Goal + Context + Constraints + Format = Best Answer!*""",
        
        "helper": """Based on your goal, here's helpful context to add:

1. Your age and grade level (helps AI adjust complexity)
2. What you already know about the topic (avoids repetition)
3. Why you need this (school project, personal curiosity, etc.)
4. Your preferred learning style (examples, visuals, step-by-step)"""
    }
}

# Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class AIRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=2000)
    context: Optional[str] = Field(None, max_length=2000)
    mode: str = Field("default", max_length=50)
    session_id: Optional[str] = Field(None, max_length=100)

    @field_validator('prompt', 'context', 'mode', 'session_id', mode='before')
    @classmethod
    def reject_non_string(cls, v):
        if v is not None and not isinstance(v, str):
            raise ValueError('must be a string')
        return v

class AIResponse(BaseModel):
    response: str
    is_demo: bool = False
    tokens_used: Optional[int] = None

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=30)
    email: str = Field(..., max_length=254)
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator('username', 'email', 'password', mode='before')
    @classmethod
    def reject_non_string(cls, v):
        if not isinstance(v, str):
            raise ValueError('must be a string')
        return v

class UserLogin(BaseModel):
    username: Optional[str] = Field(None, max_length=30)
    email: Optional[str] = Field(None, max_length=254)
    password: str = Field(..., max_length=128)

    @field_validator('username', 'email', 'password', mode='before')
    @classmethod
    def reject_non_string(cls, v):
        if v is not None and not isinstance(v, str):
            raise ValueError('must be a string')
        return v

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    email: str
    created_at: str

class UserInfoResponse(BaseModel):
    username: str
    email: str
    created_at: str

class EnrollmentCreate(BaseModel):
    plan_id: str = Field(..., max_length=100)
    payment_id: Optional[str] = Field(None, max_length=200)

    @field_validator('plan_id', 'payment_id', mode='before')
    @classmethod
    def reject_non_string(cls, v):
        if v is not None and not isinstance(v, str):
            raise ValueError('must be a string')
        return v

# Helper functions
def check_rate_limit(client_ip: str) -> bool:
    """Check if client has exceeded rate limit"""
    current_time = time.time()
    # Clean old entries
    rate_limit_store[client_ip] = [
        t for t in rate_limit_store[client_ip] 
        if current_time - t < RATE_LIMIT_WINDOW
    ]
    # Check limit
    if len(rate_limit_store[client_ip]) >= RATE_LIMIT_REQUESTS:
        return False
    # Add new request
    rate_limit_store[client_ip].append(current_time)
    return True

def check_safety(text: str) -> tuple[bool, str]:
    """Check if text contains unsafe content"""
    text_lower = text.lower()
    for pattern in UNSAFE_PATTERNS:
        if re.search(pattern, text_lower):
            return False, SAFETY_MESSAGE
    return True, ""

# Authentication utility functions

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=JWT_EXPIRATION_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_user_by_login_identifier(username: Optional[str], email: Optional[str]):
    if email:
        email = sanitize_str(email, "email").lower()
        return db.users.find_one({"email": email})
    if username:
        username = sanitize_str(username, "username").lower()
        return db.users.find_one({"username": username})
    return None

async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header missing")
    token = authorization.split(" ", 1)[1]
    payload = decode_access_token(token)
    username = payload.get("sub")
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = await db.users.find_one({"username": username.lower()}, {"hashed_password": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def get_ai_response(prompt: str, context: str = None, mode: str = "default") -> tuple[str, bool]:
    """Get AI response using OpenAI SDK, with demo fallback"""
    api_key = os.environ.get('OPENAI_API_KEY')

    if not api_key:
        # Demo mode
        if mode.startswith("prompt_lab"):
            stage = mode.split("_")[-1] if "_" in mode else "base"
            return DEMO_RESPONSES["prompt_lab"].get(stage, DEMO_RESPONSES["default"]), True
        return DEMO_RESPONSES["default"], True

    try:
        from openai import AsyncOpenAI

        system_message = """You are DreamerZ AI Tutor, a friendly and educational AI assistant for teenagers (ages 12-16) learning about AI and technology.

Your guidelines:
1. Be encouraging, patient, and age-appropriate
2. Use simple language and relatable examples (Indian context when relevant)
3. Never share personal opinions on controversial topics
4. If asked about inappropriate topics, redirect to learning
5. Keep responses concise but helpful
6. Use analogies to explain complex concepts
7. Encourage curiosity and critical thinking"""

        if context:
            system_message += f"\n\nAdditional context: {context}"

        client = AsyncOpenAI(api_key=api_key)
        completion = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1024,
            temperature=0.7
        )

        response = completion.choices[0].message.content
        return response, False
    except Exception as e:
        logging.error(f"AI API error: {e}")
        # Fallback to demo mode on error
        if mode.startswith("prompt_lab"):
            stage = mode.split("_")[-1] if "_" in mode else "base"
            return DEMO_RESPONSES["prompt_lab"].get(stage, DEMO_RESPONSES["default"]), True
        return DEMO_RESPONSES["default"], True

# Routes

async def build_tool_document(tool: dict) -> dict:
    return {
        "id": tool["id"],
        "name": tool.get("name"),
        "tagline": tool.get("tagline"),
        "icon": tool.get("icon"),
        "theme": tool.get("theme", {}),
        "description": tool.get("description"),
        "totalXP": tool.get("totalXP", 0),
        "xpReward": tool.get("totalXP", 0),
        "color": tool.get("theme", {}).get("color", "#10A37F"),
        "category_id": tool.get("category_id", "ai-learning"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }

async def build_category_document(category: dict) -> dict:
    return {
        "id": category["id"],
        "name": category.get("name"),
        "description": category.get("description", ""),
        "created_at": datetime.now(timezone.utc).isoformat()
    }

async def build_module_document(tool_id: str, module: dict) -> dict:
    explanation = module.get("explanation", "")
    first_line = explanation.split("\n")[0] if explanation else ""
    return {
        "id": module["id"],
        "tool_id": tool_id,
        "title": module.get("title"),
        "minutes": module.get("minutes"),
        "level": module.get("level"),
        "description": first_line,
        "isAdvanced": module.get("level") == "advanced",
        "day": module.get("day", None),
        "week": module.get("week", None),
        "is_weekly_test": module.get("is_weekly_test", False),
        "content": {
            "explanation": explanation,
            "example": module.get("example", ""),
            "activity": module.get("activity", ""),
            "vocab": module.get("vocab", []),
            "dialogue": module.get("dialogue", []),
            "speaking_task": module.get("speaking_task", ""),
            "bengali_tip": module.get("bengali_tip", ""),
            "micro_grammar": module.get("micro_grammar", "")
        },
        "quiz": module.get("quiz", {}),
        "created_at": datetime.now(timezone.utc).isoformat()
    }

async def seed_curriculum_collections():
    for category in CATEGORIES_DATA:
        await db.categories.update_one(
            {"id": category["id"]},
            {"$setOnInsert": await build_category_document(category)},
            upsert=True
        )

    tools = CURRICULUM_DATA.get("tools", [])
    journeys = CURRICULUM_DATA.get("journeys", {})

    for tool in tools:
        # Replace tool document so new fields are always updated
        await db.tools.replace_one(
            {"id": tool["id"]},
            await build_tool_document(tool),
            upsert=True
        )

        tool_module_ids = [module["id"] for module in journeys.get(tool["id"], [])]
        if tool_module_ids:
            await db.modules.delete_many({
                "tool_id": tool["id"],
                "id": {"$nin": tool_module_ids}
            })

        for module in journeys.get(tool["id"], []):
            await db.modules.replace_one(
                {"id": module["id"]},
                await build_module_document(tool["id"], module),
                upsert=True
            )

    # Remove tools from DB that are no longer in curriculum_data.json
    current_tool_ids = [tool["id"] for tool in tools]
    await db.tools.delete_many({"id": {"$nin": current_tool_ids}})
    # Remove modules for deleted tools
    await db.modules.delete_many({"tool_id": {"$nin": current_tool_ids}})

    await db.tools.update_many(
        {"category_id": {"$exists": False}},
        {"$set": {"category_id": "ai-learning"}}
    )

async def seed_site_config():
    """Seed only business-critical data into MongoDB: pricing_plans and faqs.
    Everything else (trust points, benefits, stats, etc.) is static
    presentation data that lives in code — no DB overhead needed."""
    now = datetime.now(timezone.utc).isoformat()

    for plan in SITE_CONFIG_SEED.get("pricing_plans", []):
        plan["updated_at"] = now
        await db.pricing_plans.update_one(
            {"id": plan["id"]}, {"$set": plan}, upsert=True
        )

    for faq in SITE_CONFIG_SEED.get("faqs", []):
        faq["updated_at"] = now
        await db.faqs.update_one(
            {"id": faq["id"]}, {"$set": faq}, upsert=True
        )

@app.on_event("startup")
async def create_db_indexes():
    await db.users.create_index("username", unique=True)
    await db.users.create_index("email", unique=True)
    await db.tools.create_index("id", unique=True)
    await db.tools.create_index("category_id")
    await db.modules.create_index("id", unique=True)
    await db.modules.create_index("tool_id")
    await db.categories.create_index("id", unique=True)
    await db.pricing_plans.create_index("id", unique=True)
    await db.faqs.create_index("id", unique=True)
    await db.enrollments.create_index([("username", 1), ("plan_id", 1)], unique=True)
    await db.enrollments.create_index("username")
    await seed_curriculum_collections()
    await seed_site_config()
    logging.info("Database seeded and indexes created.")

@api_router.post("/auth/register", response_model=UserInfoResponse)
async def register_user(user: UserCreate):
    username = user.username.strip().lower()
    email = user.email.strip().lower()
    password = user.password.strip()

    if not USERNAME_REGEX.match(username):
        raise HTTPException(status_code=400, detail="Username must be 3-30 characters and can only contain letters, numbers, and underscores.")
    if not EMAIL_REGEX.match(email):
        raise HTTPException(status_code=400, detail="Please provide a valid email address.")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long.")

    existing_user = await db.users.find_one({"$or": [{"username": username}, {"email": email}]})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email is already in use.")

    hashed_password = get_password_hash(password)
    created_at = datetime.now(timezone.utc).isoformat()
    user_doc = {
        "username": username,
        "email": email,
        "hashed_password": hashed_password,
        "created_at": created_at,
        "updated_at": created_at,
        "last_login": None
    }
    await db.users.insert_one(user_doc)

    return {
        "username": username,
        "email": email,
        "created_at": created_at
    }

@api_router.post("/auth/login", response_model=TokenResponse)
async def login_user(credentials: UserLogin):
    username = credentials.username.strip().lower() if credentials.username else None
    email = credentials.email.strip().lower() if credentials.email else None

    if not username and not email:
        raise HTTPException(status_code=400, detail="Please provide a username or email.")

    user = await get_user_by_login_identifier(username, email)
    if not user or not verify_password(credentials.password, user.get("hashed_password", "")):
        raise HTTPException(status_code=401, detail="Invalid username, email, or password.")

    token = create_access_token({"sub": user["username"], "email": user["email"]})
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}})

    return {
        "access_token": token,
        "username": user["username"],
        "email": user["email"],
        "created_at": user["created_at"]
    }

@api_router.get("/auth/me", response_model=UserInfoResponse)
async def get_profile(current_user: dict = Depends(get_current_user)):
    return {
        "username": current_user["username"],
        "email": current_user["email"],
        "created_at": current_user["created_at"]
    }

@api_router.get("/")
async def root():
    return {"message": "DreamerZ Beta API", "version": "1.0.0"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks

@api_router.post("/ai", response_model=AIResponse)
async def ai_chat(request: Request, ai_request: AIRequest):
    """AI chat endpoint with safety filters and rate limiting"""
    
    # Get client IP for rate limiting
    client_ip = request.client.host if request.client else "unknown"
    
    # Check rate limit
    if not check_rate_limit(client_ip):
        raise HTTPException(
            status_code=429, 
            detail="Too many requests. Please wait a minute before trying again."
        )
    
    # Safety check on input
    is_safe, safety_message = check_safety(ai_request.prompt)
    if not is_safe:
        return AIResponse(response=safety_message, is_demo=False)
    
    # Also check context if provided
    if ai_request.context:
        is_safe, safety_message = check_safety(ai_request.context)
        if not is_safe:
            return AIResponse(response=safety_message, is_demo=False)
    
    # Get AI response
    response, is_demo = await get_ai_response(
        ai_request.prompt, 
        ai_request.context,
        ai_request.mode
    )
    
    # Safety check on output
    is_safe, _ = check_safety(response)
    if not is_safe:
        response = "I generated a response but it didn't pass our safety checks. Let me try again with a different approach. Could you rephrase your question?"
    
    return AIResponse(response=response, is_demo=is_demo)

@api_router.get("/content/tools")
async def get_content_tools():
    tools = await db.tools.find({}, {"_id": 0}).to_list(1000)
    modules = await db.modules.find({}, {"_id": 0}).to_list(1000)
    modules_by_tool = {}
    for module in modules:
        modules_by_tool.setdefault(module["tool_id"], []).append(module)

    return [
        {
            **tool,
            "modules": modules_by_tool.get(tool["id"], [])
        }
        for tool in tools
    ]

@api_router.get("/content/tools/{tool_id}")
async def get_content_tool(tool_id: str):
    tool_id = sanitize_id(tool_id, "tool_id")
    tool = await db.tools.find_one({"id": tool_id}, {"_id": 0})
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")

    modules = await db.modules.find({"tool_id": tool_id}, {"_id": 0}).to_list(1000)
    return {
        **tool,
        "modules": modules
    }

@api_router.get("/content/modules")
async def get_content_modules(tool_id: Optional[str] = None):
    query = {}
    if tool_id:
        query["tool_id"] = sanitize_id(tool_id, "tool_id")
    modules = await db.modules.find(query, {"_id": 0}).to_list(1000)
    return modules

@api_router.get("/content/categories")
async def get_content_categories():
    categories = await db.categories.find({}, {"_id": 0}).to_list(1000)
    if not categories:
        # Fallback for safety, should be seeded on startup
        return CATEGORIES_DATA
    return categories

@api_router.get("/content/categories/{category_id}/tools")
async def get_content_tools_by_category(category_id: str):
    category_id = sanitize_id(category_id, "category_id")
    tools = await db.tools.find({"category_id": category_id}, {"_id": 0}).to_list(1000)
    modules = await db.modules.find({"tool_id": {"$in": [tool["id"] for tool in tools]}}, {"_id": 0}).to_list(1000)
    modules_by_tool = {}
    for module in modules:
        modules_by_tool.setdefault(module["tool_id"], []).append(module)

    return [
        {
            **tool,
            "modules": modules_by_tool.get(tool["id"], [])
        }
        for tool in tools
    ]

class RoleplayMessage(BaseModel):
    tool_id: str = Field(..., max_length=100)
    module_id: str = Field(..., max_length=100)
    user_message: str = Field(..., min_length=1, max_length=1000)
    role: str = Field("friend", max_length=30)
    history: List[dict] = Field(default_factory=list, max_length=20)

    @field_validator('tool_id', 'module_id', 'user_message', 'role', mode='before')
    @classmethod
    def reject_non_string(cls, v):
        if not isinstance(v, str):
            raise ValueError('must be a string')
        return v

ROLEPLAY_SYSTEM_PROMPTS = {
    "friend": "You are Riya, a friendly Bengali teen aged 16 from Kolkata. You are chatting casually with your friend in English. Use simple everyday English (CEFR A2-B1). Keep replies to 1-3 sentences. If your friend makes a grammar mistake (like 'I am knowing', 'He go', 'more better'), gently correct them mid-chat with a smile, e.g. 'Oh by the way, we say \"He goes\" not \"He go\" 😊'. Be warm, relatable, and encouraging.",
    "waiter": "You are a polite waiter at a restaurant in Kolkata. Speak only in simple English. Take the customer's order, ask about preferences, and respond naturally. Keep replies to 1-3 sentences. If the customer makes a grammar mistake, gently note the correct phrasing as part of the conversation.",
    "teacher": "You are a friendly English teacher helping a Bengali teen practice spoken English. Ask questions, respond to their answers, and give encouraging corrections when they make mistakes. Focus on pronunciation tips and grammar. Keep replies to 2-4 sentences.",
    "shopkeeper": "You are a shopkeeper at a clothing store in Kolkata speaking English. Help the customer find items, discuss prices, and suggest products. Keep replies to 1-3 sentences. Gently correct grammar mistakes.",
    "interviewer": "You are conducting a friendly mock job interview in English for a teenager applying for an internship. Ask one question at a time. Give brief encouraging feedback after each answer. Keep replies to 2-3 sentences."
}

@api_router.post("/ai/roleplay")
async def ai_roleplay(payload: RoleplayMessage, authorization: Optional[str] = Header(None)):
    api_key = os.environ.get('OPENAI_API_KEY', '')
    role = payload.role if payload.role in ROLEPLAY_SYSTEM_PROMPTS else "friend"
    system_message = ROLEPLAY_SYSTEM_PROMPTS[role]

    # Safety check on user message
    is_safe, _ = check_safety(payload.user_message)
    if not is_safe:
        return {"response": "Let's keep our practice focused on English learning! Try saying something about the topic.", "is_demo": False}

    try:
        from openai import AsyncOpenAI

        # Build context from history
        messages = [{"role": "system", "content": system_message}]
        for msg in payload.history[-6:]:  # last 6 messages for context
            msg_role = "user" if msg.get("from") == "user" else "assistant"
            messages.append({"role": msg_role, "content": msg.get("text", "")})
        messages.append({"role": "user", "content": payload.user_message})

        client = AsyncOpenAI(api_key=api_key)
        completion = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=256,
            temperature=0.8
        )

        response = completion.choices[0].message.content

        is_safe_resp, _ = check_safety(response)
        if not is_safe_resp:
            response = "Let's keep our practice focused! Can you try saying that differently?"

        return {"response": response, "is_demo": False}
    except Exception as e:
        logging.error(f"Roleplay AI error: {e}")
        # Friendly demo fallback
        demo_replies = {
            "friend": "That's cool! So what do you usually do after school? 😊",
            "waiter": "Of course! Would you like anything else with that?",
            "teacher": "Good try! Remember to use 'I would like' instead of 'I want' for polite requests. Try again!",
            "shopkeeper": "Sure! We have that in blue and red. Which colour do you prefer?",
            "interviewer": "Interesting! Can you tell me about a challenge you faced and how you solved it?"
        }
        return {"response": demo_replies.get(role, "Great! Keep going — you're doing well!"), "is_demo": True}

## ── Enrollment / Paywall Endpoints ─────────────────────

@api_router.post("/enrollments")
async def create_enrollment(payload: EnrollmentCreate, current_user: dict = Depends(get_current_user)):
    """Record an enrollment after payment verification.
    In production, verify payment_id with your payment gateway before creating."""
    plan_id = sanitize_id(payload.plan_id, "plan_id")
    # Check plan exists
    plan = await db.pricing_plans.find_one({"id": plan_id, "is_active": True})
    if not plan:
        raise HTTPException(status_code=404, detail="Pricing plan not found")

    now = datetime.now(timezone.utc).isoformat()
    enrollment = {
        "username": current_user["username"],
        "plan_id": plan_id,
        "payment_id": payload.payment_id or "",
        "enrolled_at": now,
        "is_active": True,
    }
    try:
        await db.enrollments.insert_one(enrollment)
    except Exception:
        # Already enrolled (unique index)
        return {"status": "already_enrolled", "plan_id": plan_id}

    return {"status": "enrolled", "plan_id": plan_id, "enrolled_at": now}

@api_router.get("/enrollments/check")
async def check_enrollment(plan_id: str, current_user: dict = Depends(get_current_user)):
    """Check if current user is enrolled in a specific plan."""
    plan_id = sanitize_id(plan_id, "plan_id")
    enrollment = await db.enrollments.find_one(
        {"username": current_user["username"], "plan_id": plan_id, "is_active": True},
        {"_id": 0}
    )
    return {"enrolled": enrollment is not None, "plan_id": plan_id}

@api_router.get("/enrollments/my")
async def get_my_enrollments(current_user: dict = Depends(get_current_user)):
    """List all active enrollments for the current user."""
    enrollments = await db.enrollments.find(
        {"username": current_user["username"], "is_active": True},
        {"_id": 0, "username": 0}
    ).to_list(50)
    return enrollments

@api_router.get("/course-access/{tool_id}")
async def get_course_access(tool_id: str, authorization: Optional[str] = Header(None)):
    """Return access info for a tool: free module count, preview video, enrollment status.
    Works for both logged-in and anonymous users."""
    tool_id = sanitize_id(tool_id, "tool_id")

    # Determine which plan this tool belongs to
    plan_id = TOOL_TO_PLAN.get(tool_id)
    tool = await db.tools.find_one({"id": tool_id}, {"_id": 0, "category_id": 1})
    category = tool.get("category_id", "ai-learning") if tool else "ai-learning"
    free_count = FREE_PREVIEW_MODULES.get(category, 2)
    video_url = COURSE_PREVIEW_VIDEOS.get(tool_id, "")

    # Check enrollment if user is logged in
    enrolled = False
    if authorization and authorization.startswith("Bearer "):
        try:
            token = authorization.split(" ", 1)[1]
            payload = decode_access_token(token)
            username = payload.get("sub", "")
            if username and plan_id:
                enrollment = await db.enrollments.find_one(
                    {"username": username.lower(), "plan_id": plan_id, "is_active": True}
                )
                enrolled = enrollment is not None
        except Exception:
            pass  # anonymous access is fine

    # Get pricing info for paywall display
    pricing = None
    if plan_id:
        pricing = await db.pricing_plans.find_one({"id": plan_id, "is_active": True}, {"_id": 0})

    return {
        "tool_id": tool_id,
        "plan_id": plan_id,
        "enrolled": enrolled,
        "free_module_count": free_count,
        "preview_video_url": video_url,
        "pricing": pricing,
    }

## ── Site Config Endpoints ──────────────────────────────
# Only pricing_plans and faqs live in MongoDB (business-critical).
# Everything else is static presentation data returned from code constants.

@api_router.get("/site/pricing")
async def get_pricing_plans():
    """Return active pricing plans from DB, sorted by sort_order"""
    plans = await db.pricing_plans.find({"is_active": True}, {"_id": 0}).sort("sort_order", 1).to_list(100)
    if not plans:
        plans = SITE_CONFIG_SEED.get("pricing_plans", [])
    bundle_link = SITE_CONFIG_SEED.get("bundle_payment_link", "#payment-bundle")
    return {"plans": plans, "bundle_payment_link": bundle_link}

@api_router.get("/site/faqs")
async def get_faqs():
    """Return active FAQs from DB, sorted by sort_order"""
    faqs = await db.faqs.find({"is_active": True}, {"_id": 0}).sort("sort_order", 1).to_list(100)
    if not faqs:
        faqs = SITE_CONFIG_SEED.get("faqs", [])
    return faqs

@api_router.get("/site/config")
async def get_full_site_config():
    """Single call for all landing-page data.
    DB-backed: pricing, faqs.  Code-backed: trust points, benefits, stats, etc."""
    plans_data = await get_pricing_plans()
    return {
        "pricing": plans_data,
        "faqs": await get_faqs(),
        "trust_points": TRUST_POINTS,
        "benefits": BENEFITS,
        "stats": STATS,
        "ai_tools": AI_TOOLS_LIST,
        "english_weeks": ENGLISH_WEEKS,
    }

@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include the router
app.include_router(api_router)

# ── CORS — strict allowlist, no wildcard in production ──
_default_origins = "http://localhost:3000,http://127.0.0.1:3000"
_cors_origins_raw = os.environ.get('CORS_ORIGINS', _default_origins)
_cors_origins = [o.strip() for o in _cors_origins_raw.split(',') if o.strip()]

# Warn loudly if someone sets "*" — allow it only in dev
if "*" in _cors_origins:
    logging.warning(
        "⚠️  CORS_ORIGINS contains '*'. This is acceptable for local dev "
        "but MUST be replaced with explicit origins before deploying to production."
    )

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_cors_origins,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
    expose_headers=["X-RateLimit-Remaining"],
    max_age=600,  # preflight cache 10 min
)

# ── Security headers middleware ──
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response

# ── Global exception handler (prevent leaking internal details) ──
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred. Please try again later."}
    )

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
