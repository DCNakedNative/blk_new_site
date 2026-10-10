# Test Credentials
Admin (auto-seeded from backend/.env ADMIN_EMAIL/ADMIN_PASSWORD): admin@shenanigators.com / AdminPass123!
Promote other users: cd /app/backend && python make_admin.py add <email>
Auth endpoints: /api/auth/change-password, /api/auth/delete-account, /api/auth/register, /api/auth/login, /api/auth/me, /api/auth/forgot-password, /api/auth/reset-password
Reset links are logged in /var/log/supervisor/backend.err.log ("PASSWORD RESET LINK for ...")
