# JIRANIHUB — CLAUDE CODE FIRST SESSION PROMPT
# Paste this entire block as your very first message in Claude Code
# After dropping CLAUDE.md into your project root

---

I am building JiraniHub — a commercial, mobile-first estate management 
platform for Kenyan gated communities. Read CLAUDE.md in full before 
proceeding. That is your complete technical and business brief.

## YOUR TASK: Bootstrap the clean production codebase from scratch.

Do not ask clarifying questions. Follow the CLAUDE.md specification and 
build in this exact sequence:

---

### PHASE 1 — Project Scaffold

Set up the monorepo with this structure:

```
jiranihub/
├── client/          React 18 + TypeScript + Vite + Tailwind + shadcn/ui
├── server/          Node.js + Express + TypeScript + Drizzle ORM
├── shared/          Shared types, schema, Zod validators
├── .env.example     All required environment variables (no real values)
├── CLAUDE.md        (already exists — do not overwrite)
├── package.json     Workspace root with concurrently dev script
├── tsconfig.json    Shared TypeScript config
└── drizzle.config.ts
```

Install all dependencies. Configure:
- Vite with React plugin and path aliases (@/ → client/src/)
- Tailwind with shadcn/ui preset
- Drizzle pointed at DATABASE_URL from .env
- TypeScript strict mode on both client and server
- ESBuild for server bundling

---

### PHASE 2 — Database Schema

Create the complete Drizzle schema in shared/schema.ts covering all tables
listed in CLAUDE.md. Apply these rules:
- All tables have created_at and updated_at timestamps
- Use UUIDs for primary keys (not integers)
- Foreign keys enforced at DB level
- Add appropriate indexes on frequently queried columns
  (user_id, estate_id, status, created_at)
- Soft delete (deleted_at nullable) on: users, visitors, maintenance_tickets

---

### PHASE 3 — Authentication

Implement Lucia Auth with:
- Phone number + password login
- Phone normalisation: accept 0722XXXXXX / +254722XXXXXX / 254722XXXXXX,
  store as +254722XXXXXX
- Password hashing with bcrypt (salt rounds: 12)
- Four roles: resident, admin, security, vendor
- Role-based route guards on both client and server
- HTTP-only session cookies with CSRF protection
- /api/auth/login, /api/auth/logout, /api/auth/me endpoints

Seed the database with one test account for each role:
- Admin:    +254700000001 / admin123  → role: admin
- Resident: +254700000002 / pass123   → role: resident  
- Security: +254700000003 / pass123   → role: security
- Vendor:   +254700000004 / pass123   → role: vendor
All assigned to a seeded estate: "Sunrise Gardens, Karen"

---

### PHASE 4 — Core Layout & Navigation

Build the shell:
- Public landing page (marketing — estate managers, what it does, pricing tiers)
- Login page (phone input with Kenyan format validation, password, role auto-detected)
- Role-based dashboard routing:
  - /dashboard/resident  → ResidentDashboard
  - /dashboard/admin     → AdminDashboard
  - /dashboard/security  → SecurityDashboard
  - /dashboard/vendor    → VendorDashboard
- Shared navigation header: estate name, user name, role badge, logout
- Mobile-first bottom tab navigation for resident + security dashboards
- Design tokens: Forest Green #1A5C38, Amber #D47A00, clean white, warm grey

---

### PHASE 5 — Module 1: Visitor Management (Priority Build)

This is the highest-value module for day-one estate managers. Build it fully:

**Resident side:**
- Create visitor pass: name, phone, expected date/time, purpose
- QR code generated on save (use qrcode package)
- SMS sent to visitor with QR code link (stub the SMS call if credentials absent)
- Visitor list: upcoming, active, past
- Cancel/expire a pass

**Security side:**
- QR scanner interface (use html5-qrcode or jsQR)
- Manual lookup by visitor phone as fallback
- Check-in button → timestamps logged → resident notified
- Check-out button → duration calculated
- Gate log: chronological entry/exit feed with search

**Admin side:**
- All visitor activity across the estate
- Export to CSV

---

### PHASE 6 — Module 2: Maintenance Ticketing

**Resident:**
- Submit ticket: title, category dropdown, priority, description, optional photo upload
- Track my tickets: status timeline, admin notes

**Admin:**
- All estate tickets with filter by status/priority/category
- Assign to vendor or mark self-managed
- Update status with comment
- Dashboard: open count, overdue count, avg resolution time

---

### AFTER PHASE 6

Stop and report:
1. What has been built and is working
2. Any blockers or decisions that need owner input
3. Proposed sequence for Phases 7–9 
   (Payments/M-PESA, Announcements, Emergency, Marketplace, Events, 
    Governance, Bookings)

Use Sonnet model for all coding phases. Switch to Opus only if you hit 
a genuine architecture decision that requires deep reasoning — flag it 
explicitly when you do.

Use /compact before starting each new Phase to manage context.

Build for production quality: typed, tested where practical, no console.log 
left in, no hardcoded credentials, no placeholder "TODO" functions that don't 
work. Every feature built should actually work end-to-end.

Go.
