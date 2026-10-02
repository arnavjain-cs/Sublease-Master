import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@libsql/client/http';
import { sampleListings } from './sample-listings.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.resolve(projectRoot, process.env.DATA_DIR || 'data');
const remoteUrl = process.env.TURSO_DATABASE_URL;
if (process.env.VERCEL && (!remoteUrl || !process.env.TURSO_AUTH_TOKEN)) {
  throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required on Vercel.');
}
if (!remoteUrl) mkdirSync(dataDir, { recursive: true });

const localDb = remoteUrl ? null : new DatabaseSync(path.join(dataDir, 'sublease-master.sqlite'));
const remoteDb = remoteUrl ? createClient({ url: remoteUrl, authToken: process.env.TURSO_AUTH_TOKEN }) : null;
if (localDb) localDb.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

// Keep local SQLite fast and compatible with existing data, while using durable
// remote SQLite for serverless deployments. Callers await either implementation.
export const db = {
  prepare(sql) {
    if (localDb) return localDb.prepare(sql);
    const query = (...args) => remoteDb.execute({ sql, args });
    return {
      async get(...args) { return (await query(...args)).rows[0] || null; },
      async all(...args) { return (await query(...args)).rows; },
      async run(...args) { return query(...args); },
    };
  },
};

const schema = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    school TEXT NOT NULL,
    verified_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS verification_codes (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS listings (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    school TEXT NOT NULL,
    city TEXT NOT NULL,
    region TEXT NOT NULL,
    neighborhood TEXT NOT NULL DEFAULT '',
    private_address TEXT NOT NULL DEFAULT '',
    rent_cents INTEGER NOT NULL,
    utilities_cents INTEGER NOT NULL DEFAULT 0,
    deposit_cents INTEGER NOT NULL DEFAULT 0,
    available_from TEXT NOT NULL,
    available_to TEXT NOT NULL,
    room_type TEXT NOT NULL,
    bedrooms INTEGER NOT NULL,
    bathrooms REAL NOT NULL,
    roommates INTEGER NOT NULL,
    furnished INTEGER NOT NULL DEFAULT 0,
    approval_status TEXT NOT NULL DEFAULT 'not_started',
    amenities_json TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'draft',
    paid_at TEXT,
    is_demo INTEGER NOT NULL DEFAULT 0,
    views INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_listings_search ON listings(status, school, available_from, available_to, rent_cents);
  CREATE INDEX IF NOT EXISTS idx_listings_owner ON listings(owner_id);
  CREATE TABLE IF NOT EXISTS listing_photos (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS favorites (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, listing_id)
  );
  CREATE TABLE IF NOT EXISTS threads (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requested_from TEXT,
    requested_to TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(listing_id, requester_id)
  );
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id, created_at);
  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_session_id TEXT UNIQUE,
    amount_cents INTEGER NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`;

if (localDb) localDb.exec(schema);
else {
  // Schema creation is idempotent, so every cold start can safely initialize.
  for (const statement of schema.split(';').map((part) => part.trim()).filter(Boolean)) {
    await remoteDb.execute(statement);
  }
}

export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    school: user.school,
    verified: Boolean(user.verified_at),
    createdAt: user.created_at,
  };
}

export async function listingById(id) {
  const row = await db.prepare(`
    SELECT l.*, u.name AS owner_name, u.school AS owner_school,
      (SELECT COUNT(*) FROM threads t WHERE t.listing_id = l.id) AS inquiry_count
    FROM listings l JOIN users u ON u.id = l.owner_id WHERE l.id = ?
  `).get(id);
  return row ? decorateListing(row) : null;
}

export async function decorateListing(row) {
  const photoDetails = await db.prepare('SELECT id, path FROM listing_photos WHERE listing_id = ? ORDER BY sort_order').all(row.id);
  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    ownerSchool: row.owner_school,
    title: row.title,
    description: row.description,
    school: row.school,
    city: row.city,
    region: row.region,
    neighborhood: row.neighborhood,
    rent: row.rent_cents / 100,
    utilities: row.utilities_cents / 100,
    deposit: row.deposit_cents / 100,
    availableFrom: row.available_from,
    availableTo: row.available_to,
    roomType: row.room_type,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    roommates: row.roommates,
    furnished: Boolean(row.furnished),
    approvalStatus: row.approval_status,
    amenities: JSON.parse(row.amenities_json || '[]'),
    status: row.status,
    paid: Boolean(row.paid_at),
    isDemo: Boolean(row.is_demo),
    views: row.views,
    inquiryCount: row.inquiry_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    photos: photoDetails.map((photo) => photo.path),
  };
}

export async function seedDemo(now = new Date()) {
  if (process.env.SEED_DEMO === 'false') return;
  const examples = sampleListings(now);
  const rows = await db.prepare(`SELECT l.id, l.title, l.description, l.approval_status, l.available_from, l.available_to,
    p.id AS photo_id, p.path AS photo_path FROM listings l
    LEFT JOIN listing_photos p ON p.id = l.id || '-photo' WHERE l.is_demo = 1`).all();
  const existing = new Map(rows.map((row) => [row.id, row]));
  const current = examples.every((item) => {
    const row = existing.get(item.id);
    return row && row.title === item.title && row.description === item.description &&
      row.approval_status === item.approval && row.available_from === item.from &&
      row.available_to === item.to && row.photo_path === item.photo;
  });
  if (current) return;

  const ownerId = 'demo-owner';
  await db.prepare('INSERT OR IGNORE INTO users (id, name, email, password_hash, school, verified_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)')
    .run(ownerId, 'Sublease Master Demo', 'demo@subleasemaster.example', 'disabled', 'Demo campuses');

  const insert = db.prepare(`INSERT OR IGNORE INTO listings (id, owner_id, title, description, school, city, region, neighborhood,
    rent_cents, utilities_cents, deposit_cents, available_from, available_to, room_type, bedrooms, bathrooms,
    roommates, furnished, approval_status, amenities_json, status, paid_at, is_demo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', CURRENT_TIMESTAMP, 1)`);
  const updateSample = db.prepare(`UPDATE listings SET title = ?, description = ?, approval_status = ?,
    available_from = ?, available_to = ? WHERE id = ? AND is_demo = 1`);
  const insertPhoto = db.prepare('INSERT OR IGNORE INTO listing_photos (id, listing_id, path, sort_order) VALUES (?, ?, ?, 0)');
  const updatePhoto = db.prepare('UPDATE listing_photos SET path = ? WHERE id = ? AND listing_id = ?');
  for (const item of examples) {
    await insert.run(item.id, ownerId, item.title, item.description, item.school, item.city, item.region, item.neighborhood,
      item.rent, item.utilities, item.deposit, item.from, item.to, item.type, item.beds, item.baths, item.roommates,
      item.furnished, item.approval, JSON.stringify(item.amenities));
    const row = existing.get(item.id);
    if (row && (row.title !== item.title || row.description !== item.description ||
      row.approval_status !== item.approval || row.available_from !== item.from || row.available_to !== item.to)) {
      await updateSample.run(item.title, item.description, item.approval, item.from, item.to, item.id);
    }
    await insertPhoto.run(`${item.id}-photo`, item.id, item.photo);
    if (row?.photo_id && row.photo_path !== item.photo) {
      await updatePhoto.run(item.photo, `${item.id}-photo`, item.id);
    }
  }
}
