# DreamerZ_Beta - Product Requirements Document

## Project Overview
**Name:** DreamerZ_Beta  
**Version:** 2.1.0  
**Target Audience:** Indian teenagers aged 12-16  
**Purpose:** AI Training web application to teach teens about AI tools responsibly

---

## Original Problem Statement
Build an AI Training web application for teenagers (age 12–16) in India with:
- Safe-by-design principles (no sensitive data collection)
- Server-side AI proxy with rate limiting and safety filters
- Teen-friendly, motivating tone
- Focus on AI in digital social networks

## User Personas
1. **Tech-curious Teen (14-16):** Wants to learn AI tools for school projects and future career prep
2. **Early Explorer (12-13):** New to technology, needs simple explanations and safe environment
3. **Parent/Guardian:** Wants oversight and assurance of safe learning environment

---

## Architecture

### Tech Stack
| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Tailwind CSS + Framer Motion |
| Backend | FastAPI (Python) |
| Database | MongoDB (for future expansion) |
| AI Integration | OpenAI GPT-5.2 via emergentintegrations |

### Key Files
- `/app/frontend/src/data/curriculum.js` - Comprehensive curriculum data (28 modules)
- `/app/frontend/src/data/toolsData.js` - Backward-compatible data adapter
- `/app/frontend/src/components/JourneyPlayer.jsx` - Learning journey player
- `/app/frontend/src/components/Quiz.jsx` - Quiz with MCQ/true-false/short-answer
- `/app/frontend/src/components/ProgressDashboard.jsx` - Progress visualization
- `/app/frontend/src/hooks/useProgress.js` - Progress tracking (localStorage)
- `/app/backend/server.py` - API with AI chat, safety filters, rate limiting

---

## What's Been Implemented ✅

### January 29, 2025 - Launch Ready Features

**SEO & Meta:**
- [x] SEO component with title/description per page
- [x] OpenGraph defaults for social sharing
- [x] Twitter card meta tags

**Error Handling:**
- [x] ErrorBoundary component wrapping app
- [x] 404 Not Found page
- [x] Loading skeletons (CardSkeleton, ModuleListSkeleton, etc.)
- [x] Error display with retry functionality

**Settings Page (/settings):**
- [x] Current progress summary (modules, XP, streak, badges)
- [x] Export progress as JSON
- [x] Import progress from JSON
- [x] Reset progress with confirmation
- [x] Link to Safety & Privacy

**Documentation:**
- [x] README.md with setup instructions
- [x] Environment variables documented
- [x] Curriculum editing guide
- [x] Demo mode explanation
- [x] Safety filter notes and extension guide
- [x] Acceptance criteria checklist

### January 29, 2025 - Parents Page & Safety Guardrails

**/parents Page Sections:**
- [x] What DreamerZ_Beta Teaches (AI Fundamentals, Prompt Engineering, Critical Thinking)
- [x] How to Use AI Responsibly (No cheating, Verify facts, Cite sources, Think for yourself)
- [x] Our Privacy Promise (No sensitive data, No DMs, Content filters, Local storage)
- [x] If Something Feels Unsafe (Guidance for various situations with emojis)
- [x] Helplines (Childline 1098, iCall, Vandrevala Foundation)
- [x] Tips for Parents (Open conversations, Healthy boundaries, Explore together, Critical thinking)

**App-wide Safety Guardrails:**
- [x] Footer on all pages with /parents link
- [x] SafetyBanner component on Prompt Lab and Tool Journey pages
- [x] Dismissible banner with "Learn more" link to /parents
- [x] Teen-friendly, reassuring tone throughout

### January 29, 2025 - Prompt Lab Rebuild

**Prompt Lab UX:**
- [x] Left Panel - Prompt Builder:
  - Goal input (required)
  - Context textarea (who you are, background)
  - Constraints textarea (rules, limits)
  - Output Format dropdown (Bullet list, Table, Step-by-step, Short paragraph)
  - 4 Quick Presets: School homework, YouTube script, Study plan, Poster copy
  - Run button (parallel 3 API calls)
  - Add context button (AI-suggested context)
  - Improve prompt button (AI rewrite)
  - Clear button

- [x] Right Panel - AI Output:
  - 3 tabs: Base Answer, With Context, Best Answer
  - "Why this is better" explanation under each upgrade
  - Visual comparison legend

- [x] Backend enhancements:
  - Enhanced demo responses for prompt_lab modes
  - Safety filter improved for plural forms (weapons, guns, bombs)
  - prompt_lab_helper mode for context suggestions

### January 28, 2025 - Learning Engine + Streak Tracker

**Streak Tracker Feature:**
- [x] Compact streak badge in header (🔥 N days)
- [x] Full streak widget in Progress Dashboard
- [x] Streak at risk warning (⚠️) when missing a day
- [x] Milestone messages (3, 5, 7, 14, 30, 100, 365 days)
- [x] Personal best tracking (longest streak)
- [x] "Done today!" indicator for active days
- [x] Progress bar to next milestone

