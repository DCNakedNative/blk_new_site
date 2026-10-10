"""Tests for new auth flows: forgot/reset password + admin seeding + regression."""
import os
import re
import time
import uuid
import subprocess
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://blk-new-site.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"
BACKEND_LOG = "/var/log/supervisor/backend.err.log"
ADMIN_EMAIL = "admin@shenanigators.com"
ADMIN_PASSWORD = "AdminPass123!"


def _unique_email():
    return f"TEST_{uuid.uuid4().hex[:10]}@example.com"


def _read_reset_link(email: str, since_bytes: int) -> str | None:
    """Scan backend log (from offset since_bytes) for the reset link for the email."""
    for _ in range(10):
        time.sleep(0.3)
        try:
            with open(BACKEND_LOG, "rb") as f:
                f.seek(since_bytes)
                data = f.read().decode(errors="ignore")
        except FileNotFoundError:
            return None
        m = re.search(rf"PASSWORD RESET LINK for {re.escape(email)}: (\S+)", data)
        if m:
            return m.group(1)
    return None


def _log_offset() -> int:
    try:
        return os.path.getsize(BACKEND_LOG)
    except OSError:
        return 0


@pytest.fixture
def s():
    return requests.Session()


# --- Regression: register / login / me ---
class TestAuthRegression:
    def test_register_login_me(self, s):
        email = _unique_email()
        r = s.post(f"{API}/auth/register", json={"email": email, "password": "Password123!", "name": "Reg User"})
        assert r.status_code == 200, r.text
        tok = r.json()["token"]
        assert r.json()["user"]["email"] == email
        assert r.json()["user"]["is_admin"] is False

        # login
        r2 = s.post(f"{API}/auth/login", json={"email": email, "password": "Password123!"})
        assert r2.status_code == 200
        tok2 = r2.json()["token"]

        # me
        me = s.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {tok2}"})
        assert me.status_code == 200
        assert me.json()["email"] == email

        # bad password -> 401
        bad = s.post(f"{API}/auth/login", json={"email": email, "password": "WrongPass!"})
        assert bad.status_code == 401

    def test_duplicate_register(self, s):
        email = _unique_email()
        s.post(f"{API}/auth/register", json={"email": email, "password": "Password123!", "name": "Dup"})
        r = s.post(f"{API}/auth/register", json={"email": email, "password": "Password123!", "name": "Dup2"})
        assert r.status_code == 400


# --- Admin seeding ---
class TestAdminSeed:
    def test_admin_login_and_is_admin(self, s):
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user"]["is_admin"] is True
        tok = data["token"]
        # Verify admin can hit an admin endpoint
        r2 = s.get(f"{API}/admin/events", headers={"Authorization": f"Bearer {tok}"})
        assert r2.status_code == 200


# --- Forgot/Reset Password ---
class TestPasswordReset:
    def test_forgot_unknown_email_returns_generic(self, s):
        r = s.post(f"{API}/auth/forgot-password", json={"email": f"nouser_{uuid.uuid4().hex[:6]}@example.com"})
        assert r.status_code == 200
        assert "reset link" in r.json()["message"].lower()

    def test_full_reset_flow(self, s):
        # Create a fresh user
        email = _unique_email()
        old_pw = "OldPass123!"
        new_pw = "NewPass456!"
        reg = s.post(f"{API}/auth/register", json={"email": email, "password": old_pw, "name": "Reset User"})
        assert reg.status_code == 200

        # Request reset
        offset = _log_offset()
        r = s.post(f"{API}/auth/forgot-password", json={"email": email})
        assert r.status_code == 200

        link = _read_reset_link(email, offset)
        assert link, "Reset link was not logged to backend.err.log"
        m = re.search(r"token=([^&\s]+)", link)
        assert m, f"No token in link: {link}"
        token = m.group(1)

        # Reset password
        rp = s.post(f"{API}/auth/reset-password", json={"token": token, "password": new_pw})
        assert rp.status_code == 200, rp.text

        # Old password no longer works
        bad = s.post(f"{API}/auth/login", json={"email": email, "password": old_pw})
        assert bad.status_code == 401

        # New password works
        good = s.post(f"{API}/auth/login", json={"email": email, "password": new_pw})
        assert good.status_code == 200

        # Reused token fails
        reuse = s.post(f"{API}/auth/reset-password", json={"token": token, "password": "Another123!"})
        assert reuse.status_code == 400
        assert "invalid" in reuse.json()["detail"].lower() or "expired" in reuse.json()["detail"].lower()

    def test_invalid_token(self, s):
        r = s.post(f"{API}/auth/reset-password", json={"token": "not-a-real-token-xxxxxxxxxx", "password": "Whatever123!"})
        assert r.status_code == 400


# --- Admin re-seeding after deletion ---
class TestAdminReseed:
    def test_admin_recreated_after_delete(self):
        # Use pymongo directly to delete the admin, then restart backend
        try:
            from pymongo import MongoClient
        except ImportError:
            pytest.skip("pymongo not available")
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        db_name = os.environ.get('DB_NAME', 'test_database')
        mc = MongoClient(mongo_url)
        res = mc[db_name].users.delete_one({"email": ADMIN_EMAIL})
        assert res.deleted_count == 1, "Admin user not found to delete"

        # Restart backend
        subprocess.run(["sudo", "supervisorctl", "restart", "backend"], check=True, capture_output=True)
        # Wait for backend to come back
        for _ in range(30):
            try:
                hr = requests.get(f"{API}/events", timeout=3)
                if hr.status_code == 200:
                    break
            except Exception:
                pass
            time.sleep(1)

        # Give seed_admin a moment
        time.sleep(2)

        # Admin can log in again
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200, f"Admin not re-seeded: {r.status_code} {r.text}"
        assert r.json()["user"]["is_admin"] is True
