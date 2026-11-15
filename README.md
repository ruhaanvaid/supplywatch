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

## Emails (confirm your email + welcome)

After sign-up, SupplyWatch emails a "confirm your email" link. Opening it confirms the
account and sends a welcome email. Emails go through [Brevo](https://www.brevo.com)'s
web API, because Render's free plan blocks the normal email ports (SMTP).

To turn sending on, add two environment variables (in Render: the service's
**Environment** page; locally: `export` them before `./start.sh`):

| Variable | What to put |
|---|---|
| `BREVO_API_KEY` | An API key from Brevo (Settings → SMTP & API → API keys) |
| `MAIL_FROM` | The sender address you confirmed in Brevo (Settings → Senders) |

Without them, nothing is sent: each email is printed in the server's log instead, so
sign-up still works and you can copy the link from there.

**Two Brevo settings that block sending until you change them:**
- **Confirm the sender** (Brevo → Senders): `MAIL_FROM` must be an address you confirmed there.
- **Authorised IPs** (https://app.brevo.com/security/authorised_ips): Brevo blocks API calls
  from computers it hasn't seen. Render's free plan sends from shared, changing addresses
  (`74.220.48.0/24` and `74.220.56.0/24`), so turn IP blocking off, or add those ranges.

If emails don't arrive, check the server log: a failed email prints Brevo's reason
(never the key).

## Accounts: honest limits

This is a **basic account system for a competition project, not production-grade
security**. Passwords are hashed with bcrypt (never stored as text), the login cookie is
signed and HTTP-only, the signing key comes from an environment variable, and logins
are rate-limited. But:

- **Accounts are stored in a free Render Postgres database, which expires 30 days after it was
  created** (Render then gives 14 days to upgrade, about $6/month, before deleting it). Free
  databases have no backups. To keep accounts longer, upgrade it or move to another Postgres
  (for example Neon's free plan) by changing `DATABASE_URL`.
- The failed-login limit is kept in memory and resets on restart.
- Unconfirmed accounts can still use the dashboard (they see a reminder). Emails sent from a
  free address (like Gmail) through Brevo may land in spam; a domain of your own fixes that.
- Logging out removes the cookie from the browser, but the server doesn't keep a list of
  cancelled sessions, so a copied cookie would work until it expires (7 days).

### Future work
- Password reset ("forgot password")
- Social login (Google, etc.)
- Changing your name, email or password, and deleting your account
- A database that doesn't expire (see above), with backups
- A scheduled daily data refresh

## Scoring limits

Scores are an early-warning aid, not a forecast. The weights are reasoned, not fitted
to data, and the replay test covers one past shortage. See "Limitations and honest
caveats" in [EXPLAIN.md](EXPLAIN.md).
