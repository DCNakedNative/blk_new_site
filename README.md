# The Shenanigators site update

Everything in this folder replaces or adds to files in your project. **Every file goes in
the same folder it came from** (for example `frontend/src/pages/Events.js` replaces the
Events.js in `frontend/src/pages/`). Brand-new files go in the folders shown here.

## Before you start (5 minutes)

1. **Back up what works today.** In Emergent, use *Save to GitHub* so the current site is saved.
   Do the upload below on a **new branch** (for example `site-update`), not your main branch.
2. **Set two backend settings** (in the backend `.env` file, or wherever Emergent keeps backend settings):
   - `JWT_SECRET_KEY` = a long random value (64+ random characters; any password generator works).
     Without it the site still works, but everyone is signed out whenever the server restarts.
   - `CORS_ORIGINS` = `https://www.black-nudist.com` (add other addresses with commas if you use more than one).
3. **Add one new package:** `react-markdown` (already listed in the new `frontend/package.json`).
   Emergent needs to run `yarn install` after you upload.

## What's in the folder

backend/
- `server.py` replaces your server.py (security fixes, private addresses, RSVP cancel, drafts, submissions)
- `requirements.txt` replaces yours (only what the site actually uses)
- `seed_data.py` replaces yours (it can no longer wipe your real data)
- `purge_demo_data.py` NEW (finds and removes the leftover demo events/posts/trips)

frontend/
- `package.json`, `tailwind.config.js`, `public/index.html` replace yours
- `src/App.js`, `App.css`, `index.css` replace yours
- `src/pages/` replaces Home, Events, EventDetail, Blog, BlogDetail, Travel, TravelDetail, Dashboard, Auth, AboutUs, Admin and adds SubmitEvent, Guidelines, NotFound
- `src/components/` replaces Navigation and adds Footer, Field, PageMeta, StateViews, EventCalendar
- `src/config.js`, `src/AuthContext.js`, `src/lib/`, `src/hooks/` are all NEW
- Leave `src/index.js`, `craco.config.js`, `jsconfig.json` and `src/components/ui/` alone.

## After it's running, check these

- [ ] Open the site on your phone: the menu button works and the calendar is readable.
- [ ] **Remove the demo content** (events like "Tech Innovation Summit", posts by "Sarah Chen", trips like "Bali Paradise Escape"). Easiest: Admin > delete each one. Or run `python purge_demo_data.py` (it only lists) and then `python purge_demo_data.py --delete`.
- [ ] Create a test event in Admin, add an "Exact address", RSVP with a second account, and confirm only that account sees the address.
- [ ] Sign out and confirm /admin shows "Admins only".
- [ ] Read the **Community guidelines & privacy** page (src/pages/Guidelines.js). It is draft wording: change anything that doesn't match how you run things.

## Things that behave differently now

- Nobody becomes admin automatically. Your existing admin keeps access. On a brand-new empty database, register and then run `python make_admin.py add your@email`.
- Events show a public area (city); the exact address appears only after someone RSVPs.
- Past events are hidden by default (there's a "Show past events" checkbox).
- "Travel packages" are now "Trips". Price and dates are optional.
- Blog posts accept simple formatting (Markdown) and can be saved as drafts.
- The orange is a little deeper (`#C23A00`) so white text on it is readable. Change it in `tailwind.config.js` and `App.css`.
- Event times are shown exactly as you type them (the event's local time).

## Not done

- Search engines still get a blank page until JavaScript runs (needs a bigger change: pre-rendering).
- The Emergent badge and PostHog analytics are still in `public/index.html` (comments there explain how to remove them).
- The hero photo is still the stock photo, and the About photo is still hosted by Emergent. Save copies to your own storage.
- No account-deletion button yet (the privacy page tells people to email you).
- Optional cleanup after confirming nothing imports them: `yarn remove react-calendar react-day-picker`.
