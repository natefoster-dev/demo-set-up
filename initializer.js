const axios = require('axios');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { createInterface } = require('readline/promises');
const { stdin, stdout } = require('process');

const execFileAsync = promisify(execFile);

const SIGNUP_URL = 'https://admin.guesty.com/api/admin/accounts/signup';
const ADMIN_URL = 'https://admin.guesty.com';

const BANNER = `
  ___       _ _   _       _ _
 |_ _|_ __ (_) |_(_) __ _| (_)_______ _ __
  | || '_ \\| | __| |/ _\` | | |_  / _ \\ '__|
  | || | | | | |_| | (_| | | |/ /  __/ |
 |___|_| |_|_|\\__|_|\\__,_|_|_/___\\___|_|
`.replace(/^\n/, '');

const REAUTH_MESSAGE =
  'Okta is not authenticated in your open Chrome session. Log into Okta on https://admin.guesty.com, then retry.';

const TOKEN_JS = `(function(){try{var raw=localStorage.getItem('token');if(raw){return JSON.parse(raw);}var okta=JSON.parse(localStorage.getItem('okta-token-storage')||'null');if(okta&&okta.accessToken&&okta.accessToken.accessToken){return okta.accessToken.accessToken;}return '';}catch(e){return '';}})()`;

async function promptRequired(rl, label) {
  while (true) {
    const value = (await rl.question(`${label}: `)).trim();
    if (value) return value;
    console.log('  This field is required.');
  }
}

async function promptYesNo(rl, label, defaultYes = false) {
  const hint = defaultYes ? 'Y/n' : 'y/N';
  const answer = (await rl.question(`${label} [${hint}]: `)).trim().toLowerCase();
  if (!answer) return defaultYes;
  return answer === 'y' || answer === 'yes';
}

function buildTokenAppleScript() {
  // Pull token from already-running Google Chrome (no second profile / no closing windows).
  return `
set tokenJs to ${JSON.stringify(TOKEN_JS)}
set adminPrefix to ${JSON.stringify(ADMIN_URL)}

tell application "System Events"
  if not (exists process "Google Chrome") then
    error "Google Chrome is not running. Open Chrome (logged into Okta), then retry."
  end if
end tell

tell application "Google Chrome"
  if (count of windows) is 0 then
    error "Chrome has no open windows. Open Chrome with your Okta session, then retry."
  end if

  set targetTab to missing value
  set openedNew to false

  repeat with w in windows
    repeat with t in tabs of w
      set tabUrl to URL of t as text
      if tabUrl starts with adminPrefix then
        set targetTab to t
        exit repeat
      end if
    end repeat
    if targetTab is not missing value then exit repeat
  end repeat

  if targetTab is missing value then
    set openedNew to true
    tell window 1
      set targetTab to make new tab with properties {URL:adminPrefix}
    end tell
    set ready to false
    repeat with i from 1 to 30
      delay 1
      set tabUrl to URL of targetTab as text
      if tabUrl starts with adminPrefix then
        set ready to true
        exit repeat
      end if
      if tabUrl contains "okta.com" or tabUrl contains "admin-login.guesty.com" then
        set ready to true
        exit repeat
      end if
    end repeat
    if ready is false then
      if openedNew then close targetTab
      error "Timed out loading Guesty Admin in Chrome."
    end if
    delay 2
  end if

  set currentUrl to URL of targetTab as text
  if currentUrl contains "okta.com" or currentUrl contains "admin-login.guesty.com" then
    if openedNew then close targetTab
    error "REAUTH"
  end if

  set tokenResult to ""
  try
    tell targetTab
      set tokenResult to execute javascript tokenJs
    end tell
  on error errMsg
    if openedNew then close targetTab
    error "CHROME_JS_DISABLED:" & errMsg
  end try

  if openedNew then close targetTab

  if tokenResult is missing value or tokenResult is "" or tokenResult is "null" then
    error "REAUTH"
  end if

  return tokenResult as text
end tell
`;
}

/**
 * Reads the Guesty Admin bearer token from the user's already-open Chrome session.
 * Does not launch a second Chrome profile (avoids profile-lock / closing windows).
 */
