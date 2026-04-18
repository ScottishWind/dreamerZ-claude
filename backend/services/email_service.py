"""Email service — sends transactional emails via Resend API."""

import json
import logging
import os

logger = logging.getLogger(__name__)

# ── Config (from environment) ────────────────────────────────
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
SENDER_NAME = os.environ.get("SENDER_NAME", "DreamerZ")

RESEND_API_URL = "https://api.resend.com/emails"


def _is_configured() -> bool:
    """Check if Resend API key is present."""
    return bool(RESEND_API_KEY)


def _send_with_requests(to_email: str, subject: str, html_body: str) -> bool:
    """Send email using the requests library (preferred)."""
    import requests

    resp = requests.post(
        RESEND_API_URL,
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "from": f"{SENDER_NAME} <{SENDER_EMAIL}>",
            "to": [to_email],
            "subject": subject,
            "html": html_body,
        },
        timeout=10,
    )

    if resp.ok:
        result = resp.json()
        logger.info("Email sent to %s — id: %s", to_email, result.get("id"))
        return True
    else:
        logger.error("Resend API error %s sending to %s: %s", resp.status_code, to_email, resp.text)
        return False


def _send_with_urllib(to_email: str, subject: str, html_body: str) -> bool:
    """Fallback: send email using urllib (no extra dependencies)."""
    from urllib.request import Request, urlopen
    from urllib.error import URLError, HTTPError

    payload = {
        "from": f"{SENDER_NAME} <{SENDER_EMAIL}>",
        "to": [to_email],
        "subject": subject,
        "html": html_body,
    }

    data = json.dumps(payload).encode("utf-8")
    req = Request(
        RESEND_API_URL,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "User-Agent": "DreamerZ-Backend/1.0",
            "Accept": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            logger.info("Email sent to %s — id: %s", to_email, result.get("id"))
            return True
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        logger.error("Resend API error %s sending to %s: %s", exc.code, to_email, body)
        return False
    except URLError as exc:
        logger.error("Network error sending email to %s: %s", to_email, exc.reason)
        return False


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send an HTML email via Resend API. Returns True on success, False on failure."""
    if not _is_configured():
        logger.warning(
            "Email not configured (RESEND_API_KEY missing). Skipping email to %s",
            to_email,
        )
        return False

    # Prefer requests library (handles Cloudflare better), fallback to urllib
    try:
        return _send_with_requests(to_email, subject, html_body)
    except ImportError:
        logger.debug("requests library not available, using urllib fallback")
        return _send_with_urllib(to_email, subject, html_body)
    except Exception as exc:
        logger.error("Unexpected error sending email to %s: %s", to_email, exc)
        return False


def build_welcome_email(username: str) -> str:
    """Build a beautiful HTML welcome email for a new DreamerZ user."""
    return f"""\
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to DreamerZ</title>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9; padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%;">

          <!-- HEADER -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6366f1 100%); border-radius:20px 20px 0 0; padding:40px 40px 30px; text-align:center;">
              <div style="display:inline-block; background:rgba(255,255,255,0.2); border-radius:16px; padding:12px 16px; margin-bottom:20px;">
                <span style="font-size:28px;">📚</span>
              </div>
              <h1 style="color:#ffffff; font-size:28px; font-weight:800; margin:0 0 8px; letter-spacing:-0.5px;">
                Welcome to DreamerZ!
              </h1>
              <p style="color:rgba(255,255,255,0.85); font-size:16px; margin:0; line-height:1.5;">
                Your AI & English learning journey starts now
              </p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background-color:#ffffff; padding:40px;">

              <!-- Greeting -->
              <p style="color:#1e293b; font-size:18px; font-weight:600; margin:0 0 8px;">
                Hey {username} 👋
              </p>
              <p style="color:#475569; font-size:15px; line-height:1.7; margin:0 0 28px;">
                We're thrilled to have you on board! DreamerZ is built especially for Indian teenagers who want to master AI tools and spoken English. Here's how to get started:
              </p>

              <!-- STEP 1 -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                <tr>
                  <td width="52" valign="top">
                    <div style="width:44px; height:44px; background:linear-gradient(135deg, #4f46e5, #7c3aed); border-radius:12px; text-align:center; line-height:44px; color:#fff; font-weight:700; font-size:16px;">1</div>
                  </td>
                  <td style="padding-left:12px;">
                    <p style="color:#1e293b; font-size:15px; font-weight:600; margin:0 0 4px;">Explore the Learning Hub</p>
                    <p style="color:#64748b; font-size:14px; margin:0; line-height:1.6;">Browse AI tools like ChatGPT, Claude, and Gemini — or jump into our 30-day Spoken English course.</p>
                  </td>
                </tr>
              </table>

              <!-- STEP 2 -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                <tr>
                  <td width="52" valign="top">
                    <div style="width:44px; height:44px; background:linear-gradient(135deg, #f43f5e, #ec4899); border-radius:12px; text-align:center; line-height:44px; color:#fff; font-weight:700; font-size:16px;">2</div>
                  </td>
                  <td style="padding-left:12px;">
                    <p style="color:#1e293b; font-size:15px; font-weight:600; margin:0 0 4px;">Complete Modules & Earn XP</p>
                    <p style="color:#64748b; font-size:14px; margin:0; line-height:1.6;">Each module has interactive lessons and quizzes. Earn XP, build streaks, and track your progress.</p>
                  </td>
                </tr>
              </table>

              <!-- STEP 3 -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td width="52" valign="top">
                    <div style="width:44px; height:44px; background:linear-gradient(135deg, #f59e0b, #f97316); border-radius:12px; text-align:center; line-height:44px; color:#fff; font-weight:700; font-size:16px;">3</div>
                  </td>
                  <td style="padding-left:12px;">
                    <p style="color:#1e293b; font-size:15px; font-weight:600; margin:0 0 4px;">Try the Prompt Lab</p>
                    <p style="color:#64748b; font-size:14px; margin:0; line-height:1.6;">Practice writing better AI prompts. See how adding context and constraints transforms AI responses!</p>
                  </td>
                </tr>
              </table>

              <!-- CTA BUTTON -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:4px 0 28px;">
                    <a href="https://dreamerz.onrender.com/learn" target="_blank"
                       style="display:inline-block; background:linear-gradient(135deg, #4f46e5, #7c3aed); color:#ffffff; text-decoration:none; font-weight:700; font-size:16px; padding:14px 36px; border-radius:14px; letter-spacing:0.3px;">
                      Start Learning Now &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- DIVIDER -->
              <hr style="border:none; border-top:1px solid #e2e8f0; margin:0 0 24px;" />

              <!-- COURSE CARDS -->
              <p style="color:#1e293b; font-size:15px; font-weight:600; margin:0 0 16px;">Your courses are waiting:</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
                <tr>
                  <td style="background:linear-gradient(135deg, #eef2ff, #ede9fe); border:1px solid #c7d2fe; border-radius:14px; padding:18px 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="42" valign="top">
                          <span style="font-size:28px;">🤖</span>
                        </td>
                        <td style="padding-left:10px;">
                          <p style="color:#3730a3; font-size:14px; font-weight:700; margin:0 0 3px;">AI Learning</p>
                          <p style="color:#6366f1; font-size:13px; margin:0;">5 tools &middot; 18+ modules &middot; ChatGPT, Claude, Gemini &amp; more</p>
                        </td>
                        <td width="60" align="right" valign="middle">
                          <span style="background:#4f46e5; color:#fff; font-size:12px; font-weight:700; padding:4px 10px; border-radius:8px;">&#8377;199</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:linear-gradient(135deg, #fff1f2, #fce7f3); border:1px solid #fecdd3; border-radius:14px; padding:18px 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="42" valign="top">
                          <span style="font-size:28px;">🗣️</span>
                        </td>
                        <td style="padding-left:10px;">
                          <p style="color:#9f1239; font-size:14px; font-weight:700; margin:0 0 3px;">Spoken English</p>
                          <p style="color:#f43f5e; font-size:13px; margin:0;">30-day journey &middot; AI roleplay &middot; Bengali meanings</p>
                        </td>
                        <td width="60" align="right" valign="middle">
                          <span style="background:#f43f5e; color:#fff; font-size:12px; font-weight:700; padding:4px 10px; border-radius:8px;">&#8377;299</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CLOSING -->
              <p style="color:#475569; font-size:14px; line-height:1.7; margin:0;">
                If you have any questions or need help, just reply to this email. We're here for you!
              </p>
              <p style="color:#475569; font-size:14px; line-height:1.7; margin:16px 0 0;">
                Happy learning,<br/>
                <strong style="color:#1e293b;">The DreamerZ Team</strong> 💜
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#1e293b; border-radius:0 0 20px 20px; padding:28px 40px; text-align:center;">
              <p style="color:#94a3b8; font-size:13px; margin:0 0 8px;">
                <a href="https://dreamerz.onrender.com/learn" style="color:#818cf8; text-decoration:none; font-weight:600;">Courses</a>
                &nbsp;&middot;&nbsp;
                <a href="https://dreamerz.onrender.com/parents" style="color:#818cf8; text-decoration:none; font-weight:600;">For Parents</a>
                &nbsp;&middot;&nbsp;
                <a href="https://dreamerz.onrender.com/account" style="color:#818cf8; text-decoration:none; font-weight:600;">My Account</a>
              </p>
              <p style="color:#64748b; font-size:12px; margin:0;">
                &copy; 2026 DreamerZ. Made with ❤️ for teen learners in India.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def send_welcome_email(to_email: str, username: str) -> bool:
    """Send the welcome email to a newly registered user."""
    html = build_welcome_email(username)
    return send_email(
        to_email=to_email,
        subject=f"Welcome to DreamerZ, {username}! 🎉 Your learning journey starts now",
        html_body=html,
    )
