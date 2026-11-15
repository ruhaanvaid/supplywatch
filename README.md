# SupplyWatch

Free early warning for food shortages, for food banks and small food businesses.
SupplyWatch watches free public data (prices, news, drought maps, shipping strain),
gives each of 33 foods a 0–100 shortage-risk score, explains it in plain English,
and suggests real alternate suppliers and substitutes.

Live site: https://supplywatch-ys1u.onrender.com
(the free server sleeps when idle, so the first visit can take up to a minute).

## Pages

| Address | What it is |
|---|---|
| `/` | Landing page |
| `/signup`, `/login` | Create a free account, log in |
| `/app` | The dashboard (needs a login) |
| `/app?demo=1` | The dashboard with sample data, no account needed (badged DEMO) |

## Run it on your computer

```bash
./start.sh
```

Then open http://localhost:5173. The first run installs everything. No API key is
needed: the app uses saved real data and saved AI outputs. `start.sh` makes a random
`SESSION_SECRET` (the key that signs login cookies) if you haven't set one.

Tests: `cd backend && .venv/bin/python -m pytest`

How every file works, the data sources, and judge Q&A are in [EXPLAIN.md](EXPLAIN.md).

## Accounts: honest limits

This is a **basic account system for a competition project, not production-grade
security**. Passwords are hashed with bcrypt (never stored as text), the login cookie is
signed and HTTP-only, the signing key comes from an environment variable, and logins
are rate-limited. But:

- **On Render's free plan, accounts are erased whenever the site redeploys or restarts**,
  because the server's disk is temporary. Use "Try the demo" to see the app without an account.
- The failed-login limit is kept in memory and resets on restart.
- Logging out removes the cookie from the browser, but the server doesn't keep a list of
  cancelled sessions, so a copied cookie would work until it expires (7 days).

### Future work
- Password reset ("forgot password")
- Email verification
- Social login (Google, etc.)
- Changing your name, email or password, and deleting your account
- A permanent database (a hosted database or a paid persistent disk) so accounts survive redeploys
- A scheduled daily data refresh

## Scoring limits

Scores are an early-warning aid, not a forecast. The weights are reasoned, not fitted
to data, and the replay test covers one past shortage. See "Limitations and honest
caveats" in [EXPLAIN.md](EXPLAIN.md).
