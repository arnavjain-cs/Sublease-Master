import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { academicEmail } from './validation.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = mkdtempSync(path.join(tmpdir(), 'sublease-master-test-'));
const port = 33000 + Math.floor(Math.random() * 20000);
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['server/start.js'], {
  cwd: root,
  env: { ...process.env, PORT: String(port), DATA_DIR: temp, UPLOAD_DIR: path.join(temp, 'uploads'), SEED_DEMO: 'false', PAYMENTS_MODE: 'demo', NODE_ENV: 'test', APP_ORIGIN: base },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
child.stdout.on('data', (chunk) => { output += chunk; });
child.stderr.on('data', (chunk) => { output += chunk; });

async function ready() {
  for (let i = 0; i < 80; i += 1) {
    if (child.exitCode !== null) throw new Error(`Server stopped: ${output}`);
    try { const response = await fetch(`${base}/api/health`); if (response.ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Server did not start: ${output}`);
}

async function request(route, { method = 'GET', body, cookie, form } = {}) {
  const response = await fetch(`${base}/api${route}`, {
    method,
    headers: { ...(cookie ? { cookie } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
    body: form || (body ? JSON.stringify(body) : undefined),
  });
  return { status: response.status, cookie: response.headers.get('set-cookie')?.split(';')[0], data: await response.json() };
}

async function signup(name, email) {
  const result = await request('/auth/signup', { method: 'POST', body: { name, email, password: 'test-password-12345', school: 'Example University' } });
  assert.equal(result.status, 201);
  assert.ok(result.data.devCode);
  const verified = await request('/auth/verify', { method: 'POST', cookie: result.cookie, body: { code: result.data.devCode } });
  assert.equal(verified.status, 200);
  assert.equal(verified.data.user.verified, true);
  return result.cookie;
}

test('school email rules reject lookalike domains', () => {
  assert.equal(academicEmail('student@college.edu'), true);
  assert.equal(academicEmail('student@college.ac.uk'), true);
  assert.equal(academicEmail('student@college.edu.au'), true);
  assert.equal(academicEmail('student@college.edu.example.com'), false);
  assert.equal(academicEmail('student@college.ac.example.com'), false);
});

test('student listing, payment, search, favorites, and inquiry flow', async (t) => {
  t.after(() => { child.kill(); rmSync(temp, { recursive: true, force: true }); });
  await ready();
  const owner = await signup('Alex Student', 'alex@example.edu');
  const renter = await signup('Sam Student', 'sam@example.edu');
  const listingInput = {
    title: 'Bright room near campus', description: 'A bright private room near campus with a desk, quiet roommates, and laundry in the building.',
    school: 'Example University', city: 'College Town', region: 'IL', neighborhood: 'North Campus', privateAddress: '123 Private Street',
    rent: 950, utilities: 60, deposit: 300, availableFrom: '2027-05-20', availableTo: '2027-08-20',
    roomType: 'private_room', bedrooms: 3, bathrooms: 2, roommates: 2, furnished: true, approvalStatus: 'requested', amenities: ['Wi-Fi'],
  };
  const created = await request('/listings', { method: 'POST', cookie: owner, body: listingInput });
  assert.equal(created.status, 201);
  const id = created.data.listing.id;
  assert.equal(created.data.listing.privateAddress, undefined);
  const ownerView = await request(`/listings/${id}`, { cookie: owner });
  assert.equal(ownerView.data.listing.privateAddress, '123 Private Street');
  const hidden = await request(`/listings/${id}`, { cookie: renter });
  assert.equal(hidden.status, 404);
  const earlyCheckout = await request(`/listings/${id}/checkout`, { method: 'POST', cookie: owner });
  assert.equal(earlyCheckout.status, 400);

  const form = new FormData();
  form.append('photos', new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+yRcoAAAAASUVORK5CYII=', 'base64')], { type: 'image/png' }), 'room.png');
  const photo = await request(`/listings/${id}/photos`, { method: 'POST', cookie: owner, form });
  assert.equal(photo.status, 200);
  assert.equal(photo.data.listing.photos.length, 1);
  const checkout = await request(`/listings/${id}/checkout`, { method: 'POST', cookie: owner });
  assert.equal(checkout.status, 200);
  assert.equal(checkout.data.mode, 'demo');
  const publicView = await request(`/listings/${id}`, { cookie: renter });
  assert.equal(publicView.data.listing.privateAddress, undefined);
  assert.equal(publicView.data.listing.status, 'published');
  const search = await request('/listings?q=College%20Town');
  assert.equal(search.data.total, 1);
  assert.equal(search.data.listings[0].privateAddress, undefined);

  const saved = await request(`/favorites/${id}`, { method: 'POST', cookie: renter });
  assert.equal(saved.data.saved, true);
  const inquiry = await request('/inquiries', { method: 'POST', cookie: renter, body: { listingId: id, message: 'Hi, could you tell me more about the room and building?' } });
  assert.equal(inquiry.status, 201);
  const thread = await request(`/threads/${inquiry.data.threadId}`, { cookie: owner });
  assert.equal(thread.data.messages.length, 1);
  assert.equal(thread.data.thread.counterpart, 'Sam Student');
  const reply = await request(`/threads/${inquiry.data.threadId}/messages`, { method: 'POST', cookie: owner, body: { body: 'Yes, happy to help. What would you like to know?' } });
  assert.equal(reply.status, 201);
  const dashboard = await request('/dashboard', { cookie: owner });
  assert.equal(dashboard.data.inquiryCount, 1);
  assert.equal(dashboard.data.listings[0].inquiryCount, 1);
  const unavailable = await request(`/listings/${id}/status`, { method: 'PATCH', cookie: owner, body: { status: 'unavailable' } });
  assert.equal(unavailable.data.listing.status, 'unavailable');
});
