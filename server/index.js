import express from 'express';
import multer from 'multer';
import nodemailer from 'nodemailer';
import Stripe from 'stripe';
import { randomInt, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, decorateListing, listingById, publicUser, seedDemo } from './db.js';
import { attachUser, checkPassword, clearSession, createSession, hash, hashPassword, requireUser, requireVerified, userResponse } from './auth.js';
import { academicEmail, inquirySchema, listingSchema, loginSchema, messageSchema, reportSchema, signupSchema, validationError } from './validation.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const uploadDir = path.resolve(projectRoot, process.env.UPLOAD_DIR || 'public/uploads');
mkdirSync(uploadDir, { recursive: true });
seedDemo();

const app = express();
const port = Number(process.env.PORT || 3001);
const origin = process.env.APP_ORIGIN || 'http://127.0.0.1:5173';
const requestedPaymentsMode = process.env.PAYMENTS_MODE || (process.env.NODE_ENV === 'production' ? 'disabled' : 'demo');
const paymentsMode = requestedPaymentsMode === 'demo' && process.env.NODE_ENV === 'production' ? 'disabled' : requestedPaymentsMode;
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('X-Frame-Options', 'DENY');
  next();
});

function sendError(res, status, message, extra = {}) {
  return res.status(status).json({ error: message, ...extra });
}

function markStripeCheckoutPaid(session) {
  const listingId = session.metadata?.listingId;
  const userId = session.metadata?.userId;
  if (session.payment_status !== 'paid' || session.amount_total !== 2500 || session.currency !== 'usd' || !listingId || !userId) return false;
  const listing = db.prepare('SELECT id, owner_id, paid_at FROM listings WHERE id = ?').get(listingId);
  if (!listing || listing.owner_id !== userId) return false;
  db.prepare(`UPDATE listings SET status = CASE WHEN paid_at IS NULL THEN 'published' ELSE status END,
    paid_at = COALESCE(paid_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(listingId);
  db.prepare("UPDATE payments SET status = 'paid' WHERE stripe_session_id = ?").run(session.id);
  db.prepare(`INSERT OR IGNORE INTO payments (id, listing_id, user_id, stripe_session_id, amount_cents, status) VALUES (?, ?, ?, ?, 2500, 'paid')`)
    .run(randomUUID(), listingId, userId, session.id);
  return true;
}

app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return sendError(res, 503, 'Stripe webhooks are not configured.');
  try {
    const event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
    if (event.type === 'checkout.session.completed') markStripeCheckoutPaid(event.data.object);
    res.json({ received: true });
  } catch (error) {
    sendError(res, 400, `Webhook rejected: ${error.message}`);
  }
});

app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(uploadDir, { immutable: true, maxAge: '1y' }));
app.use(attachUser);

// Same-origin cookies protect sessions; this also rejects foreign browser POSTs.
app.use('/api', (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const requestOrigin = req.get('origin');
  const host = req.get('host');
  const allowed = new Set([origin, `http://${host}`, `https://${host}`]);
  if (requestOrigin && !allowed.has(requestOrigin)) return sendError(res, 403, 'This request came from an untrusted origin.');
  next();
});

const attempts = new Map();
function authThrottle(req, res, next) {
  const key = `${req.ip}:${req.path}`;
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.reset < now) {
    attempts.set(key, { count: 1, reset: now + 15 * 60_000 });
    return next();
  }
  entry.count += 1;
  if (entry.count > 12) return sendError(res, 429, 'Too many attempts. Please try again in 15 minutes.');
  next();
}

async function issueVerification(user) {
  const code = String(randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
  db.prepare(`INSERT INTO verification_codes (user_id, code_hash, expires_at, attempts) VALUES (?, ?, ?, 0)
    ON CONFLICT(user_id) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0`)
    .run(user.id, hash(`${user.id}:${code}`), expiresAt);

  if (process.env.SMTP_HOST) {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
    await transport.sendMail({
      from: process.env.SMTP_FROM || 'Sublease Master <hello@example.com>',
      to: user.email,
      subject: 'Verify your Sublease Master account',
      text: `Your verification code is ${code}. It expires in 15 minutes.`,
    });
    return null;
  }
  if (process.env.NODE_ENV === 'production') throw new Error('Email delivery is not configured.');
  return code;
}

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/config', (_req, res) => res.json({
  listingPrice: 25,
  paymentsMode: paymentsMode === 'demo' ? 'demo' : paymentsMode === 'stripe' && stripe ? 'stripe' : 'unavailable',
  rentPaymentsAvailable: false,
}));
app.get('/api/auth/me', (req, res) => res.json(userResponse(req.user)));

