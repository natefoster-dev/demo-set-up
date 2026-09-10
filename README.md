# Demo set up

Tools for Guesty sales demo accounts: create a Pro account (`demo-init`), then clone listings and related data (`cloner`).

---

## demo-init (account signup)

Creates a **Guesty for Pro** demo account via the Admin API:

`POST https://admin.guesty.com/api/admin/accounts/signup`

### Prerequisites

1. Install dependencies (once):

```bash
npm install
```

2. **Google Chrome** open and logged into [Guesty Admin](https://admin.guesty.com) (Okta).
3. In Chrome enable: **View → Developer → Allow JavaScript from Apple Events**.

Auth uses your employee Okta token from the open Chrome session (not Open API `CLIENT_ID` / `CLIENT_SECRET`).

### Install the CLI command (optional)

Same pattern as `rev-detect` / `tpm-advisor` — symlink onto your PATH:

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

You will be prompted for:

1. Company name  
2. Company address (free text is fine; Google Places is UI-only)  
3. Zip code  
4. First name  
5. Last name  
6. Email (verification is sent here)

On success (`200` or `201`), the CLI prints a short summary and asks you to check email to verify and finalise account setup. It then asks whether to show the full API response (default **no**).

```bash
demo-init --verbose   # always print the full API JSON
```

Dry-run auth only (no account created):

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

Use when asking the agent to create / register / initialize a Guesty Pro demo account, or to run `demo-init`. The skill collects the same six fields, runs the CLI, and reminds you to check email. A future Slack `/demo-init` can reuse the same inputs (Slack will need its own auth path — not Chrome AppleScript).

---

## Cloner (listings & reservations)

Clones listings (and related data) from a **Core** source account into a **Demo** destination account using the Guesty Open API.

### Step 1: Configure API credentials

Create a `.env` file in the project root (see `.env.example`):

```
CORE_CLIENT_ID=your_core_client_id_here
CORE_CLIENT_SECRET=your_core_client_secret_here

DEMO_CLIENT_ID=your_demo_client_id_here
DEMO_CLIENT_SECRET=your_demo_client_secret_here
```

1. **CORE ACCOUNT (Source):** read existing property configurations.  
2. **DEMO ACCOUNT (Destination):** write cloned properties, tasks, and reservations.

> **Security:** Never commit `.env`. It is listed in `.gitignore`.

### Step 2: Local token caching

On run, Open API bearer tokens are cached locally:

- `.token_cache_core.json`
- `.token_cache_demo.json`

These are created automatically, reused until expiry, and gitignored.

### Step 3: Configure cloner parameters (optional)

Edit the **CONFIGURABLE CONTROL PANEL** at the top of `cloner.js`:

```javascript
const cloneAllListings = false;      // true = clone all active listings (ignores targetLoops)
const targetLoops = 5;               // listings to clone when cloneAllListings is false
const reservationsPerListing = 10;   // staggered reservations per listing (0 = skip)
const createTaskPerListing = false;  // verification task per listing
const useOriginalTitle = false;      // keep Core title vs random title
const useOriginalNickname = false;   // keep Core nickname vs generated nickname
```

### Step 4: Run the cloner

```bash
node cloner.js
```
