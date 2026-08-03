# Cloner (Demo set up)

This project automates cloning a target environment from a source account to a destination account using the Guesty API.

---

## 🚀 Step-by-Step Usage Instructions

### Step 1: Install Dependencies

Ensure you have [Node.js](https://nodejs.org/) (v14 or higher) installed. Open your terminal in this directory and run:

npm install

*Required Packages:*
* `axios` — Handling HTTP API requests and response interceptors.
* `@faker-js/faker` — Generating randomized mock data (names, phone numbers, listings).
* `dotenv` — Loading API keys and secrets securely from your local `.env` file.

---

### Step 2: Configure API Credentials

Create a `.env` file in the root directory of this project (refer to `.env.example` as a template). You must configure credentials for both the Source (Core) and Destination (Demo) accounts:

CORE_CLIENT_ID=your_core_client_id_here
CORE_CLIENT_SECRET=your_core_client_secret_here

DEMO_CLIENT_ID=your_demo_client_id_here
DEMO_CLIENT_SECRET=your_demo_client_secret_here

1. **CORE ACCOUNT (Source):**
   * Provide `CORE_CLIENT_ID` and `CORE_CLIENT_SECRET`.
   * *Used by the script to read existing property configurations.*

2. **DEMO ACCOUNT (Destination):**
   * Provide `DEMO_CLIENT_ID` and `DEMO_CLIENT_SECRET`.
   * *Used by the script to write and create cloned properties, tasks, and reservations.*

> ⚠️ **Security Note:** Never commit your `.env` file to version control. Ensure `.env` is listed inside your `.gitignore`.

---

### Step 3: Local Token Caching

When executed, the script automatically manages authentication bearer tokens and generates token cache files locally:
* `.token_cache_core.json`
* `.token_cache_demo.json`

* **Automatic Creation:** You do **not** need to manually create these files; the script generates and updates them on first run.
* **Token Expiry & MD5 Hashes:** The script reuses active tokens until expiry to reduce unnecessary authorization requests to the server.
* **Git Safety:** These files are ignored by default in `.gitignore` to prevent caching state or hashes in your repository.

---

### Step 4: Configure Cloner Parameters (Optional)

You can customize the volume of properties and bookings created by editing the **CONFIGURABLE CONTROL PANEL** section at the top of `cloner.js`:

```javascript
const targetLoops = 5;              // Number of properties to clone from Core
const reservationsPerListing = 3;  // Number of staggered reservations per listing