async function getBearerTokenFromOpenChrome() {
  if (process.platform !== 'darwin') {
    throw new Error(
      'Reading the Okta token from an open Chrome session is currently supported on macOS only.'
    );
  }

  const scriptPath = path.join(os.tmpdir(), `guesty-admin-token-${process.pid}.applescript`);
  fs.writeFileSync(scriptPath, buildTokenAppleScript(), 'utf8');

  try {
    const { stdout } = await execFileAsync('osascript', [scriptPath], {
      timeout: 90000,
      maxBuffer: 2 * 1024 * 1024,
    });
    const token = String(stdout || '').trim();
    if (!token) {
      throw new Error(REAUTH_MESSAGE);
    }
    return token;
  } catch (error) {
    const detail = `${error.stderr || ''} ${error.message || ''}`.trim();

    if (detail.includes('REAUTH')) {
      throw new Error(REAUTH_MESSAGE);
    }

    if (detail.includes('CHROME_JS_DISABLED') || /AppleScript is turned off|Allow JavaScript/i.test(detail)) {
      throw new Error(
        'Chrome blocked token readout. In Google Chrome enable: View → Developer → Allow JavaScript from Apple Events, then retry.'
      );
    }

    if (/not running|no open windows/i.test(detail)) {
      throw new Error(detail.replace(/^.*execution error:\s*/i, '').trim() || detail);
    }

    throw new Error(
      `Could not read Okta token from open Chrome. ${detail || 'Unknown error.'}`
    );
  } finally {
    try {
      fs.unlinkSync(scriptPath);
    } catch (_) {
      /* ignore */
    }
  }
}

async function main() {
  const rl = createInterface({ input: stdin, output: stdout });

  console.log(BANNER);
  console.log('Guesty for Pro — demo account signup (API)\n');

  try {
    console.log('Reading bearer token from your open Chrome Okta session...');
    const bearerToken = await getBearerTokenFromOpenChrome();
    console.log('Session token acquired.\n');

    console.log('Company details (1/2):\n');
    const name = await promptRequired(rl, 'Company name');
    const address = await promptRequired(rl, 'Company address');
    const zipCode = await promptRequired(rl, 'Zip code');

    console.log('\nProfile details (2/2):\n');
    const firstName = await promptRequired(rl, 'First name');
    const lastName = await promptRequired(rl, 'Last name');
    const email = await promptRequired(rl, 'Email');

    const body = {
      firstName,
      lastName,
      phone: '',
      email,
      companyInformation: {
        name,
        address,
        zipCode,
        businessType: 'INDIVIDUAL',
        vatNum: '',
        country: 'IL',
        city: 'Tel Aviv-Yafo',
      },
    };

    console.log('\nSubmitting signup request...');

    const response = await axios.post(SIGNUP_URL, body, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      validateStatus: () => true,
    });

    if (response.status === 200 || response.status === 201) {
      console.log('\n✅ Success — account created.');
      if (response.data && typeof response.data === 'object') {
        const accountId = response.data._id || response.data.id;
        const accountName = response.data.name;
        if (accountId || accountName) {
          console.log(`Account: ${accountName || '(unnamed)'} (${accountId || 'no id'})`);
        }

        const verboseFlag = process.argv.includes('--verbose') || process.argv.includes('-v');
        const showFull = verboseFlag || (await promptYesNo(rl, 'Show full API response?', false));
        if (showFull) {
          console.log(JSON.stringify(response.data, null, 2));
        }
      }
      console.log(`\nPlease check ${email} to verify and finalise the account setup process.`);
    } else {
      console.error(`\n❌ Signup failed (HTTP ${response.status}).`);
      const errPayload = response.data;
      if (errPayload) {
        console.error(
          typeof errPayload === 'string' ? errPayload : JSON.stringify(errPayload, null, 2)
        );
      }
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`\n❌ ${error.message}`);
    if (error.response) {
      console.error(`HTTP ${error.response.status}`);
      if (error.response.data) {
        console.error(
          typeof error.response.data === 'string'
            ? error.response.data
            : JSON.stringify(error.response.data, null, 2)
        );
      }
    }
    process.exitCode = 1;
  } finally {
    rl.close();
  }
}

main();
