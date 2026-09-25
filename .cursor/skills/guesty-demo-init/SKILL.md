---
name: guesty-demo-init
description: >-
  Creates a Guesty for Pro demo account via the Admin signup API (demo-init CLI),
  then prompts for the new account Open API client ID/secret and runs the cloner.
  Core (clone-from) credentials come from .env; bearer tokens are cached under the
  hood for 12 hours. Use when creating, registering, or initializing a Guesty Pro
  / EMEA demo account, or preparing a future Slack slash command.
---

# Guesty demo-init

Create a **Guesty for Pro** demo account through
`POST https://admin.guesty.com/api/admin/accounts/signup`, then clone
listings/reservations via `cloner.js`.

## Prerequisites

1. Repo with `npm install`.
2. `.env` has **Core** Open API credentials:
   - `CORE_CLIENT_ID`
   - `CORE_CLIENT_SECRET`
3. Chrome logged into Guesty Admin (Okta) + **Allow JavaScript from Apple Events**.
4. CLI: `demo-init` on PATH or `npm run demo-init`.

## Required inputs

| Order | Field | Notes |
|---|---|---|
| 1–6 | Company + profile | name, address, zip, first, last, email |
| 7 | Show full API response? | Default **n** |
| 8 | New account client ID | Open API app on the new account |
| 9 | New account client secret | |

**Not prompted:** Core credentials (`.env`), phone/`INDIVIDUAL`/vat/`IL`/`Tel Aviv-Yafo`.

After check-email: user must verify email and create an Open API app on the new
account before pasting client ID/secret.

## Auth model (cloner)

- **Core:** `CORE_CLIENT_ID` / `CORE_CLIENT_SECRET` from `.env` always.
- **Demo:** prompted client ID/secret (or `.env` for standalone cloner).
- Bearer tokens fetched via Guesty OAuth `client_credentials`, cached locally
  (`.token_cache_*.json`) and reused for up to **12 hours**.

## How to run

```bash
demo-init
```

Piped (agent-assisted):

```bash
printf '%s\n' \
  "$COMPANY_NAME" "$COMPANY_ADDRESS" "$ZIP_CODE" \
  "$FIRST_NAME" "$LAST_NAME" "$EMAIL" \
  "n" \
  "$DEMO_CLIENT_ID" "$DEMO_CLIENT_SECRET" | demo-init
```

## Success

- Signup `200`/`201` → check-email message → cloner →  
  `✅ demo-init completed — account created and cloner finished.`
- Do not dump full signup JSON unless asked / `--verbose`.

## Agent checklist

```
- [ ] CORE_* present in .env
- [ ] Chrome Okta + Apple Events
- [ ] Signup fields collected
- [ ] Check-email reminder shown
- [ ] New account client ID + secret collected
- [ ] Cloner finished / error reported
```
