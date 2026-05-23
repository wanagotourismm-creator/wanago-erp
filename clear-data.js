// ─────────────────────────────────────────────────────────────────
//  Wanago ERP — Clear ALL Firestore data
//  Run with:  node clear-data.js
//  Uses only Node.js built-ins (https, readline) — no npm install.
// ─────────────────────────────────────────────────────────────────

const https    = require('https');
const readline = require('readline');

const API_KEY    = 'AIzaSyCRm_YW-TsVvzpF3SC275ZeLqr-0n2ZzvU';
const PROJECT_ID = 'wanago-erp';
const EMAIL      = 'wanagotourismm@gmail.com';
const BASE_FS    = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const COMP_PATH  = `companies/${PROJECT_ID}`;

const COLLECTIONS = [
  'leads','customers','quotations','packages','bookings',
  'invoices','payments','expenses','campaigns','segments','activities','tickets',
  'hrmsEmployees','hrmsLeaves','hrmsPayroll','hrmsCheckIns','hrmsLocRequests',
  'itineraries','suppliers','chatMessages','tasks','rewards','pointsLog',
];

// ── tiny http helpers ──────────────────────────────────────────

function request(method, url, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);
    const req = https.request(url, { method, headers }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function ask(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    // Hide password input
    const muted = question.toLowerCase().includes('password');
    if (muted) process.stdout.write(question);
    rl.question(muted ? '' : question, answer => {
      if (muted) process.stdout.write('\n');
      rl.close();
      resolve(answer.trim());
    });
    if (muted) {
      // Mute stdin so password isn't echoed
      rl.stdoutMuted = true;
      rl._writeToOutput = function() {};
    }
  });
}

// ── auth ───────────────────────────────────────────────────────

async function signIn(password) {
  const res = await request('POST',
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    { email: EMAIL, password, returnSecureToken: true }
  );
  if (res.status !== 200) {
    throw new Error('Login failed: ' + (res.body?.error?.message || res.status));
  }
  return res.body.idToken;
}

// ── Firestore helpers ──────────────────────────────────────────

async function listDocNames(collectionPath, token, pageToken) {
  let url = `${BASE_FS}/${collectionPath}?pageSize=300`;
  if (pageToken) url += `&pageToken=${pageToken}`;
  const res = await request('GET', url, null, token);
  if (res.status === 404 || !res.body?.documents) return { names: [], next: null };
  const names = res.body.documents.map(d => d.name);
  return { names, next: res.body.nextPageToken || null };
}

async function deleteDoc(docName, token) {
  const url = `https://firestore.googleapis.com/v1/${docName}`;
  await request('DELETE', url, null, token);
}

async function deleteCollection(collPath, token) {
  let deleted = 0;
  let pageToken = null;
  do {
    const { names, next } = await listDocNames(collPath, token, pageToken);
    for (const name of names) {
      await deleteDoc(name, token);
      deleted++;
    }
    pageToken = next;
  } while (pageToken);
  return deleted;
}

// ── main ───────────────────────────────────────────────────────

(async () => {
  console.log('\n=== Wanago ERP — Clear All Data ===\n');
  console.log('Email:', EMAIL);
  console.log('Project:', PROJECT_ID);
  console.log('\nCollections to clear:', COLLECTIONS.join(', '));
  console.log('Also clearing: settings, extras docs\n');

  const password = await ask('Enter Firebase password: ');
  if (!password) { console.error('No password entered. Aborted.'); process.exit(1); }

  process.stdout.write('Signing in…');
  let token;
  try {
    token = await signIn(password);
    console.log(' OK\n');
  } catch (e) {
    console.error('\n' + e.message);
    process.exit(1);
  }

  let totalDeleted = 0;

  for (const col of COLLECTIONS) {
    process.stdout.write(`  Deleting ${col}…`);
    const count = await deleteCollection(`${COMP_PATH}/${col}`, token);
    console.log(` ${count} docs`);
    totalDeleted += count;
  }

  // Delete top-level docs under companies/wanago-erp
  for (const docName of ['settings', 'extras']) {
    process.stdout.write(`  Deleting ${docName} doc…`);
    await deleteDoc(
      `projects/${PROJECT_ID}/databases/(default)/documents/${COMP_PATH}/${docName}`,
      token
    );
    console.log(' done');
  }

  console.log(`\nDone! ${totalDeleted} documents deleted from Firestore.`);
  console.log('\nNote: localStorage/IndexedDB cache will clear automatically on');
  console.log('next page load once Firestore returns empty collections.\n');
})();
