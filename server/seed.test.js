import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { sampleListings } from './sample-listings.js';

test('production starts with idempotent sample listings across campuses', async (t) => {
  const temp = mkdtempSync(path.join(tmpdir(), 'sublease-seed-test-'));
  const previous = { DATA_DIR: process.env.DATA_DIR, NODE_ENV: process.env.NODE_ENV, SEED_DEMO: process.env.SEED_DEMO };
  process.env.DATA_DIR = temp;
  process.env.NODE_ENV = 'production';
  delete process.env.SEED_DEMO;
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    rmSync(temp, { recursive: true, force: true });
  });

  const { db, seedDemo } = await import('./db.js');
  await seedDemo(new Date('2026-10-01T00:00:00Z'));
  await seedDemo(new Date('2026-10-01T00:00:00Z'));
  const rows = await db.prepare(`SELECT l.id, l.school, l.title, l.description, l.is_demo, l.status, p.path AS photo
    FROM listings l LEFT JOIN listing_photos p ON p.listing_id = l.id`).all();
  assert.equal(rows.length, 10);
  assert.ok(rows.every((row) => row.is_demo === 1 && row.status === 'published' && row.photo?.startsWith('/images/')));
  assert.equal(rows.filter((row) => row.school === 'University of Texas at Austin').length, 2);
  assert.equal(rows.filter((row) => row.school === 'Rice University').length, 2);
  assert.equal(new Set(rows.map((row) => row.school)).size, 8);
  assert.deepEqual(rows.filter((row) => row.school === 'Rice University').map((row) => row.title).sort(), ['Museum Park Flats', 'Rice Village Landing']);
  assert.deepEqual(rows.filter((row) => row.school === 'University of Texas at Austin').map((row) => row.title).sort(), ['North University Studios', 'The West Campus Courtyard']);
  assert.ok(rows.every((row) => row.description.includes('fictional sample listing')));
  assert.ok(sampleListings(new Date('2027-09-01T00:00:00Z')).every((item) => item.to.startsWith('2028-')));
  await seedDemo(new Date('2027-09-01T00:00:00Z'));
  const refreshed = await db.prepare('SELECT COUNT(*) AS count FROM listings WHERE is_demo = 1 AND available_to LIKE ?').get('2028-%');
  assert.equal(refreshed.count, 10);
});
