# Sublease Master

A college sublease marketplace project. The website comes with ten clearly marked fictional apartments near UT Austin, Rice, and other universities. Students can browse them by campus, city, dates, price, and room type. The proposed business model is **$25 per published listing**; in-app rent payments and a proposed $5 monthly fee are future ideas.

## Vercel class demo

Import this repository into Vercel and use the Vite preset. The default build command (`npm run build`) and output directory (`dist`) are already in `vercel.json`. **No database, payment, email, or environment variables are needed to view the sample apartments.** They are included in the frontend build, so the homepage, search, filters, and room detail pages work as a standalone demo.

Account creation, student posts, messaging, and payment are backed by the local API and need server services if you want to demonstrate those workflows online. The bundled sample apartments are fictional and cannot receive messages.

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open <http://127.0.0.1:5173>. The API runs on port 3001 and stores data in `data/sublease-master.sqlite`. It also seeds the same ten fictional listings. Local photos are stored in `public/uploads/`.

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

## Check

```bash
npm test
npm run build
```

The API test uses a temporary database and checks the student account, email verification, draft, upload, demo checkout, search, favorite, inquiry, reply, and availability flow. It does not exercise live Stripe or SMTP credentials.
