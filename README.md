# DreamerZ_Beta - AI Learning Platform for Teens

A production-ready web application teaching Indian teenagers (ages 12-16) to use AI responsibly.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- MongoDB (optional, currently uses localStorage)

### Environment Setup

1. **Clone and install dependencies:**
```bash
# Frontend
cd frontend
yarn install

# Backend
cd backend
pip install -r requirements.txt
```

2. **Configure environment variables:**

**Frontend** (`frontend/.env`):
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

**Backend** (`backend/.env`):
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=dreamerz_beta
EMERGENT_LLM_KEY=your_openai_api_key  # Optional - enables AI features
JWT_SECRET=your_jwt_secret            # Required for authentication tokens
```

3. **Start the servers:**
```bash
# Terminal 1 - Backend
cd backend
python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Terminal 2 - Frontend new addition
cd frontend
yarn start
```

4. **Access the app:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001/api

---

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `REACT_APP_BACKEND_URL` | Yes | Backend API URL (frontend) |
| `MONGO_URL` | No | MongoDB connection string |
| `DB_NAME` | No | Database name |
| `EMERGENT_LLM_KEY` | No | OpenAI API key for AI features |

---

## 🌐 Deploying to the Web

This repo is ready for production deployment as:

- `backend/` → FastAPI web service
- `frontend/` → React static site

### Recommended: Render deployment

1. Push this repository to GitHub.
2. Create a Render account and connect your repo.
3. Add two services:
   - **Backend**
     - Type: `Web Service`
     - Root Directory: `backend`
     - Build Command: `pip install -r requirements.txt`
     - Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
     - Environment variables:
       - `MONGO_URL`
       - `DB_NAME`
       - `JWT_SECRET`
       - `CORS_ORIGINS` (optional, e.g. `https://<frontend-url>`)
   - **Frontend**
     - Type: `Static Site`
     - Root Directory: `frontend`
     - Build Command: `yarn install && yarn build`
     - Publish Path: `build`
     - Environment variables:
       - `REACT_APP_BACKEND_URL=https://<backend-url>`

Render also supports this repo automatically via `render.yaml`.

### Optional alternative: Vercel + MongoDB Atlas

- Deploy `frontend/` to Vercel as a Create React App.
- Deploy `backend/` to Render, Railway, or another Python host.
- Use MongoDB Atlas for `MONGO_URL`.
- Set `REACT_APP_BACKEND_URL` in frontend environment variables.

### GitHub Actions

This repo includes GitHub Actions workflows for continuous integration and optional Render deploys.

- `.github/workflows/ci.yml` runs backend tests and builds the frontend on pushes and pull requests.
- `.github/workflows/render-deploy.yml` can deploy to Render when the required secrets are configured.

To enable Render deploys, add these repository secrets:

- `RENDER_API_KEY`
- `RENDER_BACKEND_SERVICE_ID`
- `RENDER_FRONTEND_SERVICE_ID`

Once set, pushes to `main` will build the app and deploy both services.

---

## 📚 Editing the Curriculum

The curriculum data is located at:
```
frontend/src/data/curriculum.js
```

### Structure:
```javascript
const tools = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    tagline: 'Your AI conversation partner',
    icon: '🤖',
    theme: { color: '#10B981', gradient: '...' },
    totalXP: 800,
    description: '...',
  }
];

const journeys = {
  'chatgpt': [
    {
      id: 'chatgpt-intro',
      title: 'What is ChatGPT?',
      level: 'beginner',      // 'beginner' | 'intermediate' | 'advanced'
      minutes: 8,
      xp: 100,
      explanation: '...',     // Main learning content
      example: '...',         // Real-world example
      activity: '...',        // Hands-on task
      quiz: {
        passingScore: 70,
        questions: [
          {
            id: 'q1',
            type: 'mcq',        // 'mcq' | 'true-false' | 'short-answer'
            question: '...',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 1,   // Index for MCQ, boolean for true-false
            explanation: '...'  // Shown after answering
          }
        ]
      }
    }
  ]
};
```

### Adding a New Module:
1. Add module object to the appropriate tool's journey array
2. Include: id, title, level, minutes, xp, explanation, example, activity, quiz
3. Ensure quiz has at least 3 questions with explanations

