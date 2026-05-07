# CLAUDE.md — JiraniHub Project Brief
# Smart Estate Management Platform for Kenyan Communities
# Version: 2.0 (Clean Build) | Owner: Wanjiku Maina

---

## WHAT THIS IS

JiraniHub is a mobile-first, full-stack estate management platform built
specifically for Kenyan gated communities. It is the digital infrastructure
layer that replaces the WhatsApp groups, paper logbooks, and verbal
announcements that currently "manage" most Nairobi estates.

It is a commercial product — not a hobby project. Design and build
accordingly.

---

## TECH STACK

### Frontend
- React 18 + TypeScript
- Vite (build tool + HMR)
- Tailwind CSS (utility-first styling)
- shadcn/ui components (built on Radix UI)
- Wouter (lightweight client-side routing)
- TanStack Query / React Query (server state + caching)
- React Hook Form + Zod (form handling + validation)
- WebSocket client (real-time updates)
- IndexedDB (offline-first storage for critical forms)

### Backend
- Node.js + Express.js (TypeScript, ES modules)
- Drizzle ORM (type-safe DB operations)
- Lucia Auth (phone number + password authentication)
- Express sessions + connect-pg-simple (PostgreSQL session storage)
- WebSocket server (ws library, real-time events)
- node-cron (scheduled cleanup jobs)

### Database
- PostgreSQL via Neon (serverless, cloud-hosted)
- Drizzle migrations (version-controlled schema)

### Payments
- M-PESA Daraja API (STK Push, C2B, B2C)
- Safaricom sandbox → production toggle

### SMS / Notifications
- Africa's Talking or Twilio (Kenyan telecom support)
- Multi-provider fallback: Safaricom → Airtel → Telkom

---

## COMMANDS

```bash
npm run dev          # Start dev server (frontend + backend concurrently)
npm run build        # Production build
npm run db:push      # Push Drizzle schema to database
npm run db:migrate   # Run migrations
npm run db:studio    # Open Drizzle Studio (DB viewer)
npm run typecheck    # TypeScript type checking
```

---

## ENVIRONMENT VARIABLES

Create a `.env` file in project root:

```
DATABASE_URL=postgresql://user:pass@your-neon-host/jiranihub
SESSION_SECRET=long_random_string_minimum_32_characters
MPESA_CONSUMER_KEY=your_daraja_consumer_key
MPESA_CONSUMER_SECRET=your_daraja_consumer_secret
MPESA_SHORTCODE=your_paybill_or_till_number
MPESA_PASSKEY=your_lipa_na_mpesa_passkey
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback
MPESA_ENVIRONMENT=sandbox   # Change to 'production' when live
SMS_API_KEY=your_africastalking_api_key
SMS_USERNAME=your_africastalking_username
NODE_ENV=development
PORT=5000
```

---

## AUTHENTICATION SYSTEM

### Provider: Lucia Auth (NOT Replit Auth — that is gone)

### Login Method
- Kenyan phone number + password
- Supported formats: 0722123456 / +254722123456 / 254722123456
- Normalize all formats to +254XXXXXXXXX on storage

### Four User Roles

| Role      | Access Level | Description |
|-----------|-------------|-------------|
| resident  | Standard    | Household account — visitors, maintenance, payments |
| admin     | Full        | Estate manager — all modules, reports, settings |
| security  | Gate        | Visitor check-in/out, gate log, emergency response |
| vendor    | Limited     | Marketplace listings, service bookings only |

### Session Management
- HTTP-only cookies (CSRF protected)
- PostgreSQL-backed sessions via connect-pg-simple
- Role stored in session, not JWT

---

## DATABASE SCHEMA — CORE TABLES

```
users              — id, phone, password_hash, name, role, estate_id, created_at
estates            — id, name, location, admin_id, subscription_tier, created_at
visitors           — id, resident_id, name, phone, qr_code, status, check_in, check_out
maintenance_tickets — id, resident_id, title, description, category, priority, status, assigned_to
fundraising        — id, estate_id, title, goal_amount, current_amount, deadline, status
donations          — id, campaign_id, donor_id, amount, mpesa_ref, anonymous, created_at
announcements      — id, estate_id, title, body, priority, author_id, created_at
events             — id, estate_id, title, description, start_time, end_time, location
emergency_alerts   — id, user_id, type, location_lat, location_lng, description, status, created_at
notifications      — id, user_id, title, body, type, read, created_at
service_providers  — id, name, category, phone, rating, estate_id, verified
bookings           — id, facility_id, user_id, start_time, end_time, status
votes              — id, poll_id, user_id, option_id, anonymous, created_at
sessions           — id, user_id, expires_at (connect-pg-simple managed)
```

---

## NINE CORE MODULES

### 1. Security & Visitor Management
- Resident pre-registers visitor → QR code generated → SMS sent to visitor
- Security scans QR at gate → check-in logged → resident notified
- Gate log: full entry/exit history with timestamps
- Panic button: resident/security triggers alert → escalation chain fires

### 2. Maintenance Ticketing
- Resident submits: title, category (plumbing/electrical/roads/landscaping),
  priority (low/medium/high/urgent), photos optional
- Admin assigns to vendor or internal staff
- Status flow: open → assigned → in-progress → resolved → closed
- Resident gets push + SMS notifications on status changes

### 3. Payments (M-PESA)
- Service charge collection (estate levy via STK Push)
- Utility split payments
- Fundraising campaign donations (anonymous option available)
- Marketplace vendor payments
- All transactions stored with M-PESA reference numbers
- Payment receipts auto-generated

