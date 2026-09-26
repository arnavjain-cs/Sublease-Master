import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.resolve(projectRoot, process.env.DATA_DIR || 'data');
mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, 'sublease-master.sqlite'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
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
`);

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

export function listingById(id) {
  const row = db.prepare(`
    SELECT l.*, u.name AS owner_name, u.school AS owner_school,
      (SELECT COUNT(*) FROM threads t WHERE t.listing_id = l.id) AS inquiry_count
    FROM listings l JOIN users u ON u.id = l.owner_id WHERE l.id = ?
  `).get(id);
  return row ? decorateListing(row) : null;
}

export function decorateListing(row) {
  const photoDetails = db.prepare('SELECT id, path FROM listing_photos WHERE listing_id = ? ORDER BY sort_order').all(row.id);
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

export function seedDemo() {
  if (process.env.SEED_DEMO === 'false' || process.env.NODE_ENV === 'production') return;
  db.prepare("UPDATE listing_photos SET path = REPLACE(path, '.png', '.jpg') WHERE listing_id LIKE 'demo-%' AND path LIKE '/images/%.png'").run();
  const count = db.prepare('SELECT COUNT(*) AS count FROM listings').get().count;
  if (count > 0) return;

  const ownerId = 'demo-owner';
  db.prepare('INSERT OR IGNORE INTO users (id, name, email, password_hash, school, verified_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)')
    .run(ownerId, 'Sublease Master Demo', 'demo@subleasemaster.example', 'disabled', 'Demo campuses');

  const examples = [
    {
      id: 'demo-evanston', title: 'Sunlit room near campus', description: 'A comfortable private room in a quiet shared apartment. The room has a desk, generous natural light, and easy access to campus. This is a sample listing for exploring the app.',
      school: 'Northwestern University', city: 'Evanston', region: 'IL', neighborhood: 'Downtown Evanston', rent: 98000, utilities: 6500, deposit: 0,
      from: '2027-05-20', to: '2027-08-20', type: 'private_room', beds: 3, baths: 2, roommates: 2, furnished: 1, approval: 'requested', amenities: ['Wi-Fi', 'In-unit laundry', 'Desk', 'Air conditioning'], photo: '/images/room-olive.jpg',
    },
    {
      id: 'demo-boston', title: 'Bright studio for the summer', description: 'A bright, compact studio with a small kitchen and room to work from home. Walkable to transit and neighborhood cafés. This is a sample listing for exploring the app.',
      school: 'Boston University', city: 'Boston', region: 'MA', neighborhood: 'Allston', rent: 165000, utilities: 8000, deposit: 0,
      from: '2027-06-01', to: '2027-08-31', type: 'entire_place', beds: 1, baths: 1, roommates: 0, furnished: 1, approval: 'approved', amenities: ['Wi-Fi', 'Furnished', 'Near transit'], photo: '/images/studio-sunlit.jpg',
    },
    {
      id: 'demo-ann-arbor', title: 'Calm bedroom by the Diag', description: 'A private room with a workspace in a well-kept student apartment. Convenient for summer classes and internships nearby. This is a sample listing for exploring the app.',
      school: 'University of Michigan', city: 'Ann Arbor', region: 'MI', neighborhood: 'Central Campus', rent: 87500, utilities: 5000, deposit: 0,
      from: '2027-05-15', to: '2027-08-15', type: 'private_room', beds: 4, baths: 2, roommates: 3, furnished: 1, approval: 'not_started', amenities: ['Desk', 'Laundry', 'Dishwasher'], photo: '/images/room-blue.jpg',
    },
    {
      id: 'demo-austin', title: 'Open, airy room in West Campus', description: 'Private bedroom in a shared apartment with a practical layout and lots of afternoon light. Close to campus and local bus lines. This is a sample listing for exploring the app.',
      school: 'University of Texas at Austin', city: 'Austin', region: 'TX', neighborhood: 'West Campus', rent: 112500, utilities: 7000, deposit: 0,
      from: '2027-05-25', to: '2027-08-10', type: 'private_room', beds: 3, baths: 2, roommates: 2, furnished: 1, approval: 'requested', amenities: ['Balcony', 'Wi-Fi', 'In-unit laundry'], photo: '/images/hero-apartment.jpg',
    },
  ];

  const insert = db.prepare(`INSERT INTO listings (id, owner_id, title, description, school, city, region, neighborhood,
    rent_cents, utilities_cents, deposit_cents, available_from, available_to, room_type, bedrooms, bathrooms,
    roommates, furnished, approval_status, amenities_json, status, paid_at, is_demo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', CURRENT_TIMESTAMP, 1)`);
  const insertPhoto = db.prepare('INSERT INTO listing_photos (id, listing_id, path, sort_order) VALUES (?, ?, ?, 0)');
  for (const item of examples) {
    insert.run(item.id, ownerId, item.title, item.description, item.school, item.city, item.region, item.neighborhood,
      item.rent, item.utilities, item.deposit, item.from, item.to, item.type, item.beds, item.baths, item.roommates,
      item.furnished, item.approval, JSON.stringify(item.amenities));
    insertPhoto.run(`${item.id}-photo`, item.id, item.photo);
  }
}
