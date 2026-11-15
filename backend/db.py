"""Where user accounts are stored.

- On the live site: a Postgres database (a separate database server), given by the
  DATABASE_URL environment variable. It lives outside our web server, so accounts
  survive restarts. (Render's free web server wipes its own disk on every restart.)
- On a laptop (no DATABASE_URL): a small SQLite file, backend/users.db, so nothing
  needs installing.
Both speak SQL. The only differences we hit are handled here, so auth.py and
verify.py don't care which one is in use.
"""
import os
import sqlite3
from pathlib import Path

import psycopg
from psycopg.rows import dict_row

DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
SQLITE_PATH = Path(os.environ.get("USERS_DB", Path(__file__).parent / "users.db"))

# "That email is already registered": each database reports it with its own error type.
DUPLICATE = (sqlite3.IntegrityError, psycopg.errors.UniqueViolation)


def connect():
    if DATABASE_URL:
        return psycopg.connect(DATABASE_URL, row_factory=dict_row)   # rows come back as dicts
    conn = sqlite3.connect(SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def run(sql, params=()):
    """Run one SQL statement and return its first row as a dict (or None).
    Write SQL with ? for values; Postgres wants %s, so we swap them. Values are
    always passed separately from the SQL, which prevents SQL injection."""
    conn = connect()
    try:
        cursor = conn.execute(sql.replace("?", "%s") if DATABASE_URL else sql, params)
        row = cursor.fetchone() if cursor.description else None   # only SELECT/RETURNING give rows
        conn.commit()
        return dict(row) if row else None
    finally:
        conn.close()


def create_tables():
    """Make the users table if it isn't there yet. Postgres and SQLite spell
    'a number that counts up by itself' differently; the rest is identical."""
    id_column = "SERIAL PRIMARY KEY" if DATABASE_URL else "INTEGER PRIMARY KEY"
    run(f"""CREATE TABLE IF NOT EXISTS users (id {id_column}, name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created TEXT NOT NULL,
            verified INTEGER NOT NULL DEFAULT 0)""")
