---
name: guesty-demo-init
description: >-
  Creates a Guesty for Pro demo account via the Admin signup API (demo-init CLI),
  then prompts for clone-from and new-account Open API bearer tokens and runs the
  cloner. Use when the user asks to create, register, spin up, or initialize a
  Guesty Pro / EMEA demo account, run demo-init, or prepare signup for a future
  Slack slash command.
---

# Guesty demo-init

Create a **Guesty for Pro** demo account through
`POST https://admin.guesty.com/api/admin/accounts/signup` using the local
`demo-init` CLI, then clone listings/reservations into that account via `cloner.js`.

## When to use

- User wants a new demo / Pro registration account (optionally with cloned data)
- User says `demo-init`, “initialize demo”, “create Pro account”, “signup via admin”
- Planning a Slack `/demo-init` (or similar) that wraps the same flow

## Prerequisites

1. Repo: `/Users/nate.foster/Documents/DEMO_SET_UP` (`npm install` once).
2. CLI on PATH: `demo-init` → `~/.local/bin/demo-init` (or `npm run demo-init` in repo).
3. **Google Chrome** open and logged into Guesty Admin (Okta).
4. Chrome setting enabled: **View → Developer → Allow JavaScript from Apple Events**.

Signup auth is the employee Okta token from the open Chrome tab — not Open API
`CLIENT_ID` / `CLIENT_SECRET`. Cloning uses separate **Open API bearer tokens**
the user pastes after signup.

## Required inputs

| Prompt order | Field | Notes |
|---|---|---|
| 1 | Company name | → `companyInformation.name` |
| 2 | Company address | Free text OK (Google Places is UI-only) |
| 3 | Zip code | |
| 4 | First name | Account owner profile |
| 5 | Last name | |
| 6 | Email | Verification email is sent here |
| 7 | Show full API response? | Default **n** (or use `--verbose`) |
| 8 | Clone-from account bearer token | Open API token for source / Core |
| 9 | New account bearer token | Open API token for the just-created demo |

**Not prompted (fixed today):**

- `phone`: `""` (optional in Admin UI)
- `businessType`: `INDIVIDUAL`
- `vatNum`: `""`
- `country`: `IL`
- `city`: `Tel Aviv-Yafo`

If the real company is outside IL/Tel Aviv, warn that hardcoded geo may be wrong
for tax, and offer to update the script before signup.

After the check-email message, remind the user to **verify email** and create Open
API credentials on the new account before pasting the destination bearer token.

## How to run

### Interactive (preferred for local humans)

```bash
demo-init
```

Optional: `demo-init --verbose` (or `-v`) to always print the full signup API JSON.

### Agent-assisted (non-interactive pipe)

```bash
printf '%s\n' \
  "$COMPANY_NAME" \
  "$COMPANY_ADDRESS" \
  "$ZIP_CODE" \
  "$FIRST_NAME" \
  "$LAST_NAME" \
  "$EMAIL" \
  "n" \
  "$CLONE_FROM_BEARER" \
  "$CLONE_TO_BEARER" | demo-init
```

Dry-run Admin auth only (no account created, no cloner):

```bash
node dry-run-auth.js
```

Standalone cloner with bearer tokens:

```bash
CORE_BEARER_TOKEN=... DEMO_BEARER_TOKEN=... node cloner.js
```

## Success / failure

- **Signup success:** HTTP `200` or `201`. Remind user to check email to finalise setup.
- Do **not** dump the full signup body unless asked / `--verbose` / yes at prompt.
- **Then** collect the two Open API bearer tokens and run `cloner.js` (stdio inherited).
- **Auth failures (signup):** Chrome / Apple Events — surface CLI error; do not invent tokens.
- **Auth failures (cloner):** invalid/expired Open API tokens — surface cloner exit error.
- **False failure trap:** `201 Created` is signup success (already handled in CLI).

## Slack slash command (future)

1. Collect the six signup fields **plus** clone-from / clone-to bearer tokens (or equivalent).
2. Reuse signup body + success copy; then invoke cloner with those tokens.
3. **Do not** use Chrome AppleScript in Slack for Admin auth.
4. Until Slack auth exists, local `demo-init` remains the supported runner.

## Agent checklist

```
- [ ] Prerequisites confirmed (Chrome Okta + Apple Events)
- [ ] Six signup fields collected
- [ ] Ran demo-init through signup success + check-email message
- [ ] Reminded user to verify email / obtain new-account Open API token
- [ ] Clone-from + new-account bearer tokens collected
- [ ] Cloner completed (or error reported)
```
