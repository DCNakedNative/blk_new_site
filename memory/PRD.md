# The Shenanigators (blk_new_site)
## Original request
Clone https://github.com/DCNakedNative/blk_new_site.git, get it running, then await further changes.
## Architecture
React (CRA + craco, Tailwind) frontend; FastAPI + MongoDB backend (server.py). Pages: Home, Events (list/calendar, RSVP with private address), Blog (markdown, drafts), Travel/Trips, About, Guidelines, Submit Event, Dashboard, Admin.
## Done (Jun 2026)
- Forgot/reset password flow (/forgot-password, /reset-password; link logged to backend log, 1h single-use hashed tokens)
- Admin auto-seeded from ADMIN_EMAIL/ADMIN_PASSWORD on startup
- /trips and /trips/:id open Trips pages
- Add to Calendar (Google link + Apple/Outlook .ics) on RSVP cards, week list, event detail
- Dashboard "Coming up this week" list of RSVP'd events (next 7 days)
- Dashboard Account settings: change password (needs current pw), delete account (needs pw; removes RSVPs, inquiries; last admin blocked)
- Added missing scaffold: frontend index.js, craco/postcss/jsconfig, .env files, backend make_admin.py
- Admin seeded: admin@shenanigators.com; tests 100% backend + frontend
## Backlog
- Send reset emails via Resend/SendGrid (currently MOCKED: logged only)
- /trips alias for /travel; pre-rendering for SEO; remove Emergent badge/PostHog; self-host hero/about photos
