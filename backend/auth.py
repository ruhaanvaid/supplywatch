"""Simple accounts: sign up, log in, log out, "who am I?".

- Users live in a small SQLite file (Python's built-in sqlite3): name, email,
  password HASH, created date. Never the password itself.
- Passwords are hashed with bcrypt: one-way, salted, and slow on purpose.
- After login the browser gets a SIGNED token in an HTTP-only cookie. "Signed"
  means the server can tell if anyone changed it; "HTTP-only" means page
  JavaScript can't read it. The signing key comes from the SESSION_SECRET env var.
A basic system for a competition project, not production-grade security.
"""
import os
import re
import sqlite3
import time
from datetime import date
from pathlib import Path

import bcrypt
from fastapi import APIRouter, HTTPException, Request, Response
from itsdangerous import BadSignature, URLSafeTimedSerializer
from pydantic import BaseModel

router = APIRouter(prefix="/api")
DB_PATH = Path(os.environ.get("USERS_DB", Path(__file__).parent / "users.db"))
COOKIE = "session"
SESSION_DAYS = 7
MAX_FAILS, FAIL_WINDOW = 5, 15 * 60          # 5 failed logins per email per 15 minutes
failed_logins = {}                            # email -> [times]; in memory, so it resets on restart
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row             # rows act like dicts: row["email"]
    conn.execute("""CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT NOT NULL,
                    email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created TEXT NOT NULL)""")
    return conn


def signer():
    # No default key on purpose: a key written in the code would let anyone forge logins.
    return URLSafeTimedSerializer(os.environ["SESSION_SECRET"], salt="session")


def start_session(response, user_id):
    response.set_cookie(COOKIE, signer().dumps(user_id), max_age=SESSION_DAYS * 86400, httponly=True,
                        samesite="lax", secure=os.environ.get("COOKIE_SECURE") == "1")


def current_user(request: Request):
    """The logged-in user as {"name", "email"}, or None."""
    try:
        user_id = signer().loads(request.cookies.get(COOKIE, ""), max_age=SESSION_DAYS * 86400)
    except BadSignature:                       # missing, edited, or expired cookie
        return None
    with db() as conn:
        row = conn.execute("SELECT name, email FROM users WHERE id = ?", (user_id,)).fetchone()
    return dict(row) if row else None


class SignupForm(BaseModel):
    name: str
    email: str
    password: str


class LoginForm(BaseModel):
    email: str
    password: str


@router.post("/signup")
def signup(form: SignupForm, response: Response):
    name, email = form.name.strip(), form.email.strip().lower()
    # Check again on the server: anyone can skip the browser's checks.
    if not name or not EMAIL_PATTERN.match(email) or not 8 <= len(form.password.encode()) <= 72:
        raise HTTPException(422, "Name, a valid email and a password of 8 to 72 characters are required.")
    password_hash = bcrypt.hashpw(form.password.encode(), bcrypt.gensalt()).decode()
    try:
        with db() as conn:
            cursor = conn.execute("INSERT INTO users (name, email, password_hash, created) VALUES (?, ?, ?, ?)",
                                  (name, email, password_hash, date.today().isoformat()))
    except sqlite3.IntegrityError:             # the UNIQUE rule on email
        raise HTTPException(409, "That email is already registered.")
    start_session(response, cursor.lastrowid)
    return {"name": name, "email": email}


@router.post("/login")
def login(form: LoginForm, response: Response):
    email = form.email.strip().lower()
    now = time.time()
    recent = [t for t in failed_logins.get(email, []) if now - t < FAIL_WINDOW]
    if len(recent) >= MAX_FAILS:
        raise HTTPException(429, "Too many failed tries. Wait 15 minutes.")
    with db() as conn:
        row = conn.execute("SELECT id, name, password_hash FROM users WHERE email = ?", (email,)).fetchone()
    password = form.password.encode()[:72]     # bcrypt only reads the first 72 bytes
    if row is None or not bcrypt.checkpw(password, row["password_hash"].encode()):
        failed_logins[email] = recent + [now]
        raise HTTPException(401, "Invalid email or password.")   # same message either way
    failed_logins.pop(email, None)
    start_session(response, row["id"])
    return {"name": row["name"], "email": email}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE)
    return {"ok": True}


@router.get("/me")
def me(request: Request):
    user = current_user(request)
    if user is None:
        raise HTTPException(401, "Not logged in.")
    return user
