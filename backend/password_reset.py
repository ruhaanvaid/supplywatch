"""Forgot password: email a reset link, then let the person choose a new password.

1. POST /api/forgot-password {email}: if that email has an account, we email a link
   to /reset-password?token=... We give the SAME answer whether or not the account
   exists, so this form can't be used to find out who has an account.
2. POST /api/reset-password {token, password}: checks the token, saves the new
   password's bcrypt hash, and logs you in.

The token is signed (can't be made up), expires after 1 hour, and contains a
fingerprint of the CURRENT password hash. Once the password changes, the
fingerprint no longer matches, so each link works only once.
Resetting through the email link also proves you own the email, so the account
counts as confirmed.
"""
import hashlib
import time

import bcrypt
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, Response
from itsdangerous import BadSignature
from pydantic import BaseModel

import auth
import db
import emails

router = APIRouter(prefix="/api")
LINK_MINUTES = 60
REQUEST_WAIT = 60          # seconds between reset emails for the same address
last_request = {}          # email -> time of the last reset email (in memory)


def fingerprint(password_hash):
    """A short, one-way summary of the stored password hash (never the hash itself)."""
    return hashlib.sha256(password_hash.encode()).hexdigest()[:16]


class ForgotForm(BaseModel):
    email: str


class ResetForm(BaseModel):
    token: str
    password: str


@router.post("/forgot-password")
def forgot_password(form: ForgotForm, request: Request, background: BackgroundTasks):
    email = form.email.strip().lower()
    row = db.run("SELECT id, name, password_hash FROM users WHERE email = ?", (email,))
    if row and time.time() - last_request.get(email, 0) >= REQUEST_WAIT:
        last_request[email] = time.time()
        token = auth.signer("reset-password").dumps({"id": row["id"], "fp": fingerprint(row["password_hash"])})
        link = f"{auth.site_url(request)}/reset-password?token={token}"
        background.add_task(emails.send_password_reset, email, row["name"], link)
    # Same answer every time: it never reveals whether the email has an account.
    return {"message": "If that email has an account, we've sent a link to reset the password."}


@router.post("/reset-password")
def reset_password(form: ResetForm, response: Response):
    if not 8 <= len(form.password.encode()) <= 72:
        raise HTTPException(422, "Your new password needs 8 to 72 characters.")
    expired = HTTPException(400, "This reset link has expired or was already used. Please ask for a new one.")
    try:
        data = auth.signer("reset-password").loads(form.token, max_age=LINK_MINUTES * 60)
    except BadSignature:
        raise expired
    row = db.run("SELECT id, name, email, password_hash FROM users WHERE id = ?", (data["id"],))
    if row is None or fingerprint(row["password_hash"]) != data["fp"]:   # password already changed
        raise expired
    new_hash = bcrypt.hashpw(form.password.encode(), bcrypt.gensalt()).decode()
    db.run("UPDATE users SET password_hash = ?, verified = 1 WHERE id = ?", (new_hash, row["id"]))
    auth.failed_logins.pop(row["email"], None)          # clear any "too many tries" lock
    auth.start_session(response, row["id"])
    return {"name": row["name"], "email": row["email"], "verified": True}
