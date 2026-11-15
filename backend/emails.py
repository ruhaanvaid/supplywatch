"""Sending the two account emails: "confirm your email" and "welcome".

How it sends: through Brevo's email API over normal HTTPS. (Render's free plan
blocks the usual email ports, SMTP 25/465/587, so a web API is the only way.)
It needs two environment variables, never written in the code:
  BREVO_API_KEY  - the key from your Brevo account
  MAIL_FROM      - the sender address you confirmed in Brevo
Without them (e.g. on your laptop), the email is printed to the server log
instead, so sign-up still works and you can copy the link from the terminal.
"""
import os

import httpx

BREVO_URL = "https://api.brevo.com/v3/smtp/email"


def send_email(to_email, to_name, subject, text):
    """Send one plain-text email. Returns True if it was handed to Brevo."""
    # .strip() removes spaces or a line break that sneak in when a value is pasted.
    api_key = os.environ.get("BREVO_API_KEY", "").strip()
    sender = os.environ.get("MAIL_FROM", "").strip()
    if not api_key or not sender:
        print(f"\n--- EMAIL (not sent: BREVO_API_KEY/MAIL_FROM not set) ---\n"
              f"To: {to_name} <{to_email}>\nSubject: {subject}\n\n{text}\n--- END EMAIL ---\n", flush=True)
        return False
    try:
        response = httpx.post(BREVO_URL, timeout=15, headers={"api-key": api_key}, json={
            "sender": {"name": "SupplyWatch", "email": sender},
            "to": [{"email": to_email, "name": to_name}],
            "subject": subject,
            "textContent": text,
        })
    except httpx.HTTPError as error:   # never crash sign-up because an email failed
        # Only the error's TYPE: its full message can contain the API key, and secrets
        # must never end up in a log.
        print(f"Email to {to_email} failed: could not reach Brevo ({type(error).__name__})", flush=True)
        return False
    if response.status_code >= 400:   # Brevo answered "no": its reply says why (it never contains the key)
        print(f"Email to {to_email} failed: Brevo said {response.status_code} {response.text[:300]}", flush=True)
        return False
    return True


def send_verification(to_email, name, link):
    send_email(to_email, name, "Confirm your email for SupplyWatch", f"""Hi {name},

Thanks for signing up for SupplyWatch. Please confirm this is your email address
by opening this link (it works for 2 days):

{link}

If you didn't sign up, you can ignore this email.

- SupplyWatch
""")


def send_welcome(to_email, name, app_link):
    send_email(to_email, name, "Welcome to SupplyWatch", f"""Hi {name},

Your email is confirmed. Welcome to SupplyWatch!

Here's how to use it:
- Open your dashboard: {app_link}
- "Unusual right now" lists any food with a Medium or High shortage risk.
  If nothing is listed, every food we track looks normal today.
- Search any food to see its 0-100 risk score and what's behind it.
- High = act now and line up other suppliers. Medium = keep an eye on it.
  Low = nothing to do.
- Each food's page lists real alternate suppliers and substitute foods.

SupplyWatch is an early warning aid, not a forecast: use the scores as a
reason to look closer, together with your own knowledge of your suppliers.

- SupplyWatch
""")
