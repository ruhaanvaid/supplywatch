"""Email confirmation: the link in the email, and "send it again".

Flow: sign-up (auth.py) emails a link like /api/verify?token=... The token is
signed with SESSION_SECRET, so nobody can make one up, and it expires after
2 days. Opening it marks the account as verified and sends the welcome email.
Unverified users can still use the dashboard; they just see a reminder banner.
"""
import time

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from fastapi.responses import RedirectResponse
from itsdangerous import BadSignature

import auth
import db
import emails

router = APIRouter(prefix="/api")
LINK_DAYS = 2
RESEND_WAIT = 60          # seconds between "send it again" clicks, per user
last_resend = {}          # user id -> time of the last resend (in memory)


@router.get("/verify")
def verify(token: str, request: Request, background: BackgroundTasks):
    """Opened from the email. Marks the account verified, then sends you to the app
    (or to log-in, if this browser isn't logged in) with a message to show."""
    logged_in = auth.current_user(request) is not None
    page = "/app" if logged_in else "/login"
    try:
        data = auth.signer("verify-email").loads(token, max_age=LINK_DAYS * 86400)
    except BadSignature:                              # edited, made up, or older than 2 days
        return RedirectResponse(f"{page}?verify_error=1")
    row = db.run("SELECT name, email, verified FROM users WHERE id = ? AND email = ?", (data["id"], data["email"]))
    if row is None:                                   # account no longer exists
        return RedirectResponse(f"{page}?verify_error=1")
    if not row["verified"]:                           # first time only: no second welcome email
        db.run("UPDATE users SET verified = 1 WHERE id = ?", (data["id"],))
        background.add_task(emails.send_welcome, row["email"], row["name"], f"{auth.site_url(request)}/app")
    return RedirectResponse(f"{page}?verified=1")


@router.post("/resend-verification")
def resend(request: Request, background: BackgroundTasks):
    user = auth.current_user(request)
    if user is None:
        raise HTTPException(401, "Not logged in.")
    if user["verified"]:
        raise HTTPException(400, "Your email is already confirmed.")
    if time.time() - last_resend.get(user["id"], 0) < RESEND_WAIT:
        raise HTTPException(429, "Please wait a minute before asking for another email.")
    last_resend[user["id"]] = time.time()
    background.add_task(emails.send_verification, user["email"], user["name"],
                        auth.verify_link(request, user["id"], user["email"]))
    return {"ok": True}