### 4. Communication & Announcements
- Admin broadcasts: push + SMS + in-app
- Priority levels: info / warning / urgent
- Residents can acknowledge/read receipts
- Document library: estate rules, minutes, notices (PDF upload)

### 5. Community Marketplace
- Verified service providers: plumbers, electricians, cleaners, tutors, food vendors
- Resident ratings and reviews
- Booking + payment integrated
- Estate admin verifies/approves new provider listings

### 6. Events & Community Calendar
- Admin creates events: AGMs, clean-ups, kids' activities, sports
- RSVP system with headcount tracking
- Event reminders (24h + 1h before)
- Recurring event support

### 7. Governance & Voting
- Polls: admin creates → residents vote → results displayed
- Anonymous voting option for sensitive matters
- Committee member listing + transparency dashboard
- Meeting minutes upload + archive

### 8. Facility & Asset Booking
- Clubhouse, parking slots, gym, swimming pool, shared spaces
- Time-slot based booking calendar
- Conflict prevention (double-booking blocked)
- Admin approval for premium facilities

### 9. Emergency Layer
- GPS distress button: captures location → alerts security + admin + estate contacts
- Kenya emergency numbers pre-loaded: Police 999, Ambulance 999, Fire 999
- Incident log with response tracking
- Area-wide emergency broadcast (admin only)

---

## DESIGN SYSTEM

### Visual Identity
- Primary theme: Kenyan / East African aesthetic
- Kenya flag colors as accent: Red (#BB0000), Green (#006600), Black (#000000)
- Main brand color: Deep Forest Green (#1A5C38)
- Secondary: Warm Amber (#D47A00) — echoes Kenyan earth tones
- Background: Clean white (#FFFFFF) with subtle warm grey cards (#F8F7F5)
- Mobile-first: all layouts designed for 375px viewport upward

### Typography
- Headings: Inter or Plus Jakarta Sans (clean, modern, readable on mobile)
- Body: Inter 14px/16px
- Swahili language support where relevant (labels, notifications)

### UX Principles
- Works on 3G connectivity — no heavy bundles, lazy load everything
- Offline-first for: emergency alerts, maintenance form drafts, visitor pre-reg
- Touch targets minimum 44px (Kenyan mobile users, often on budget Android devices)
- SMS fallback for all critical notifications (not everyone has data)

---

## COMPONENT ARCHITECTURE

Keep it clean. Maximum 40–50 components total (the Replit prototype had 126
due to iterative patching — do not repeat that pattern).

### Structure
```
client/src/
├── components/
│   ├── ui/              # shadcn/ui base components only
│   ├── auth/            # Login, phone input, role gate
│   ├── visitor/         # QR generation, gate scanner, check-in
│   ├── maintenance/     # Ticket form, ticket list, admin view
│   ├── payments/        # M-PESA STK trigger, receipt, history
│   ├── announcements/   # Feed, compose, priority badge
│   ├── emergency/       # Panic button, alert feed, GPS capture
│   ├── marketplace/     # Provider cards, booking, ratings
│   ├── events/          # Calendar, RSVP, event card
│   ├── governance/      # Poll create, vote, results
│   ├── bookings/        # Facility grid, time picker, confirmation
│   └── shared/          # Navigation, layout, loading, error boundary
├── pages/
│   ├── landing.tsx      # Public marketing page
│   ├── login.tsx        # Phone + password auth
│   ├── resident/        # Resident dashboard + module pages
│   ├── admin/           # Admin dashboard + management pages
│   ├── security/        # Gate dashboard + scanner
│   └── vendor/          # Vendor profile + listings
├── hooks/               # useAuth, useWebSocket, useOfflineSync
├── lib/                 # queryClient, api helpers, utils
└── types/               # Shared TypeScript interfaces
```

---

## WHAT TO IGNORE FROM OLD CODEBASE

If referencing the Replit export for logic, SKIP these entirely:
- gamified-engagement-broken.tsx (deprecated, non-functional)
- All files ending in -old.tsx, -simple.tsx, -test.tsx (prototyping leftovers)
- Any hardcoded reference to "Mary Wanjiku" — use dynamic auth user
- All duplicate component variants (e.g. enhanced-X, improved-X, fixed-X) —
  build one correct version instead
- Replit Auth / OpenID Connect / Replit-specific environment variables

---

## DEPLOYMENT TARGET

### Platform: Railway.app (primary) or Render.com (fallback)
- Handles Node.js backend + PostgreSQL + static frontend in one project
- Auto-deploy from GitHub on push to main
- Environment variables managed in Railway dashboard

### Domain
- Custom domain: jiranihub.co.ke (or similar .co.ke)
- HTTPS enforced
- M-PESA callback URL must be HTTPS — Railway provides this by default

---

## BUSINESS CONTEXT

- Market: Kenyan gated communities, housing estates, apartment blocks
- Revenue model: SaaS (per-estate monthly subscription, tiered by unit count)
- Target customer: Estate management companies, residents' associations,
  property developers
- Competitive context: Most estates run on WhatsApp + paper + spreadsheets
- USP: The only platform built specifically for Kenyan estates with native
  M-PESA integration and offline-first architecture for poor connectivity zones

---

## OWNER NOTES

- Owner is Wanjiku Maina — Nairobi-based, tech entrepreneur
- Systems thinker: prioritise clean architecture over feature bloat
- Commercial intent: this is a product to sell, not a portfolio demo
- Kenyan context is non-negotiable: M-PESA, Safaricom, 0722 numbers, Swahili
  labels, load-shedding/outage awareness, mobile data consciousness