**JourneyPlayer Component:**
- [x] Sticky header with tool info and XP badge
- [x] Module sidebar with locked/unlocked/completed states
- [x] Content tabs: Learn, Example, Try It
- [x] Quiz integration with "Take Quiz to Continue" button
- [x] Module completion with "Next Module" navigation
- [x] Resume functionality (opens at first incomplete module)

**Enhanced Quiz Component:**
- [x] MCQ questions with A, B, C, D options
- [x] True/False questions with large toggle buttons
- [x] Short-answer questions with keyword matching (beta)
- [x] Instant feedback with correct/incorrect highlighting
- [x] "Explain Answer" button shows detailed explanation
- [x] Retry functionality for failed quizzes
- [x] Score display with attempts and best score tracking
- [x] Confetti animation on passing

**Progress Dashboard:**
- [x] Overall progress percentage with animated stats
- [x] XP Earned / Total XP display
- [x] Tools Mastered counter
- [x] Per-tool progress with module counts
- [x] Clickable tool rows link to journeys
- [x] Reset Progress button with confirmation
- [x] Toggle between Tools grid and Progress view

### January 28, 2025 - Curriculum Data Integration

**Comprehensive Curriculum:**
- [x] ChatGPT Journey: 8 modules (800 XP)
- [x] Claude Journey: 5 modules (500 XP)
- [x] Gemini Journey: 5 modules (500 XP)
- [x] Canva Journey: 5 modules (500 XP)
- [x] Syllaby Journey: 5 modules (500 XP)
- [x] Total: 28 learning modules, 2800 XP available

### December 2025 - MVP Release

**Pages:**
- [x] Landing page (/) - Hero, ROI section, CTAs, stats
- [x] Tools Hub (/tools) - 5 AI tool cards with progress tracking
- [x] Tool Journey (/tools/:toolId) - JourneyPlayer with modules
- [x] Prompt Lab (/prompt-lab) - Interactive AI playground
- [x] Curriculum (/curriculum) - Full module list with search
- [x] Parents Guide (/parents) - Safety information

**Features:**
- [x] AI Chat with GPT-5.2 integration
- [x] Safety filters (blocks harmful content)
- [x] Rate limiting (10 req/min)
- [x] Demo mode fallback
- [x] Responsive design
- [x] Framer Motion animations

---

## Test Status ✅
- Backend: 100% passing
- Frontend: 100% passing (Learning Engine tested)
- Test files: `/app/backend/tests/test_dreamerz_api.py`
- Test reports: `/app/test_reports/iteration_3.json`

---

## Prioritized Backlog

### P0 - Critical (Next Sprint)
- [ ] User authentication (JWT-based with email)
- [ ] Server-side progress storage (MongoDB)
- [ ] User dashboard with personalized stats

### P1 - High Priority
- [ ] Gamification: Badges and achievements system
- [ ] Leaderboard (optional, opt-in)
- [ ] More quiz question types (drag-drop, fill-blank)
- [ ] AI chat history persistence

### P2 - Nice to Have
- [ ] Dark mode toggle
- [ ] Hindi language support
- [ ] Shareable completion certificates
- [ ] Parent dashboard view
- [ ] AI usage analytics (anonymous)

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/ | API health check |
| GET | /api/health | Detailed health status |
| POST | /api/ai | AI chat with safety filters |
| POST | /api/status | Create status check |
| GET | /api/status | Get all status checks |

---

## Safety Features
1. **No PII Collection:** No phone, address, school, DOB fields
2. **Content Filtering:** Regex patterns block harmful content
3. **Rate Limiting:** 10 requests/minute per IP
4. **Demo Mode:** Works without API key exposure
5. **Age-Appropriate AI:** System prompts enforce educational tone
6. **Helpline Info:** Displayed when safety filter triggers

---

## localStorage Schema
```javascript
{
  key: 'dreamerz_beta_progress_v1',
  value: {
    version: '2.0.0',
    createdAt: 'ISO date',
    updatedAt: 'ISO date',
    completedModules: {
      'toolId': {
        'moduleId': {
          completed: true,
          quizScore: 80,
          bestScore: 100,
          attempts: 2,
          completedAt: 'ISO date'
        }
      }
    },
    lastActive: { 'toolId': 'moduleId' },
    totalXP: 100,
    currentStreak: 5,
    longestStreak: 10,
    lastActivityDate: 'ISO date',
    streakUpdatedToday: true,
    badges: [],
    settings: { soundEnabled: true, animationsEnabled: true }
  }
}
```

---

## Next Steps
1. Add user authentication for persistent progress
2. Implement badges/achievements system
3. Add more interactive quiz types
4. Create parent oversight features
5. Consider Hindi localization
