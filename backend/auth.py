"""Simple accounts: sign up, log in, log out, "who am I?".

- Users live in one database table (see db.py: Postgres online, SQLite on a laptop): name, email,
  password HASH, created date. Never the password itself.
- Passwords are hashed with bcrypt: one-way, salted, and slow on purpose.
- After login the browser gets a SIGNED token in an HTTP-only cookie. "Signed"
  means the server can tell if anyone changed it; "HTTP-only" means page
  JavaScript can't read it. The signing key comes from the SESSION_SECRET env var.
- Sign-up also emails a "confirm your email" link (see verify.py and emails.py).
A basic system for a competition project, not production-grade security.
"""
import os
import re
import time
from datetime import date

import bcrypt
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, Response
from itsdangerous import BadSignature, URLSafeTimedSerializer
from pydantic import BaseModel

import db
import emails

router = APIRouter(prefix="/api")
COOKIE = "session"
SESSION_DAYS = 7
MAX_FAILS, FAIL_WINDOW = 5, 15 * 60          # 5 failed logins per email per 15 minutes
failed_logins = {}                            # email -> [times]; in memory, so it resets on restart
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


db.create_tables()                            # once, when the server starts


def signer(purpose="session"):
    # No default key on purpose: a key written in the code would let anyone forge logins.
    # The "salt" keeps the two token types apart: an email link can't be used as a login cookie.
    return URLSafeTimedSerializer(os.environ["SESSION_SECRET"], salt=purpose)


def site_url(request):
    """The site's public address, for links inside emails."""
    return os.environ.get("SITE_URL") or str(request.base_url).rstrip("/")


def verify_link(request, user_id, email):
    """The "confirm your email" link: a signed token holding the user's id and email."""
    return f"{site_url(request)}/api/verify?token={signer('verify-email').dumps({'id': user_id, 'email': email})}"


def start_session(response, user_id):
    response.set_cookie(COOKIE, signer().dumps(user_id), max_age=SESSION_DAYS * 86400, httponly=True,
                        samesite="lax", secure=os.environ.get("COOKIE_SECURE") == "1")


def current_user(request: Request):
    """The logged-in user as {"id", "name", "email", "verified"}, or None."""
    try:
        user_id = signer().loads(request.cookies.get(COOKIE, ""), max_age=SESSION_DAYS * 86400)
    except BadSignature:                       # missing, edited, or expired cookie
        return None
    row = db.run("SELECT id, name, email, verified FROM users WHERE id = ?", (user_id,))
    return {**dict(row), "verified": bool(row["verified"])} if row else None


class SignupForm(BaseModel):
    name: str
    email: str
    password: str


class LoginForm(BaseModel):
    email: str
    password: str


@router.post("/signup")
def signup(form: SignupForm, request: Request, response: Response, background: BackgroundTasks):
    name, email = form.name.strip(), form.email.strip().lower()
    # Check again on the server: anyone can skip the browser's checks.
    if not name or not EMAIL_PATTERN.match(email) or not 8 <= len(form.password.encode()) <= 72:
        raise HTTPException(422, "Name, a valid email and a password of 8 to 72 characters are required.")
    password_hash = bcrypt.hashpw(form.password.encode(), bcrypt.gensalt()).decode()
    try:
        new_user = db.run("INSERT INTO users (name, email, password_hash, created) VALUES (?, ?, ?, ?) RETURNING id",
                          (name, email, password_hash, date.today().isoformat()))
    except db.DUPLICATE:                       # the UNIQUE rule on email
        raise HTTPException(409, "That email is already registered.")
    start_session(response, new_user["id"])
    # Send the "confirm your email" email AFTER answering, so sign-up stays fast.
    background.add_task(emails.send_verification, email, name, verify_link(request, new_user["id"], email))
    return {"name": name, "email": email, "verified": False}


@router.post("/login")
def login(form: LoginForm, response: Response):
    email = form.email.strip().lower()
    now = time.time()
    recent = [t for t in failed_logins.get(email, []) if now - t < FAIL_WINDOW]
    if len(recent) >= MAX_FAILS:
        raise HTTPException(429, "Too many failed tries. Wait 15 minutes.")
    row = db.run("SELECT id, name, password_hash, verified FROM users WHERE email = ?", (email,))
    password = form.password.encode()[:72]     # bcrypt only reads the first 72 bytes
    if row is None or not bcrypt.checkpw(password, row["password_hash"].encode()):
        failed_logins[email] = recent + [now]
        raise HTTPException(401, "Invalid email or password.")   # same message either way
    failed_logins.pop(email, None)
    start_session(response, row["id"])
    return {"name": row["name"], "email": email, "verified": bool(row["verified"])}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE)
    return {"ok": True}


@router.get("/me")
def me(request: Request):
    user = current_user(request)
    if user is None:
        raise HTTPException(401, "Not logged in.")
    return {"name": user["name"], "email": user["email"], "verified": user["verified"]}