### Adding a New Tool:
1. Add tool object to `tools` array with unique `id`
2. Create corresponding journey array in `journeys` object
3. Update `totalXP` to match sum of module XPs

---

## 🎭 Demo Mode

When `EMERGENT_LLM_KEY` is not configured, the app runs in **Demo Mode**:

- `/api/ai` returns pre-written educational responses
- All features remain functional for testing
- Prompt Lab shows example improvements
- No external API calls are made

### Demo Response Locations:
```python
# backend/server.py
DEMO_RESPONSES = {
    "default": "...",
    "prompt_lab": {
        "base": "...",
        "context": "...",
        "best": "..."
    }
}
```

---

## 🛡️ Safety Filter

The backend includes a content safety filter for all AI interactions.

### Location:
```python
# backend/server.py
UNSAFE_PATTERNS = [
    r'\b(kill|murder|suicide|self.?harm)\b',
    r'\b(sex|porn|nude|naked)\b',
    r'\b(hate|racist|discrimination)\b',
    r'\b(bombs?|weapons?|guns?|terror)\b',
    r'\b(my.?phone|my.?address|my.?school)\b',
    r'\b(credit.?card|password|bank.?account)\b',
]
```

### Extending the Filter:
1. Add new patterns to `UNSAFE_PATTERNS` array
2. Test patterns with various inputs
3. Update response message in `is_safe_content()` function

### Filter Response:
When triggered, users see:
```
"I can't help with that topic. If you're going through something difficult, 
please talk to a trusted adult or call a helpline like Childline (1098)."
```

---

## ✅ Acceptance Criteria

### 1. Welcome/Landing Page (ROI)
- [x] Hero section with clear value proposition
- [x] "5 AI Tools, 20+ Modules, 2,800+ XP" stats
- [x] Benefits section (Future-Ready Skills, Safe & Age-Appropriate)
- [x] Clear CTAs to Tools and Prompt Lab
- [x] Responsive on mobile

### 2. Tools Page with Animation
- [x] Grid of 5 tool cards (ChatGPT, Claude, Gemini, Canva, Syllaby)
- [x] Hover animations (scale, shadow)
- [x] Progress indicators per tool
- [x] XP and module counts displayed
- [x] Toggle between Tools grid and Progress view

### 3. Journey Gating with Quizzes
- [x] Modules displayed in sidebar with lock icons
- [x] Content tabs: Learn, Example, Try It
- [x] Quiz at end of each module
- [x] 70% passing score to unlock next
- [x] MCQ, True/False, Short Answer types
- [x] Instant feedback with explanations
- [x] Retry functionality
- [x] Progress saved to localStorage

### 4. Prompt Lab 3-Step Improvement
- [x] Left panel: Goal, Context, Constraints, Output Format
- [x] Right panel: 3 tabs (Base, With Context, Best Answer)
- [x] "Why this is better" explanations
- [x] Presets: School homework, YouTube script, Study plan, Poster copy
- [x] Add context and Improve prompt helper buttons
- [x] Demo mode fallback responses

### 5. Parents Page & Safety Guardrails
- [x] What DreamerZ_Beta teaches section
- [x] How to use AI responsibly (no cheating, verify, cite)
- [x] Privacy promise (no sensitive data, no DMs)
- [x] "If something feels unsafe" guidance with helplines
- [x] Footer with /parents link on all pages
- [x] Safety banner on Prompt Lab and Journey pages

---

## 📁 Project Structure

```
/app
├── backend/
│   ├── server.py          # FastAPI app, AI endpoint, safety filter
│   ├── requirements.txt   # Python dependencies
│   └── tests/             # API tests
│
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Route pages
│   │   ├── hooks/         # Custom React hooks
│   │   ├── data/          # Curriculum data
│   │   └── utils/         # Helper functions
│   └── .env
│
└── README.md
```

---

## 🆘 Support Helplines

- **Childline India**: 1098 (24/7)
- **iCall**: 9152987821
- **Vandrevala Foundation**: 1860-2662-345
#   d r e a m e r Z - w i n 6 4 
 
 