app.post('/api/auth/signup', authThrottle, async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(validationError(parsed));
  const { name, email, password, school } = parsed.data;
  if (!academicEmail(email)) return sendError(res, 400, 'Use a school email address. Contact us if your college uses an uncommon domain.', { fields: { email: 'A school email is required.' } });
  if (process.env.NODE_ENV === 'production' && !process.env.SMTP_HOST) return sendError(res, 503, 'Email verification is temporarily unavailable.');
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) return sendError(res, 409, 'An account with that email already exists.');
  const id = randomUUID();
  db.prepare('INSERT INTO users (id, name, email, password_hash, school) VALUES (?, ?, ?, ?, ?)').run(id, name, email, hashPassword(password), school);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  try {
    const devCode = await issueVerification(user);
    createSession(res, id);
    res.status(201).json({ ...userResponse(user), devCode });
  } catch (error) {
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    sendError(res, 503, 'We could not send the verification code. Please try again.');
  }
});

app.post('/api/auth/login', authThrottle, (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(validationError(parsed));
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(parsed.data.email);
  if (!user || !checkPassword(parsed.data.password, user.password_hash)) return sendError(res, 401, 'Email or password is incorrect.');
  createSession(res, user.id);
  res.json(userResponse(user));
});

app.post('/api/auth/logout', requireUser, (req, res) => {
  clearSession(req, res);
  res.json({ ok: true });
});

