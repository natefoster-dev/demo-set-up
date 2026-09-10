---
name: guesty-demo-init
description: >-
  Creates a Guesty for Pro demo account via the Admin signup API (demo-init CLI).
  Collects company + profile details, uses the operator's open Chrome Okta session
  for auth, and reminds the user to verify email. Use when the user asks to create,
  register, spin up, or initialize a Guesty Pro / EMEA demo account, run demo-init,
  or prepare signup for a future Slack slash command.
---

# Guesty demo-init

Create a **Guesty for Pro** demo account through
`POST https://admin.guesty.com/api/admin/accounts/signup` using the local
`demo-init` CLI in this repo (`DEMO_SET_UP`).

## When to use

- User wants a new demo / Pro registration account
- User says `demo-init`, “initialize demo”, “create Pro account”, “signup via admin”
- Planning a Slack `/demo-init` (or similar) that wraps the same flow

## Prerequisites

1. Repo: `/Users/nate.foster/Documents/DEMO_SET_UP` (`npm install` once).
2. CLI on PATH: `demo-init` → `~/.local/bin/demo-init` (or `npm run demo-init` in repo).
3. **Google Chrome** open and logged into Guesty Admin (Okta).
4. Chrome setting enabled: **View → Developer → Allow JavaScript from Apple Events**.

Auth is the employee Okta token from the open Chrome tab — not Open API
`CLIENT_ID` / `CLIENT_SECRET`. VPN alone does not mint the token.

## Required inputs

Collect all of these before running (or pass through interactive prompts):

| Prompt order | Field | Notes |
|---|---|---|
| 1 | Company name | → `companyInformation.name` |
| 2 | Company address | Free text OK (Google Places is UI-only) |
| 3 | Zip code | |
| 4 | First name | Account owner profile |
| 5 | Last name | |
| 6 | Email | Verification email is sent here |

**Not prompted (fixed today):**

- `phone`: `""` (optional in Admin UI)
- `businessType`: `INDIVIDUAL`
- `vatNum`: `""`
- `country`: `IL`
- `city`: `Tel Aviv-Yafo`

If the real company is outside IL/Tel Aviv, warn that hardcoded geo may be wrong
for tax, and offer to update the script before signup.

## How to run

### Interactive (preferred for local humans)

```bash
demo-init
```

Optional: `demo-init --verbose` (or `-v`) to always print the full API JSON.

### Agent-assisted (non-interactive pipe)

After collecting the six fields, run from the repo (or rely on PATH). Answer **n**
to the “Show full API response?” prompt unless the user asked for verbose output:

```bash
printf '%s\n' \
  "$COMPANY_NAME" \
  "$COMPANY_ADDRESS" \
  "$ZIP_CODE" \
  "$FIRST_NAME" \
  "$LAST_NAME" \
  "$EMAIL" \
  "n" | demo-init
```

Dry-run auth only (no account created):

```bash
node dry-run-auth.js
```

## Success / failure

- **Success:** HTTP `200` or `201`. Tell the user:
  - Account created (include `name` + `_id` / `id` if present).
  - **Please check `{email}` to verify and finalise the account setup process.**
- Do **not** dump the full API body unless the user asked or chose yes / `--verbose`.
- **Auth failures:** Chrome not logged in, Apple Events JS disabled, or no Admin tab —
  surface the CLI error and stop. Do not invent tokens or fall back to Open API creds.
- **False failure trap:** `201 Created` is success (already handled in CLI).

## Slack slash command (future)

When wiring Slack (e.g. `/demo-init`):

1. Modal / options should collect the **same six fields** as the CLI.
2. Reuse the same signup body shape and success copy (email verification).
3. **Do not** use Chrome AppleScript in Slack. Replace token acquisition with an
   approved employee/admin credential path (service account or stored operator
   token). Keep that change explicit — local CLI auth ≠ Slack auth.
4. Until Slack auth exists, local `demo-init` remains the supported runner.

## Agent checklist

```
- [ ] Prerequisites confirmed (Chrome Okta + Apple Events)
- [ ] Six fields collected
- [ ] Ran demo-init (interactive or piped)
- [ ] Reported success/failure without dumping full JSON by default
- [ ] Reminded user to check email to finalise setup
```
