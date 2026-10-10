"""Tests for change-password + delete-account + regression on /trips."""
import os
import uuid
import time
import requests
import pytest

BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/') if os.environ.get('REACT_APP_BACKEND_URL') else None
if not BASE_URL:
    # fall back to frontend/.env for pytest run from backend dir
    with open('/app/frontend/.env') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                BASE_URL = line.strip().split('=', 1)[1].rstrip('/')
                break

ADMIN_EMAIL = 'admin@shenanigators.com'
ADMIN_PASSWORD = 'AdminPass123!'


def _uniq_email():
    return f"TEST_{uuid.uuid4().hex[:10]}@example.com"


@pytest.fixture
def api():
    return requests.Session()


def _register(api, email=None, pw='SuperSafe123!', name='Account Mgmt Test'):
    email = email or _uniq_email()
    r = api.post(f"{BASE_URL}/api/auth/register", json={"email": email, "password": pw, "name": name})
    assert r.status_code == 200, r.text
    return email, pw, r.json()["token"], r.json()["user"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- change-password ----------
class TestChangePassword:
    def test_wrong_current_password_returns_400(self, api):
        email, pw, tok, _ = _register(api)
        r = api.post(f"{BASE_URL}/api/auth/change-password", headers=_auth(tok),
                     json={"current_password": "WrongPassword1!", "new_password": "NewPassword123!"})
        assert r.status_code == 400
        assert "current password is incorrect" in r.json().get("detail", "").lower()

    def test_short_new_password_422(self, api):
        _, _, tok, _ = _register(api)
        r = api.post(f"{BASE_URL}/api/auth/change-password", headers=_auth(tok),
                     json={"current_password": "SuperSafe123!", "new_password": "short"})
        assert r.status_code == 422

    def test_success_and_old_password_fails(self, api):
        email, pw, tok, _ = _register(api)
        new_pw = "ChangedPass456!"
        r = api.post(f"{BASE_URL}/api/auth/change-password", headers=_auth(tok),
                     json={"current_password": pw, "new_password": new_pw})
        assert r.status_code == 200
        assert "Password updated" in r.json().get("message", "")
        # old pw fails
        r_old = api.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": pw})
        assert r_old.status_code == 401
        # new pw works
        r_new = api.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": new_pw})
        assert r_new.status_code == 200
        assert "token" in r_new.json()

    def test_requires_auth(self, api):
        r = api.post(f"{BASE_URL}/api/auth/change-password",
                     json={"current_password": "x", "new_password": "longenoughpass"})
        assert r.status_code in (401, 403)


# ---------- delete-account ----------
class TestDeleteAccount:
    def test_wrong_password_rejected(self, api):
        _, _, tok, _ = _register(api)
        r = api.post(f"{BASE_URL}/api/auth/delete-account", headers=_auth(tok),
                     json={"password": "WrongPassword9!"})
        assert r.status_code == 400
        assert "current password is incorrect" in r.json()["detail"].lower()

    def test_success_decrements_event_attendees_and_removes_login(self, api):
        # admin creates event + trip
        r = api.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200, r.text
        admin_tok = r.json()["token"]

        event_payload = {
            "title": f"TEST_evt_{uuid.uuid4().hex[:6]}",
            "description": "test event", "date": "2099-10-10",
            "location": "Somewhere", "category": "social", "max_attendees": 10,
        }
        e = api.post(f"{BASE_URL}/api/events", headers=_auth(admin_tok), json=event_payload)
        assert e.status_code == 200, e.text
        event = e.json()
        event_id = event["id"]
        assert event["attendees_count"] == 0

        trip_payload = {
            "title": f"TEST_trip_{uuid.uuid4().hex[:6]}",
            "description": "test trip", "destination": "Nowhere",
        }
        t = api.post(f"{BASE_URL}/api/travel-packages", headers=_auth(admin_tok), json=trip_payload)
        assert t.status_code == 200, t.text
        pkg_id = t.json()["id"]

        # regular user register, rsvp, inquiry
        email, pw, tok, user = _register(api)
        r_rsvp = api.post(f"{BASE_URL}/api/rsvp", headers=_auth(tok),
                          json={"event_id": event_id, "name": user["name"], "email": email})
        assert r_rsvp.status_code == 200, r_rsvp.text

        r_inq = api.post(f"{BASE_URL}/api/booking-inquiries", headers=_auth(tok),
                         json={"package_id": pkg_id, "name": user["name"], "email": email,
                               "phone": "123", "message": "hi", "travel_date": ""})
        assert r_inq.status_code == 200, r_inq.text

        # event attendees_count should be 1
        g = api.get(f"{BASE_URL}/api/events/{event_id}")
        assert g.json()["attendees_count"] == 1

        # delete account
        d = api.post(f"{BASE_URL}/api/auth/delete-account", headers=_auth(tok), json={"password": pw})
        assert d.status_code == 200, d.text

        # login fails
        rl = api.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": pw})
        assert rl.status_code == 401

        # /me with old token fails
        rme = api.get(f"{BASE_URL}/api/auth/me", headers=_auth(tok))
        assert rme.status_code == 404  # user not found (token still signature-valid)

        # attendees_count decremented
        g2 = api.get(f"{BASE_URL}/api/events/{event_id}")
        assert g2.json()["attendees_count"] == 0

        # cleanup event + trip
        api.delete(f"{BASE_URL}/api/events/{event_id}", headers=_auth(admin_tok))
        api.delete(f"{BASE_URL}/api/travel-packages/{pkg_id}", headers=_auth(admin_tok))

    def test_only_admin_cannot_delete_self(self, api):
        r = api.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        admin_tok = r.json()["token"]
        d = api.post(f"{BASE_URL}/api/auth/delete-account", headers=_auth(admin_tok),
                     json={"password": ADMIN_PASSWORD})
        assert d.status_code == 400
        assert "only admin" in d.json()["detail"].lower()
        # admin still works
        me = api.get(f"{BASE_URL}/api/auth/me", headers=_auth(admin_tok))
        assert me.status_code == 200
        assert me.json()["is_admin"] is True


# ---------- /trips routing (backend uses same travel-packages API) ----------
class TestTripsRouting:
    def test_travel_packages_listing_and_detail(self, api):
        # admin create a trip, verify GET
        r = api.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        admin_tok = r.json()["token"]
        payload = {"title": f"TEST_trip_route_{uuid.uuid4().hex[:5]}",
                   "description": "x", "destination": "Here"}
        c = api.post(f"{BASE_URL}/api/travel-packages", headers=_auth(admin_tok), json=payload)
        assert c.status_code == 200
        tid = c.json()["id"]

        # list
        lst = api.get(f"{BASE_URL}/api/travel-packages")
        assert lst.status_code == 200
        assert any(p["id"] == tid for p in lst.json())

        # detail
        det = api.get(f"{BASE_URL}/api/travel-packages/{tid}")
        assert det.status_code == 200
        assert det.json()["title"] == payload["title"]

        # cleanup
        api.delete(f"{BASE_URL}/api/travel-packages/{tid}", headers=_auth(admin_tok))