app.post('/api/auth/verify', authThrottle, requireUser, (req, res) => {
  const code = String(req.body?.code || '').trim();
  if (!/^\d{6}$/.test(code)) return sendError(res, 400, 'Enter the six-digit code.');
  const record = db.prepare('SELECT * FROM verification_codes WHERE user_id = ?').get(req.user.id);
  if (!record || new Date(record.expires_at).getTime() < Date.now()) return sendError(res, 400, 'That code expired. Request a new one.');
  if (record.attempts >= 5) return sendError(res, 429, 'Too many attempts. Request a new code.');
  db.prepare('UPDATE verification_codes SET attempts = attempts + 1 WHERE user_id = ?').run(req.user.id);
  if (record.code_hash !== hash(`${req.user.id}:${code}`)) return sendError(res, 400, 'The code is incorrect.');
  db.prepare('UPDATE users SET verified_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.user.id);
  db.prepare('DELETE FROM verification_codes WHERE user_id = ?').run(req.user.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json(userResponse(user));
});

app.post('/api/auth/resend', authThrottle, requireUser, async (req, res) => {
  if (req.user.verified_at) return res.json({ ok: true });
  try {
    const devCode = await issueVerification(req.user);
    res.json({ ok: true, devCode });
  } catch {
    sendError(res, 503, 'We could not send the code. Please try again.');
  }
});

app.get('/api/schools', (req, res) => {
  const q = String(req.query.q || '').trim();
  const rows = db.prepare(`SELECT DISTINCT school FROM listings WHERE status = 'published' AND school LIKE ? ORDER BY school LIMIT 30`).all(`%${q}%`);
  res.json({ schools: rows.map((row) => row.school) });
});

app.get('/api/listings', (req, res) => {
  const where = ["l.status = 'published'", "l.available_to >= date('now')"];
  const params = [];
  const q = String(req.query.q || '').trim().slice(0, 100);
  const school = String(req.query.school || '').trim().slice(0, 120);
  if (q) {
    where.push('(l.title LIKE ? OR l.city LIKE ? OR l.school LIKE ? OR l.neighborhood LIKE ?)');
    params.push(...Array(4).fill(`%${q}%`));
  }
  if (school) { where.push('l.school = ?'); params.push(school); }
  const minRent = Number(req.query.minRent);
  const maxRent = Number(req.query.maxRent);
  if (Number.isFinite(minRent) && minRent > 0) { where.push('l.rent_cents >= ?'); params.push(Math.round(minRent * 100)); }
  if (Number.isFinite(maxRent) && maxRent > 0) { where.push('l.rent_cents <= ?'); params.push(Math.round(maxRent * 100)); }
  if (req.query.start) { where.push('l.available_from <= ?'); params.push(String(req.query.start)); }
  if (req.query.end) { where.push('l.available_to >= ?'); params.push(String(req.query.end)); }
  if (req.query.furnished === 'true') where.push('l.furnished = 1');
  if (['private_room', 'shared_room', 'entire_place'].includes(req.query.roomType)) {
    where.push('l.room_type = ?'); params.push(req.query.roomType);
  }
  const sort = { newest: 'l.created_at DESC', price_asc: 'l.rent_cents ASC', price_desc: 'l.rent_cents DESC' }[req.query.sort] || 'l.created_at DESC';
  const page = Math.max(1, Math.min(100, Number.parseInt(req.query.page, 10) || 1));
  const limit = 12;
  const clause = where.join(' AND ');
  const total = db.prepare(`SELECT COUNT(*) AS count FROM listings l WHERE ${clause}`).get(...params).count;
  const rows = db.prepare(`SELECT l.*, u.name AS owner_name, u.school AS owner_school FROM listings l JOIN users u ON u.id = l.owner_id WHERE ${clause} ORDER BY ${sort} LIMIT ? OFFSET ?`)
    .all(...params, limit, (page - 1) * limit);
  res.json({ listings: rows.map(decorateListing), total, page, pages: Math.ceil(total / limit) });
});

app.get('/api/listings/:id', (req, res) => {
  const listing = listingById(req.params.id);
  if (!listing || (listing.status !== 'published' && req.user?.id !== listing.ownerId)) return sendError(res, 404, 'Listing not found.');
  if (listing.status === 'published' && !listing.isDemo) db.prepare('UPDATE listings SET views = views + 1 WHERE id = ?').run(listing.id);
  const owner = req.user?.id === listing.ownerId;
  res.json({ listing: { ...listing, ...(owner ? { privateAddress: db.prepare('SELECT private_address FROM listings WHERE id = ?').get(listing.id).private_address, photoDetails: db.prepare('SELECT id, path FROM listing_photos WHERE listing_id = ? ORDER BY sort_order').all(listing.id) } : {}) } });
});

app.post('/api/listings', requireVerified, (req, res) => {
  const parsed = listingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(validationError(parsed));
  const v = parsed.data;
  const id = randomUUID();
  db.prepare(`INSERT INTO listings (id, owner_id, title, description, school, city, region, neighborhood, private_address,
    rent_cents, utilities_cents, deposit_cents, available_from, available_to, room_type, bedrooms, bathrooms, roommates,
    furnished, approval_status, amenities_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, req.user.id, v.title, v.description, v.school, v.city, v.region, v.neighborhood, v.privateAddress,
      Math.round(v.rent * 100), Math.round(v.utilities * 100), Math.round(v.deposit * 100), v.availableFrom, v.availableTo,
      v.roomType, v.bedrooms, v.bathrooms, v.roommates, Number(v.furnished), v.approvalStatus, JSON.stringify(v.amenities));
  res.status(201).json({ listing: listingById(id) });
});

app.put('/api/listings/:id', requireVerified, (req, res) => {
  const original = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
  if (!original || original.owner_id !== req.user.id) return sendError(res, 404, 'Listing not found.');
  const parsed = listingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(validationError(parsed));
  const v = parsed.data;
  db.prepare(`UPDATE listings SET title=?, description=?, school=?, city=?, region=?, neighborhood=?, private_address=?,
    rent_cents=?, utilities_cents=?, deposit_cents=?, available_from=?, available_to=?, room_type=?, bedrooms=?, bathrooms=?,
    roommates=?, furnished=?, approval_status=?, amenities_json=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(v.title, v.description, v.school, v.city, v.region, v.neighborhood, v.privateAddress, Math.round(v.rent * 100),
      Math.round(v.utilities * 100), Math.round(v.deposit * 100), v.availableFrom, v.availableTo, v.roomType, v.bedrooms,
      v.bathrooms, v.roommates, Number(v.furnished), v.approvalStatus, JSON.stringify(v.amenities), original.id);
  res.json({ listing: listingById(original.id) });
});

function imageExtension(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png';
  if (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return 'jpg';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 6 * 1024 * 1024, files: 5 } });
app.post('/api/listings/:id/photos', requireVerified, upload.array('photos', 5), (req, res) => {
  const row = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
  if (!row || row.owner_id !== req.user.id) return sendError(res, 404, 'Listing not found.');
  const existing = db.prepare('SELECT COUNT(*) AS count FROM listing_photos WHERE listing_id = ?').get(row.id).count;
  if (!req.files?.length) return sendError(res, 400, 'Choose at least one photo.');
  if (existing + req.files.length > 5) return sendError(res, 400, 'Listings can have up to five photos.');
  const extensions = req.files.map((file) => imageExtension(file.buffer));
  if (extensions.some((extension) => !extension)) return sendError(res, 400, 'Only PNG, JPEG, or WebP images are supported.');
  for (const [index, file] of req.files.entries()) {
    const extension = extensions[index];
    const fileName = `${randomUUID()}.${extension}`;
    writeFileSync(path.join(uploadDir, fileName), file.buffer, { flag: 'wx' });
    db.prepare('INSERT INTO listing_photos (id, listing_id, path, sort_order) VALUES (?, ?, ?, ?)')
      .run(randomUUID(), row.id, `/uploads/${fileName}`, existing + index);
  }
  res.json({ listing: listingById(row.id) });
});

app.delete('/api/listings/:id/photos/:photoId', requireVerified, (req, res) => {
  const row = db.prepare(`SELECT p.* FROM listing_photos p JOIN listings l ON l.id = p.listing_id WHERE p.id = ? AND l.id = ? AND l.owner_id = ?`)
    .get(req.params.photoId, req.params.id, req.user.id);
  if (!row) return sendError(res, 404, 'Photo not found.');
  db.prepare('DELETE FROM listing_photos WHERE id = ?').run(row.id);
  if (row.path.startsWith('/uploads/')) {
    const filePath = path.join(uploadDir, path.basename(row.path));
    if (existsSync(filePath)) unlinkSync(filePath);
  }
  res.json({ listing: listingById(req.params.id) });
});

app.post('/api/listings/:id/checkout', requireVerified, async (req, res) => {
  const row = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
  if (!row || row.owner_id !== req.user.id) return sendError(res, 404, 'Listing not found.');
  if (row.paid_at) return res.json({ redirect: `/rooms/${row.id}` });
  const photos = db.prepare('SELECT COUNT(*) AS count FROM listing_photos WHERE listing_id = ?').get(row.id).count;
  if (!photos) return sendError(res, 400, 'Add at least one photo before publishing.');
  if (paymentsMode === 'demo') {
    db.prepare(`UPDATE listings SET status = 'published', paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(row.id);
    db.prepare(`INSERT INTO payments (id, listing_id, user_id, amount_cents, status) VALUES (?, ?, ?, 2500, 'demo')`)
      .run(randomUUID(), row.id, req.user.id);
    return res.json({ mode: 'demo', redirect: `/rooms/${row.id}?published=demo` });
  }
  if (paymentsMode !== 'stripe' || !stripe) return sendError(res, 503, 'Listing checkout is not configured yet.');
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: req.user.email,
    client_reference_id: row.id,
    line_items: [{ price_data: { currency: 'usd', unit_amount: 2500, product_data: { name: 'Publish one Sublease Master listing' } }, quantity: 1 }],
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/dashboard?checkout=cancelled`,
    metadata: { listingId: row.id, userId: req.user.id },
  });
  db.prepare(`INSERT INTO payments (id, listing_id, user_id, stripe_session_id, amount_cents, status) VALUES (?, ?, ?, ?, 2500, 'pending')`)
    .run(randomUUID(), row.id, req.user.id, session.id);
  res.json({ mode: 'stripe', url: session.url });
});

app.get('/api/payments/confirm', requireUser, async (req, res) => {
  if (!stripe || !req.query.session_id) return sendError(res, 400, 'Checkout session not found.');
  const session = await stripe.checkout.sessions.retrieve(String(req.query.session_id));
  if (session.metadata?.userId !== req.user.id) return sendError(res, 403, 'That checkout belongs to another account.');
  if (!markStripeCheckoutPaid(session)) return sendError(res, 400, 'Payment has not completed.');
  res.json({ listingId: session.metadata.listingId });
});

app.patch('/api/listings/:id/status', requireVerified, (req, res) => {
  const row = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
  if (!row || row.owner_id !== req.user.id) return sendError(res, 404, 'Listing not found.');
  const status = String(req.body?.status || '');
  if (!['published', 'unavailable', 'archived'].includes(status)) return sendError(res, 400, 'Invalid listing status.');
  if (status === 'published' && !row.paid_at) return sendError(res, 402, 'Complete the $25 listing checkout to publish.');
  db.prepare('UPDATE listings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, row.id);
  res.json({ listing: listingById(row.id) });
});

app.get('/api/dashboard', requireUser, (req, res) => {
  const rows = db.prepare('SELECT l.*, u.name AS owner_name, u.school AS owner_school, (SELECT COUNT(*) FROM threads t WHERE t.listing_id = l.id) AS inquiry_count FROM listings l JOIN users u ON u.id = l.owner_id WHERE l.owner_id = ? ORDER BY l.created_at DESC').all(req.user.id);
  const inquiries = db.prepare('SELECT COUNT(*) AS count FROM threads WHERE owner_id = ?').get(req.user.id).count;
  res.json({ listings: rows.map(decorateListing), inquiryCount: inquiries });
});

app.get('/api/favorites', requireUser, (req, res) => {
  const rows = db.prepare(`SELECT l.*, u.name AS owner_name, u.school AS owner_school FROM favorites f
    JOIN listings l ON l.id = f.listing_id JOIN users u ON u.id = l.owner_id WHERE f.user_id = ? AND l.status = 'published' ORDER BY f.created_at DESC`)
    .all(req.user.id);
  res.json({ listings: rows.map(decorateListing) });
});

app.get('/api/favorites/ids', requireUser, (req, res) => {
  const rows = db.prepare('SELECT listing_id FROM favorites WHERE user_id = ?').all(req.user.id);
  res.json({ ids: rows.map((row) => row.listing_id) });
});

app.post('/api/favorites/:id', requireVerified, (req, res) => {
  const listing = db.prepare("SELECT id FROM listings WHERE id = ? AND status = 'published'").get(req.params.id);
  if (!listing) return sendError(res, 404, 'Listing not found.');
  const existing = db.prepare('SELECT 1 FROM favorites WHERE user_id = ? AND listing_id = ?').get(req.user.id, listing.id);
  if (existing) db.prepare('DELETE FROM favorites WHERE user_id = ? AND listing_id = ?').run(req.user.id, listing.id);
  else db.prepare('INSERT INTO favorites (user_id, listing_id) VALUES (?, ?)').run(req.user.id, listing.id);
  res.json({ saved: !existing });
});

app.post('/api/inquiries', requireVerified, (req, res) => {
  const parsed = inquirySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(validationError(parsed));
  const v = parsed.data;
  const listing = db.prepare("SELECT * FROM listings WHERE id = ? AND status = 'published'").get(v.listingId);
  if (!listing) return sendError(res, 404, 'Listing not found.');
  if (listing.is_demo) return sendError(res, 400, 'This sample listing cannot receive inquiries.');
  if (listing.owner_id === req.user.id) return sendError(res, 400, 'You cannot inquire about your own listing.');
  if (v.requestedFrom && v.requestedFrom < listing.available_from || v.requestedTo && v.requestedTo > listing.available_to) {
    return sendError(res, 400, 'Requested dates must fit within the listed availability.');
  }
  let thread = db.prepare('SELECT * FROM threads WHERE listing_id = ? AND requester_id = ?').get(listing.id, req.user.id);
  if (!thread) {
    const id = randomUUID();
    db.prepare('INSERT INTO threads (id, listing_id, requester_id, owner_id, requested_from, requested_to) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, listing.id, req.user.id, listing.owner_id, v.requestedFrom || null, v.requestedTo || null);
    thread = { id };
  }
  db.prepare('INSERT INTO messages (id, thread_id, sender_id, body) VALUES (?, ?, ?, ?)')
    .run(randomUUID(), thread.id, req.user.id, v.message);
  db.prepare('UPDATE threads SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(thread.id);
  res.status(201).json({ threadId: thread.id });
});

app.get('/api/threads', requireUser, (req, res) => {
  const rows = db.prepare(`SELECT t.*, l.title AS listing_title, l.status AS listing_status,
    (SELECT path FROM listing_photos WHERE listing_id = t.listing_id ORDER BY sort_order LIMIT 1) AS photo,
    r.name AS requester_name, o.name AS owner_name,
    (SELECT body FROM messages WHERE thread_id = t.id ORDER BY created_at DESC, rowid DESC LIMIT 1) AS last_message
    FROM threads t JOIN listings l ON l.id = t.listing_id JOIN users r ON r.id = t.requester_id
    JOIN users o ON o.id = t.owner_id WHERE t.requester_id = ? OR t.owner_id = ? ORDER BY t.updated_at DESC`)
    .all(req.user.id, req.user.id);
  res.json({ threads: rows.map((row) => ({
    id: row.id, listingId: row.listing_id, listingTitle: row.listing_title, listingStatus: row.listing_status,
    photo: row.photo, counterpart: req.user.id === row.owner_id ? row.requester_name : row.owner_name,
    requestedFrom: row.requested_from, requestedTo: row.requested_to, lastMessage: row.last_message,
    updatedAt: row.updated_at,
  })) });
});

app.get('/api/threads/:id', requireUser, (req, res) => {
  const row = db.prepare(`SELECT t.*, l.title AS listing_title, l.status AS listing_status, r.name AS requester_name, o.name AS owner_name
    FROM threads t JOIN listings l ON l.id = t.listing_id JOIN users r ON r.id = t.requester_id
    JOIN users o ON o.id = t.owner_id WHERE t.id = ?`).get(req.params.id);
  if (!row || (row.owner_id !== req.user.id && row.requester_id !== req.user.id)) return sendError(res, 404, 'Conversation not found.');
  const messages = db.prepare('SELECT m.id, m.body, m.sender_id AS senderId, m.created_at AS createdAt FROM messages m WHERE m.thread_id = ? ORDER BY m.created_at, m.rowid').all(row.id);
  res.json({
    thread: { id: row.id, listingId: row.listing_id, listingTitle: row.listing_title, listingStatus: row.listing_status,
      counterpart: req.user.id === row.owner_id ? row.requester_name : row.owner_name, requestedFrom: row.requested_from,
      requestedTo: row.requested_to },
    messages,
  });
});

app.post('/api/threads/:id/messages', requireVerified, (req, res) => {
  const thread = db.prepare('SELECT * FROM threads WHERE id = ?').get(req.params.id);
  if (!thread || (thread.owner_id !== req.user.id && thread.requester_id !== req.user.id)) return sendError(res, 404, 'Conversation not found.');
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(validationError(parsed));
  const id = randomUUID();
  db.prepare('INSERT INTO messages (id, thread_id, sender_id, body) VALUES (?, ?, ?, ?)').run(id, thread.id, req.user.id, parsed.data.body);
  db.prepare('UPDATE threads SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(thread.id);
  res.status(201).json({ id });
});

app.post('/api/listings/:id/report', requireVerified, (req, res) => {
  const parsed = reportSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(validationError(parsed));
  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
  if (!listing) return sendError(res, 404, 'Listing not found.');
  db.prepare('INSERT INTO reports (id, listing_id, reporter_id, reason, details) VALUES (?, ?, ?, ?, ?)')
    .run(randomUUID(), listing.id, req.user.id, parsed.data.reason, parsed.data.details);
  res.status(201).json({ ok: true });
});

app.use('/api', (_req, res) => sendError(res, 404, 'This endpoint was not found.'));

if (process.env.NODE_ENV === 'production') {
  const distDir = path.join(projectRoot, 'dist');
  app.use(express.static(distDir, { maxAge: '1h' }));
  app.use((req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) return sendError(res, 400, error.code === 'LIMIT_FILE_SIZE' ? 'Each photo must be under 6 MB.' : 'Photo upload failed.');
  console.error(error);
  sendError(res, 500, 'Something went wrong. Please try again.');
});

const host = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
app.listen(port, host, () => {
  console.log(`Sublease Master API listening on http://${host}:${port}`);
  if (paymentsMode === 'demo') console.log('Demo checkout is active. No real money is collected.');
});
