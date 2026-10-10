# Auth testing notes
- Login/register: POST /api/auth/login, /api/auth/register -> {token, user}; Bearer token (localStorage), not cookies.
- Forgot: POST /api/auth/forgot-password {email} -> always generic message; link logged in /var/log/supervisor/backend.err.log as "PASSWORD RESET LINK for <email>: <url>".
- Reset: POST /api/auth/reset-password {token, password>=8}; token single-use, 1h expiry (TTL index on password_reset_tokens.expires_at), stored as sha256 hash.
- Admin seeded on startup from ADMIN_EMAIL/ADMIN_PASSWORD in backend/.env (creates if missing, re-syncs password + is_admin if changed).
- Users schema: {id, email, name, password (bcrypt), is_admin}
