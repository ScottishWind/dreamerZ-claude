"""
One-time script to send a test welcome email via Resend.
Run from the project root:
    pip install requests    (if not already installed)
    python send_test_email.py
"""
import os
import sys

# Set the env vars for this test run
os.environ["RESEND_API_KEY"] = os.environ.get("RESEND_API_KEY", "YOUR_RESEND_API_KEY_HERE")
os.environ["SENDER_EMAIL"] = "onboarding@resend.dev"

# Add backend to path so we can import the service
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from services.email_service import send_welcome_email

if __name__ == "__main__":
    # Ensure requests is installed
    try:
        import requests
    except ImportError:
        print("Installing requests library...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])

    print("Sending test welcome email to purnendu.ju01@gmail.com ...")
    result = send_welcome_email("purnendu.ju01@gmail.com", "Purnendu")
    if result:
        print("✅ Email sent successfully! Check your inbox (and spam folder).")
    else:
        print("❌ Failed to send. Check the error above.")
