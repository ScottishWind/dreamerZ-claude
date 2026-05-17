"""AI service — Anthropic Claude integration, safety filters, demo fallbacks."""

import logging
import re
from typing import Optional

from config import ANTHROPIC_API_KEY, CLAUDE_MODEL

# ── Safety Filter ─────────────────────────────────────────
UNSAFE_PATTERNS = [
    r"\b(kill|murder|suicide|self.?harm|cut.?myself)\b",
    r"\b(sex|porn|nude|naked|xxx)\b",
    r"\b(hate|racist|discrimination)\b",
    r"\b(bombs?|weapons?|guns?|terror)\b",
    r"\b(my.?phone|my.?address|my.?school|where.?i.?live)\b",
    r"\b(credit.?card|password|bank.?account)\b",
]

SAFETY_MESSAGE = (
    "I can't help with that topic. If you're going through a difficult time, "
    "please talk to a trusted adult like a parent, teacher, or school counselor. "
    "You can also reach out to:\n\n"
    "- iCall: 9152987821 (India)\n"
    "- Vandrevala Foundation: 1860-2662-345 (India)\n\n"
    "Let's focus on learning about AI together! Is there something else I can help you with?"
)


def check_safety(text: str) -> tuple:
    """Check if text contains unsafe content. Returns (is_safe, message)."""
    text_lower = text.lower()
    for pattern in UNSAFE_PATTERNS:
        if re.search(pattern, text_lower):
            return False, SAFETY_MESSAGE
    return True, ""


# ── Demo Responses ────────────────────────────────────────
DEMO_RESPONSES = {
    "default": (
        "This is a demo response! In the full version, I would provide a helpful "
        "answer about AI and learning. Connect an API key to unlock the full AI experience!"
    ),
    "prompt_lab": {
        "base": (
            "Here's a general answer to help you understand:\n\n"
            "Artificial Intelligence (AI) is a branch of computer science that focuses on "
            "creating smart machines that can perform tasks requiring human-like intelligence."
        ),
        "context": (
            "Since you're a student learning about technology, let me explain AI "
            "in a way that connects to your daily life!"
        ),
        "best": "# Understanding AI: A Teen's Complete Guide",
        "helper": (
            "Based on your goal, here's helpful context to add:\n\n"
            "1. Your age and grade level\n"
            "2. What you already know about the topic\n"
            "3. Why you need this\n"
            "4. Your preferred learning style"
        ),
    },
}

# ── Roleplay System Prompts ───────────────────────────────
ROLEPLAY_SYSTEM_PROMPTS = {
    "friend": (
        "You are Riya, a friendly Bengali teen aged 16 from Kolkata. You are chatting "
        "casually with your friend in English. Use simple everyday English (CEFR A2-B1). "
        "Keep replies to 1-3 sentences. If your friend makes a grammar mistake, gently "
        "correct them mid-chat with a smile."
    ),
    "waiter": (
        "You are a polite waiter at a restaurant in Kolkata. Speak only in simple English. "
        "Take the customer's order, ask about preferences, and respond naturally. "
        "Keep replies to 1-3 sentences."
    ),
    "teacher": (
        "You are a friendly English teacher helping a Bengali teen practice conversational English. "
        "Ask questions, respond to their answers, and give encouraging corrections."
    ),
    "shopkeeper": (
        "You are a shopkeeper at a clothing store in Kolkata speaking English. "
        "Help the customer find items, discuss prices, and suggest products."
    ),
    "interviewer": (
        "You are conducting a friendly mock job interview in English for a teenager "
        "applying for an internship. Ask one question at a time."
    ),
}

ROLEPLAY_DEMO_REPLIES = {
    "friend": "That's cool! So what do you usually do after school?",
    "waiter": "Of course! Would you like anything else with that?",
    "teacher": "Good try! Remember to use 'I would like' instead of 'I want' for polite requests.",
    "shopkeeper": "Sure! We have that in blue and red. Which colour do you prefer?",
    "interviewer": "Interesting! Can you tell me about a challenge you faced and how you solved it?",
}


# ── System Prompt (no user input concatenated) ────────────
TUTOR_SYSTEM_PROMPT = (
    "You are DreamerZ AI Tutor, a friendly and educational AI assistant for teenagers "
    "(ages 12-16) learning about AI and technology.\n\n"
    "Your guidelines:\n"
    "1. Be encouraging, patient, and age-appropriate\n"
    "2. Use simple language and relatable examples (Indian context when relevant)\n"
    "3. Never share personal opinions on controversial topics\n"
    "4. If asked about inappropriate topics, redirect to learning\n"
    "5. Keep responses concise but helpful\n"
    "6. Use analogies to explain complex concepts\n"
    "7. Encourage curiosity and critical thinking"
)


