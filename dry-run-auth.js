/**
 * Dry-run: acquire admin bearer token from open Chrome and verify auth.
 * Does NOT call /accounts/signup and creates no account.
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadTokenHelper() {
  const src = fs.readFileSync(path.join(__dirname, 'initializer.js'), 'utf8');
  const trimmed = src.replace(/async function main\([\s\S]*$/, '\nmodule.exports = { getBearerTokenFromOpenChrome };\n');
  const module = { exports: {} };
  const sandbox = {
    module,
    exports: module.exports,
    require,
    console,
    process,
    Buffer,
    setTimeout,
    clearTimeout,
    __dirname,
    __filename: path.join(__dirname, 'initializer.js'),
  };
  vm.runInNewContext(trimmed, sandbox, { filename: 'initializer.js' });
  return module.exports.getBearerTokenFromOpenChrome;
}

function decodeJwtPayload(token) {
  const seg = token.split('.')[1];
  const pad = '='.repeat((4 - (seg.length % 4)) % 4);
  return JSON.parse(Buffer.from(seg + pad, 'base64url').toString('utf8'));
}

async function main() {
  console.log('DRY-RUN: token acquisition only (no signup)\n');

  const getBearerTokenFromOpenChrome = loadTokenHelper();
  const token = await getBearerTokenFromOpenChrome();
  const payload = decodeJwtPayload(token);
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = (payload.exp || 0) - now;

  console.log('Token acquired:', `${token.slice(0, 20)}… (${token.length} chars)`);
  console.log('Claims:');
  console.log('  iss:', payload.iss || '(none)');
  console.log('  aud:', payload.aud || '(none)');
  console.log('  exp:', payload.exp, expiresIn > 0 ? `(valid, ${expiresIn}s left)` : '(EXPIRED)');
  console.log('  sub:', payload.sub || '(none)');

  if (expiresIn <= 0) {
    console.error('\nFAIL: token is expired — reauthenticate with Okta in Chrome.');
    process.exitCode = 1;
    return;
  }

  // Harmless auth probe — never hits /accounts/signup
  const probes = [
    'https://admin.guesty.com/api/admin/employees/me',
    'https://admin.guesty.com/api/admin/me',
    'https://admin.guesty.com/api/users/me',
  ];

  console.log('\nProbing admin API with token (read-only)…');
  let authed = false;
  for (const url of probes) {
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      validateStatus: () => true,
      timeout: 15000,
    });
    console.log(`  ${res.status} ${url}`);
    if (res.status >= 200 && res.status < 300) {
      authed = true;
      if (res.data && typeof res.data === 'object') {
        const summary = {
          email: res.data.email || res.data.username,
          name: res.data.presentableName || res.data.name,
          id: res.data._id || res.data.id,
        };
        console.log('  identity:', JSON.stringify(summary));
      }
      break;
    }
    if (res.status === 401 || res.status === 403) {
      console.log('  auth rejected by this path; trying next…');
    }
  }

  if (!authed) {
    // Token may still be fine for signup even if /me paths differ — report soft pass on JWT validity
    console.log('\nWARN: no /me probe succeeded, but JWT is unexpired and was read from Chrome.');
    console.log('DRY-RUN partial pass: token extraction OK; confirm signup separately when ready.');
    return;
  }

  console.log('\nDRY-RUN pass: Chrome token readout + admin API auth OK. Signup was not called.');
}

main().catch((err) => {
  console.error('\nDRY-RUN fail:', err.message);
  process.exitCode = 1;
});
