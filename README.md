# Sublease Master

A student sublease marketplace for colleges everywhere. Students can search by campus, city, dates, price, and room type; save rooms; ask posters questions; and create their own listings. Posters pay **$25 once per published listing**. In-app monthly rent payments and the proposed $5 monthly fee are a future feature.

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open <http://127.0.0.1:5173>. The API runs on port 3001 and stores data in `data/sublease-master.sqlite`. Development mode seeds four clearly marked sample listings. Sample listings cannot receive inquiries. Local photos are stored in `public/uploads/`.

Copy `.env.example` to `.env` to customize settings. With no `.env`, local development uses a **demo listing checkout**, so publishing collects no real money. Verification codes appear on the verification page in development when SMTP is not configured. The demo checkout and on-page codes are disabled in production.

## Features

- School email signup and verification, session based login, and protected posting and messaging.
- Searchable student housing listings with dates, budget, room type, and furnished filters.
- Free drafts, photo uploads, editing, availability controls, and a $25 publication step.
- Saved listings, listing inquiries, threaded conversations, and listing reports.
- Mobile layout, dark mode, keyboard focus states, and reduced motion support.

## Real checkout and email

Set `PAYMENTS_MODE=stripe`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `APP_ORIGIN` in `.env`. Configure Stripe to send `checkout.session.completed` events to `/api/webhooks/stripe`. The app also confirms completed sessions on the success page. Never put the secret key in client code. Stripe Checkout processes the $25 listing fee; no rent or deposit payments are processed in this app.

For production signup, set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`. Add any school email domains that do not end in `.edu`, `.edu.xx`, or `.ac.xx` to `ALLOWED_SCHOOL_DOMAINS`, comma separated. This confirms access to a school email; it does not verify enrollment, lease ownership, or landlord permission.

## Deploy on Vercel

The project includes `vercel.json`: Vercel builds the Vite site into `dist/`, routes `/api/*` to one Node.js Function, and serves client-side routes through `index.html`. Choose the **Vite** framework preset and the project root as the root directory. Use Node.js 22 or newer.

1. Create a [Turso database through Vercel Marketplace](https://vercel.com/marketplace/tursocloud) and connect it to the Vercel project. Confirm `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` appear in Project Settings → Environment Variables. The app creates its tables automatically. Use a separate database for preview deployments if you want test data isolated from production.
2. Create a **public** [Vercel Blob store](https://vercel.com/docs/vercel-blob) and connect it to the project. Confirm `BLOB_READ_WRITE_TOKEN` appears in the same Environment Variables screen. Uploaded listing photos are public because listings are public. Each upload is limited to 3 MB and the browser sends photos one at a time.
3. Add `NODEJS_HELPERS=0` in Project Settings → Environment Variables for each deployment environment. Express needs the original request stream for JSON, photo uploads, and Stripe webhook signature verification.
4. Add SMTP variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`) for school-email verification. Add `PAYMENTS_MODE=stripe`, `STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET` to collect the **$25 per listing** fee. Set `APP_ORIGIN` to your final `https://` domain in production for Stripe return URLs; leave it unset in previews to use each preview's Vercel URL. Configure Stripe's `checkout.session.completed` webhook at `https://YOUR-DOMAIN/api/webhooks/stripe`.
5. Deploy from your Git repository or with the Vercel CLI, then check `/api/health`, sign up with a school email, upload a photo, and complete a Stripe test-mode checkout. Redeploy after changing environment variables.

Do not set `PAYMENTS_MODE=demo` in production: demo checkout is disabled there. Without Stripe, students can save drafts but cannot publish. Without SMTP, signup is unavailable. The Vercel database starts empty; the four local sample listings are development-only. Local `data/` and `public/uploads/` are excluded from deployment, and existing local records are not automatically transferred to Turso.

## Other production hosting

For a persistent Node.js server outside Vercel, run `npm run build` and `npm start` with `NODE_ENV=production`, HTTPS, a persistent writable `DATA_DIR`, SMTP, Stripe credentials, and an accurate public `APP_ORIGIN`. The server serves the built client from `dist/`. Back up the SQLite database and uploaded photos together. Reports are stored for operator review in the `reports` table; a staffed moderation process is needed before public launch.

## Check

```bash
npm test
npm run build
```

The API test uses a temporary database and checks the student account, email verification, draft, upload, demo checkout, search, favorite, inquiry, reply, and availability flow. It does not exercise live Stripe or SMTP credentials.
