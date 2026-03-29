from fastapi import FastAPI, APIRouter, HTTPException, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
import time
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from collections import defaultdict

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Rate limiting (in-memory for beta)
rate_limit_store = defaultdict(list)
RATE_LIMIT_REQUESTS = 10
RATE_LIMIT_WINDOW = 60  # seconds

# Safety filter patterns
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
    prompt: str
    context: Optional[str] = None
    mode: str = "default"  # default, prompt_lab_base, prompt_lab_context, prompt_lab_constraints
    session_id: Optional[str] = None

class AIResponse(BaseModel):
    response: str
    is_demo: bool = False
    tokens_used: Optional[int] = None

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

async def get_ai_response(prompt: str, context: str = None, mode: str = "default") -> tuple[str, bool]:
    """Get AI response, with demo fallback"""
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    
    if not api_key:
        # Demo mode
        if mode.startswith("prompt_lab"):
            stage = mode.split("_")[-1] if "_" in mode else "base"
            return DEMO_RESPONSES["prompt_lab"].get(stage, DEMO_RESPONSES["default"]), True
        return DEMO_RESPONSES["default"], True
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except ImportError as e:
        logging.warning(f"Emergent integrations package not available: {e}. Falling back to demo mode.")
        if mode.startswith("prompt_lab"):
            stage = mode.split("_")[-1] if "_" in mode else "base"
            return DEMO_RESPONSES["prompt_lab"].get(stage, DEMO_RESPONSES["default"]), True
        return DEMO_RESPONSES["default"], True

    try:
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
        
        chat = LlmChat(
            api_key=api_key,
            session_id=str(uuid.uuid4()),
            system_message=system_message
        )
        chat.with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return response, False
    except Exception as e:
        logging.error(f"AI API error: {e}")
        # Fallback to demo mode on error
        if mode.startswith("prompt_lab"):
            stage = mode.split("_")[-1] if "_" in mode else "base"
            return DEMO_RESPONSES["prompt_lab"].get(stage, DEMO_RESPONSES["default"]), True
        return DEMO_RESPONSES["default"], True

# Routes
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

@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
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
