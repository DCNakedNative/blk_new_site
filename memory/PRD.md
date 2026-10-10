# The Shenanigators (blk_new_site)
## Original request
Clone https://github.com/DCNakedNative/blk_new_site.git, get it running, then await further changes.
## Architecture
React (CRA + craco, Tailwind) frontend; FastAPI + MongoDB backend (server.py). Pages: Home, Events (list/calendar, RSVP with private address), Blog (markdown, drafts), Travel/Trips, About, Guidelines, Submit Event, Dashboard, Admin.
## Done (Jun 2026)
- Added missing scaffold: frontend index.js, craco/postcss/jsconfig, .env files, backend make_admin.py
- Admin seeded: admin@shenanigators.com; tests 100% backend + frontend
## Backlog
- /trips alias for /travel; pre-rendering for SEO; account deletion; remove Emergent badge/PostHog; self-host hero/about photos
