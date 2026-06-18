@AGENTS.md

# ArtConnect (The Local Art Hub) — Codebase Guide

## Project Overview

A marketplace platform for creative professionals in Italy. Artists create profiles, list portfolios and packages, and accept bookings. Clients browse artists by category/location and send booking requests. Live at `thelocalarthub.com`.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript 5 · Tailwind CSS 4 · Supabase (Postgres + Auth) · Cloudinary (media) · Resend (email) · Vercel (hosting)

---

## Directory Structure

```
app/
  api/              # Server-side API routes (POST only, no GETs)
    cancel-request/ # Cancel a booking request
    contact/        # Contact form → Resend email
    delete-account/ # Account deletion (uses service role key)
    newsletter/      # Newsletter signup → Resend welcome email
    notify/          # Booking/review notification emails
  components/       # Shared client components
  dashboard/        # Authenticated pages (artist/client dashboard)
    availability/   # Artist availability calendar
    bookings/       # Manage incoming/outgoing bookings
    portfolio/      # Upload & manage portfolio items
    settings/       # Profile settings
    setup/          # Artist onboarding wizard
  artists/          # Public artist directory + individual profiles
    [id]/           # Dynamic artist profile page
  auth/callback/    # OAuth redirect handler
  login/
  signup/
  (marketing pages) # contact, dmca, privacy, terms
  layout.tsx        # Root layout
  page.tsx          # Homepage
  globals.css       # Global styles
lib/
  config.ts         # Site-wide constants (SITE_NAME, SITE_URL, emails)
  supabase.ts       # Supabase client factory
  sanitize.ts       # DOMPurify HTML sanitization for rich captions
public/             # Static assets
supabase-*.sql      # Database schema files and migrations
```

---

## Key Conventions

### Components
- **Client components** must have `"use client"` at the top. Server components have no marker.
- Components go in `app/components/` if reused across routes; otherwise colocate with the page.
- File names: PascalCase (`NavbarAuth.tsx`). API routes: kebab-case folders (`cancel-request/`).

### Imports
- Use the `@/` alias (maps to repo root): `import { getSupabase } from "@/lib/supabase"`.

### Styling
- Tailwind CSS utility classes only — no CSS modules, no inline `style={}` unless truly dynamic.
- Design tokens (use consistently):
  - Background: `#F2EDE4` (off-white)
  - Accent/CTA: `#E5000F` (red)
  - Borders: `border border-black`
  - Logo font: `font-mr-dafoe`

### Supabase Client
- Always create the client with `getSupabase()` from `@/lib/supabase` — never instantiate directly.
- Row-Level Security (RLS) enforces authorization; trust it. Don't add redundant server-side user checks for read operations.
- For admin operations (e.g., deleting users) use the service role key in API routes only — never expose it to the client.

### Site Configuration
- All site-wide constants (name, URL, contact emails) live in `lib/config.ts`. Import from there; never hardcode.

### HTML / Rich Text
- Any user-generated HTML (e.g., rich captions) must be sanitized with `lib/sanitize.ts` before rendering with `dangerouslySetInnerHTML`.

---

## Database Schema

Core tables in Supabase (Postgres):

| Table | Purpose |
|-------|---------|
| `profiles` | One row per user; extends `auth.users` via FK |
| `portfolio_items` | Artist media uploads (image/video/audio) |
| `bookings` | Client → artist booking requests |
| `packages` | Artist pricing packages |
| `reviews` | Client reviews with optional artist replies |
| `availability_schedule` | Artist available time slots |
| `newsletter_subscribers` | Email list |

A Postgres trigger auto-creates a `profiles` row on `auth.users` INSERT, seeding `full_name` and `role` from signup metadata.

Schema migrations are tracked as `supabase-*.sql` files in the repo root. Apply them in Supabase Dashboard > SQL Editor or via the Supabase MCP tools.

---

## Authentication

Supabase Auth with three methods:
1. **Email/password** — redirects to `/signup/confirm` after signup
2. **Phone OTP** — international format (`+countrycode...`), verified via SMS
3. **OAuth** — Google, Apple, Facebook; callback handled at `/auth/callback`

---

## Media Uploads

Cloudinary unsigned uploads — the browser uploads directly to Cloudinary using `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` and `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`. No backend file handling.

---

## Email

All transactional email goes through Resend (`RESEND_API_KEY`, server-only). Sending happens inside API routes — never from client components.

---

## Environment Variables

| Variable | Side | Purpose |
|----------|------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | client | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client | Supabase public (anon) key |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | client | Cloudinary cloud name |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | client | Unsigned upload preset |
| `RESEND_API_KEY` | server | Email sending |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Admin DB operations |

Copy `.env.local.example` → `.env.local` to get started.

---

## Development

```bash
npm run dev     # Start dev server (localhost:3000)
npm run build   # Production build
npm run lint    # ESLint check
```

No test suite exists — manual testing required for UI changes.

---

## Deployment

Hosted on Vercel. Push to `main` triggers automatic deployment. Environment variables must be set in the Vercel project dashboard.

---

## Artist Categories

21+ disciplines including: photographers, musicians, makeup artists, graphic designers, videographers, illustrators, painters, sculptors, ceramicists, DJs, bands, event planners, florists, calligraphers, and more. Category slugs are defined in the codebase — check `app/artists/page.tsx` for the canonical list before adding new ones.
