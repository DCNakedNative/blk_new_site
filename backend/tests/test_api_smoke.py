"""End-to-end smoke tests for the Shenanigators backend API."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://3383447c-4244-46e5-970f-5547be46020a.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@shenanigators.com"
ADMIN_PASS = "AdminPass123!"


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def user_token():
    # Register a fresh user per test run
    email = f"TEST_user_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "password": "Password123!", "name": "Test User"
    })
    assert r.status_code == 200, r.text
    return r.json()["token"], email


def h(token):
    return {"Authorization": f"Bearer {token}"}


# ---- Auth ----
class TestAuth:
    def test_login_admin(self, admin_token):
        assert admin_token

    def test_me_admin(self, admin_token):
        r = requests.get(f"{API}/auth/me", headers=h(admin_token))
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["is_admin"] is True

    def test_login_bad_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_register_user(self, user_token):
        token, email = user_token
        r = requests.get(f"{API}/auth/me", headers=h(token))
        assert r.status_code == 200
        assert r.json()["is_admin"] is False


# ---- Events ----
class TestEvents:
    created_event_id = None

    def test_list_events_public(self):
        r = requests.get(f"{API}/events")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_non_admin_cannot_create(self, user_token):
        token, _ = user_token
        r = requests.post(f"{API}/events", headers=h(token), json={
            "title": "x", "description": "x", "date": "2026-10-10",
            "location": "x", "category": "x", "max_attendees": 10
        })
        assert r.status_code == 403

    def test_admin_create_event(self, admin_token):
        payload = {
            "title": "TEST_Event",
            "description": "A test event",
            "date": "2026-12-01T18:00",
            "location": "Austin, TX",
            "location_details": "123 Secret St, Austin TX",
            "category": "social",
            "max_attendees": 20
        }
        r = requests.post(f"{API}/events", headers=h(admin_token), json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["title"] == "TEST_Event"
        TestEvents.created_event_id = data["id"]

    def test_public_event_hides_address(self):
        assert TestEvents.created_event_id
        r = requests.get(f"{API}/events/{TestEvents.created_event_id}")
        assert r.status_code == 200
        assert r.json().get("location_details") in (None, "")

    def test_user_without_rsvp_hides_address(self, user_token):
        token, _ = user_token
        r = requests.get(f"{API}/events/{TestEvents.created_event_id}", headers=h(token))
        assert r.status_code == 200
        assert r.json().get("location_details") in (None, "")

    def test_rsvp_and_see_address(self, user_token):
        token, email = user_token
        r = requests.post(f"{API}/rsvp", headers=h(token), json={
            "event_id": TestEvents.created_event_id,
            "name": "Test User", "email": email
        })
        assert r.status_code == 200, r.text
        rsvp_id = r.json()["id"]

        # Now address should be visible
        r2 = requests.get(f"{API}/events/{TestEvents.created_event_id}", headers=h(token))
        assert r2.status_code == 200
        assert r2.json().get("location_details") == "123 Secret St, Austin TX"

        # Cancel RSVP
        r3 = requests.delete(f"{API}/rsvp/{rsvp_id}", headers=h(token))
        assert r3.status_code == 200

        # Address hidden again
        r4 = requests.get(f"{API}/events/{TestEvents.created_event_id}", headers=h(token))
        assert r4.json().get("location_details") in (None, "")

    def test_admin_delete_event(self, admin_token):
        r = requests.delete(f"{API}/events/{TestEvents.created_event_id}", headers=h(admin_token))
        assert r.status_code == 200


# ---- Blog ----
class TestBlog:
    def test_list_public(self):
        r = requests.get(f"{API}/blog")
        assert r.status_code == 200

    def test_admin_create_published_and_draft(self, admin_token):
        pub = requests.post(f"{API}/blog", headers=h(admin_token), json={
            "title": "TEST_Published", "content": "Hello", "excerpt": "e",
            "category": "news", "tags": ["t1"], "published": True
        })
        assert pub.status_code == 200, pub.text
        draft = requests.post(f"{API}/blog", headers=h(admin_token), json={
            "title": "TEST_Draft", "content": "Hidden", "excerpt": "e",
            "category": "news", "tags": [], "published": False
        })
        assert draft.status_code == 200, draft.text

        # Public listing should include published but not draft
        pub_list = requests.get(f"{API}/blog").json()
        titles = {p["title"] for p in pub_list}
        assert "TEST_Published" in titles
        assert "TEST_Draft" not in titles

        # Draft should 404 for anonymous
        r = requests.get(f"{API}/blog/{draft.json()['id']}")
        assert r.status_code == 404

        # Clean up
        requests.delete(f"{API}/blog/{pub.json()['id']}", headers=h(admin_token))
        requests.delete(f"{API}/blog/{draft.json()['id']}", headers=h(admin_token))


# ---- Travel / Trips ----
class TestTravel:
    def test_list(self):
        r = requests.get(f"{API}/travel-packages")
        assert r.status_code == 200

    def test_admin_crud(self, admin_token):
        r = requests.post(f"{API}/travel-packages", headers=h(admin_token), json={
            "title": "TEST_Trip", "description": "A trip", "destination": "Costa Rica",
            "duration": "7 days", "highlights": ["beach", "jungle"]
        })
        assert r.status_code == 200, r.text
        pid = r.json()["id"]
        r2 = requests.get(f"{API}/travel-packages/{pid}")
        assert r2.status_code == 200
        assert r2.json()["title"] == "TEST_Trip"
        requests.delete(f"{API}/travel-packages/{pid}", headers=h(admin_token))


# ---- Submissions ----
class TestSubmissions:
    def test_submit_event(self):
        r = requests.post(f"{API}/event-submissions", json={
            "title": "TEST_Submission", "description": "desc", "when": "March 14",
            "location": "Austin", "contact_name": "Jane", "contact_email": "jane@example.com"
        })
        assert r.status_code == 200

    def test_admin_requires_auth(self):
        r = requests.get(f"{API}/admin/submissions")
        assert r.status_code in (401, 403)
