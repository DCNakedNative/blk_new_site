"""Backend tests for Manage Admins (/api/admin/users)"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or \
    "https://3383447c-4244-46e5-970f-5547be46020a.preview.emergentagent.com"

ADMIN = {"email": "admin@shenanigators.com", "password": "AdminPass123!"}
MEMBER = {"email": "member@shenanigators.com", "password": "MemberPass123"}


def _login(session, creds):
    r = session.post(f"{BASE_URL}/api/auth/login", json=creds)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    session.headers.update({"Authorization": f"Bearer {data['token']}"})
    return data


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    _login(s, ADMIN)
    return s


@pytest.fixture(scope="module")
def member_session():
    s = requests.Session()
    _login(s, MEMBER)
    return s


def _get_user(session, email):
    r = session.get(f"{BASE_URL}/api/admin/users")
    assert r.status_code == 200
    for u in r.json():
        if u["email"] == email:
            return u
    return None


class TestAdminUsers:
    def test_list_users_requires_admin(self, member_session):
        r = member_session.get(f"{BASE_URL}/api/admin/users")
        assert r.status_code == 403

    def test_list_users_admin_ok(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/users")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 2
        sample = data[0]
        for k in ("id", "name", "email", "is_admin", "is_you", "created_at"):
            assert k in sample
        # Admin should be flagged as "you"
        you = [u for u in data if u["is_you"]]
        assert len(you) == 1 and you[0]["email"] == ADMIN["email"]
        assert you[0]["is_admin"] is True

    def test_self_demote_blocked(self, admin_session):
        me = _get_user(admin_session, ADMIN["email"])
        r = admin_session.patch(f"{BASE_URL}/api/admin/users/{me['id']}",
                                json={"is_admin": False})
        assert r.status_code == 400
        assert "own admin" in r.json().get("detail", "").lower()

    def test_unknown_user_404(self, admin_session):
        r = admin_session.patch(f"{BASE_URL}/api/admin/users/does-not-exist",
                                json={"is_admin": True})
        assert r.status_code == 404

    def test_patch_requires_admin(self, member_session, admin_session):
        me = _get_user(admin_session, MEMBER["email"])
        assert me is not None
        r = member_session.patch(f"{BASE_URL}/api/admin/users/{me['id']}",
                                 json={"is_admin": True})
        assert r.status_code == 403

    def test_promote_then_demote_member(self, admin_session):
        member = _get_user(admin_session, MEMBER["email"])
        assert member is not None and member["is_admin"] is False

        # Promote
        r = admin_session.patch(f"{BASE_URL}/api/admin/users/{member['id']}",
                                json={"is_admin": True})
        assert r.status_code == 200
        after = _get_user(admin_session, MEMBER["email"])
        assert after["is_admin"] is True

        # Member can now list users
        ms = requests.Session()
        _login(ms, MEMBER)
        r = ms.get(f"{BASE_URL}/api/admin/users")
        assert r.status_code == 200

        # Demote back to non-admin (end state per instructions)
        r = admin_session.patch(f"{BASE_URL}/api/admin/users/{member['id']}",
                                json={"is_admin": False})
        assert r.status_code == 200
        after2 = _get_user(admin_session, MEMBER["email"])
        assert after2["is_admin"] is False

        # Member no longer admin
        ms2 = requests.Session()
        _login(ms2, MEMBER)
        r = ms2.get(f"{BASE_URL}/api/admin/users")
        assert r.status_code == 403
