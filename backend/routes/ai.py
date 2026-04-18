"""AI routes — chat and roleplay endpoints."""

from typing import Optional

from fastapi import APIRouter, Header, Request

from models.content import AIRequest, AIResponse, RoleplayMessage
from services.ai_service import check_safety, get_ai_response, get_roleplay_response
from middleware.rate_limit import check_api_rate_limit

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("", response_model=AIResponse)
async def ai_chat(request: Request, ai_request: AIRequest):
    """AI chat endpoint with safety filters and rate limiting."""
    # Rate limit
    client_ip = request.client.host if request.client else "unknown"
    check_api_rate_limit(client_ip)

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
        ai_request.prompt, ai_request.context, ai_request.mode
    )

    # Safety check on output
    is_safe, _ = check_safety(response)
    if not is_safe:
        response = (
            "I generated a response but it didn't pass our safety checks. "
            "Let me try again with a different approach. Could you rephrase your question?"
        )

    return AIResponse(response=response, is_demo=is_demo)


@router.post("/roleplay")
async def ai_roleplay(
    payload: RoleplayMessage,
    authorization: Optional[str] = Header(None),
):
    """Roleplay chat endpoint for English practice."""
    response, is_demo = await get_roleplay_response(
        payload.role, payload.user_message, payload.history
    )
    return {"response": response, "is_demo": is_demo}