# ── Per-tool persona overlay ──────────────────────────────
#
# All Lab chats route through one backend (Anthropic Claude) but we layer a
# tool-specific style guide on top of the tutor prompt so the response
# *shape* roughly matches what the learner expects from the tool they're
# studying. This is honestly disclosed in the UI — we're not pretending to
# be the other vendor's model, just mimicking its answer style for didactic
# purposes.
TOOL_PERSONAS = {
    "chatgpt": (
        "Answer in ChatGPT's signature style: warm and conversational, "
        "with light markdown (a short intro paragraph, then a bulleted "
        "or numbered list when it helps, then a one-line wrap-up). Be "
        "approachable, slightly enthusiastic, and offer to dig deeper."
    ),
    "claude": (
        "Answer in Claude's signature style: thoughtful and measured, "
        "with careful nuance. Walk through your reasoning briefly before "
        "the conclusion, hedge when uncertain, and note any caveats or "
        "limitations honestly."
    ),
    "gemini": (
        "Answer in Gemini's signature style: terse and well-structured. "
        "Lead with the most concrete answer in 1-2 sentences, then a "
        "compact table or short bullet list with the supporting facts. "
        "Skip filler and avoid hedging unless strictly necessary."
    ),
    "canva": (
        "You are coaching a learner using Canva for visual design. "
        "Suggest punchy headline copy, layout ideas, and colour/typography "
        "directions. Keep prose short; use short bulleted lists."
    ),
    "syllaby": (
        "You are coaching a learner using Syllaby to script and storyboard "
        "short videos. Suggest hooks, scene outlines, and on-screen text. "
        "Keep prose short; use numbered scene-by-scene structure when fitting."
    ),
}


def _system_prompt_for(tool_id: Optional[str]) -> str:
    """Compose the system prompt: base tutor prompt + optional persona."""
    persona = TOOL_PERSONAS.get((tool_id or "").lower().strip()) if tool_id else None
    if persona:
        return f"{TUTOR_SYSTEM_PROMPT}\n\nResponse style for this lesson:\n{persona}"
    return TUTOR_SYSTEM_PROMPT


async def get_ai_response(
    prompt: str,
    context: str = None,
    mode: str = "default",
    history: list = None,
    tool_id: Optional[str] = None,
) -> tuple:
    """Get AI response using Anthropic Claude SDK, with demo fallback.

    SECURITY: Context is passed as a separate user message instead of
    being concatenated into the system prompt (prevents prompt injection).

    `history` is an optional list of `HistoryMessage`-shaped entries
    (or dicts with `from_field`/`text` or `from`/`text`) representing prior
    turns. Used by the Try-It chat to keep the conversation coherent.
    Capped at 20 entries on the API layer; we additionally take the last 12
    here to keep the prompt size sane.
    """
    if not ANTHROPIC_API_KEY:
        # Demo mode
        if mode.startswith("prompt_lab"):
            stage = mode.split("_")[-1] if "_" in mode else "base"
            return (
                DEMO_RESPONSES["prompt_lab"].get(stage, DEMO_RESPONSES["default"]),
                True,
            )
        return DEMO_RESPONSES["default"], True

    try:
        from anthropic import AsyncAnthropic

        client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

        # Build messages list
        messages = []

        # Context goes as a separate message — NOT injected into system prompt
        if context:
            messages.append(
                {"role": "user", "content": f"[Context for this question: {context}]"}
            )
            messages.append(
                {"role": "assistant", "content": "Got it, I'll keep that context in mind."}
            )

        # Prior turns (last 12) — tolerate both pydantic objects and dicts so
        # the helper works for the AIRequest path and any direct callers.
        for msg in (history or [])[-12:]:
            if hasattr(msg, "from_field"):
                role = msg.from_field
                text = msg.text
            else:
                role = msg.get("from_field") or msg.get("from") or "user"
                text = msg.get("text", "")
            if not text:
                continue
            messages.append({"role": "user" if role == "user" else "assistant", "content": text})

        messages.append({"role": "user", "content": prompt})

        response = await client.messages.create(
            model=CLAUDE_MODEL,
            system=_system_prompt_for(tool_id),
            messages=messages,
            max_tokens=1024,
        )

        text = response.content[0].text
        return text, False

    except Exception as e:
        logging.error("Claude AI API error: %s", e)
        if mode.startswith("prompt_lab"):
            stage = mode.split("_")[-1] if "_" in mode else "base"
            return (
                DEMO_RESPONSES["prompt_lab"].get(stage, DEMO_RESPONSES["default"]),
                True,
            )
        return DEMO_RESPONSES["default"], True


async def get_roleplay_response(
    role: str, user_message: str, history: list
) -> tuple:
    """Get roleplay AI response with safety checks."""
    safe_role = role if role in ROLEPLAY_SYSTEM_PROMPTS else "friend"
    system_message = ROLEPLAY_SYSTEM_PROMPTS[safe_role]

    # Safety check
    is_safe, _ = check_safety(user_message)
    if not is_safe:
        return (
            "Let's keep our practice focused on English learning! "
            "Try saying something about the topic.",
            False,
        )

    if not ANTHROPIC_API_KEY:
        return ROLEPLAY_DEMO_REPLIES.get(safe_role, "Great! Keep going!"), True

    try:
        from anthropic import AsyncAnthropic

        client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

        # Build messages from history
        messages = []
        for msg in history[-6:]:
            msg_role = "user" if msg.from_field == "user" else "assistant"
            messages.append({"role": msg_role, "content": msg.text})
        messages.append({"role": "user", "content": user_message})

        response = await client.messages.create(
            model=CLAUDE_MODEL,
            system=system_message,
            messages=messages,
            max_tokens=256,
        )

        text = response.content[0].text

        # Safety check on output
        is_safe_resp, _ = check_safety(text)
        if not is_safe_resp:
            text = "Let's keep our practice focused! Can you try saying that differently?"

        return text, False

    except Exception as e:
        logging.error("Roleplay Claude API error: %s", e)
        return ROLEPLAY_DEMO_REPLIES.get(safe_role, "Great! Keep going!"), True
