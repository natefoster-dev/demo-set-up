# Demo set up

Tools for Guesty sales demo accounts: create a Pro account (`demo-init`), then clone listings and related data (`cloner`).

---

## demo-init (account signup + clone)

Creates a **Guesty for Pro** demo account via the Admin API, then populates it with the cloner:

`POST https://admin.guesty.com/api/admin/accounts/signup`

### Prerequisites

1. Install dependencies (once):

```bash
npm install
```

2. Put **Core (clone-from)** Open API credentials in `.env` (see `.env.example`):

```
CORE_CLIENT_ID=...
CORE_CLIENT_SECRET=...
```

3. **Google Chrome** open and logged into [Guesty Admin](https://admin.guesty.com) (Okta).
4. In Chrome enable: **View → Developer → Allow JavaScript from Apple Events**.

Signup auth uses your employee Okta token from the open Chrome session.  
Cloning uses Open API **client ID / client secret** (Core from `.env`; new account prompted). Bearer tokens are fetched and cached under the hood for up to **12 hours**.

### Install the CLI command (optional)

```bash
mkdir -p ~/.local/bin
ln -sfn "$(pwd)/bin/demo-init" ~/.local/bin/demo-init
# ensure ~/.local/bin is on your PATH (e.g. in ~/.zshrc)
```

Or run without installing:

```bash
npm run demo-init
# or
node initializer.js
```

### Run

```bash
demo-init
```

End-to-end prompts:

1. Company name  
2. Company address (free text is fine; Google Places is UI-only)  
3. Zip code  
4. First name  
5. Last name  
6. Email (verification is sent here)  
7. Show full API response? `[y/N]` (skipped if you pass `--verbose`)  
8. **New account client ID**  
9. **New account client secret**

On signup success (`200` or `201`), the CLI prints a short summary and:

```
Please check {email} to verify and finalise the account setup process.
```

Then it asks for the new account’s Open API client ID/secret and runs `cloner.js`.

- **Core (clone-from):** always `CORE_CLIENT_ID` / `CORE_CLIENT_SECRET` from `.env` — no prompt.  
- **Target (new account):** paste client ID + secret after you verify email and create an Open API app.  
- Bearer tokens for both are obtained via `POST https://open-api.guesty.com/oauth2/token` and reused from local cache for **12 hours**.

```bash
demo-init --verbose   # always print the full signup API JSON
```

Dry-run Admin auth only (no account created, no cloner):

```bash
node dry-run-auth.js
```

### Fixed fields (not prompted)

| Field | Value |
|---|---|
| `phone` | `""` (optional in Admin UI) |
| `businessType` | `INDIVIDUAL` |
| `vatNum` | `""` |
| `country` | `IL` |
| `city` | `Tel Aviv-Yafo` |

### Cursor skill

Skill name: **`guesty-demo-init`**

- Project: `.cursor/skills/guesty-demo-init/SKILL.md`
- Personal (if installed): `~/.cursor/skills/guesty-demo-init/SKILL.md`

Use when asking the agent to create / register / initialize a Guesty Pro demo account, or to run `demo-init`.

---

## Cloner (listings & reservations)

Clones listings (and related data) from a **Core** source account into a **Demo** destination account using the Guesty Open API.

### Auth

Always **client credentials** → under-the-hood bearer token (cached ≤ 12h):

```
CORE_CLIENT_ID=...
CORE_CLIENT_SECRET=...
DEMO_CLIENT_ID=...
DEMO_CLIENT_SECRET=...
```

- `demo-init` supplies `DEMO_*` from prompts and reads `CORE_*` from `.env`.  
- Standalone `node cloner.js` expects both pairs in `.env` (or the environment).

Token caches (gitignored):

- `.token_cache_core.json`
- `.token_cache_demo.json`

### Configure cloner parameters (optional)

Edit the **CONFIGURABLE CONTROL PANEL** at the top of `cloner.js`:

```javascript
const cloneAllListings = false;      // true = clone all active listings (ignores targetLoops)
const targetLoops = 5;               // listings to clone when cloneAllListings is false
const reservationsPerListing = 10;   // staggered reservations per listing (0 = skip)
const createTaskPerListing = false;  // verification task per listing
const useOriginalTitle = false;      // keep Core title vs random title
const useOriginalNickname = false;   // keep Core nickname vs generated nickname
```

### Run standalone

```bash
node cloner.js
```
