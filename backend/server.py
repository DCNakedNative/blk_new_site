from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError
import os
import re
import time
import uuid
import secrets
import logging
from collections import defaultdict, deque
from pathlib import Path
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

security = HTTPBearer()
optional_security = HTTPBearer(auto_error=False)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"

# SECURITY: the signing key must come from the environment. The old default
# ('your-secret-key-change-in-production') is public, so it is never accepted.
# If JWT_SECRET_KEY is missing we generate a random key for this process. The
# site stays up and cannot be forged, but everyone is logged out on each
# restart until you set JWT_SECRET_KEY to a long random value in backend/.env.
_PLACEHOLDER_KEYS = {"", "your-secret-key-change-in-production"}
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', '')
if SECRET_KEY in _PLACEHOLDER_KEYS:
    SECRET_KEY = secrets.token_urlsafe(64)
    logger.warning(
        "JWT_SECRET_KEY is not set. Using a temporary random key; users will be "
        "logged out whenever the server restarts. Set JWT_SECRET_KEY in backend/.env."
    )


# ---------------------------------------------------------------------------
# Small in-memory rate limiter (per process). Good enough to slow down password
# guessing and form spam on a single-server deployment.
# ---------------------------------------------------------------------------
class RateLimiter:
    def __init__(self, limit: int, window_seconds: int, message: str):
        self.limit = limit
        self.window = window_seconds
        self.message = message
        self.hits = defaultdict(deque)

    def _prune(self, key: str, now: float) -> deque:
        q = self.hits[key]
        while q and q[0] <= now - self.window:
            q.popleft()
        return q

    def check(self, key: str):
        q = self._prune(key, time.monotonic())
        if len(q) >= self.limit:
            raise HTTPException(status_code=429, detail=self.message)

    def hit(self, key: str):
        now = time.monotonic()
        if len(self.hits) > 5000:  # keep memory bounded
            for k in list(self.hits.keys()):
                if not self._prune(k, now):
                    del self.hits[k]
        self.hits[key].append(now)

    def reset(self, key: str):
        self.hits.pop(key, None)


login_limiter = RateLimiter(5, 15 * 60, "Too many failed sign-in attempts. Please wait 15 minutes and try again.")
register_limiter = RateLimiter(20, 60 * 60, "Too many sign-ups from this connection. Please try again later.")
submission_limiter = RateLimiter(5, 60 * 60, "Too many submissions from this connection. Please try again later.")


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    if forwarded:
        return forwarded
    return request.client.host if request.client else "unknown"


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=30)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def _user_id_from_token(token: str) -> str:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:  # PyJWT's base error (jwt.JWTError does not exist in PyJWT)
        raise HTTPException(status_code=401, detail="Invalid token")
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid authentication")
    return user_id


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    return _user_id_from_token(credentials.credentials)


async def get_optional_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_security),
) -> Optional[str]:
    if not credentials:
        return None
    try:
        return _user_id_from_token(credentials.credentials)
    except HTTPException:
        return None


async def is_admin(user_id: Optional[str]) -> bool:
    if not user_id:
        return False
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "is_admin": 1})
    return bool(user and user.get("is_admin", False))


async def get_current_admin_user(user_id: str = Depends(get_current_user)):
    if not await is_admin(user_id):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user_id


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------
def _check_iso(value: Optional[str], required: bool = False) -> Optional[str]:
    if value in (None, ""):
        if required:
            raise ValueError("a date is required")
        return None
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise ValueError("must be a date like 2026-10-10 or a date and time like 2026-10-10T18:00")
    return value


def _check_http_url(value: Optional[str]) -> Optional[str]:
    if value in (None, ""):
        return None
    if not re.match(r"^https?://", value, re.IGNORECASE):
        raise ValueError("must start with http:// or https://")
    return value


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:60].strip("-")
    return slug or "post"


def today_iso() -> str:
    return datetime.now(timezone.utc).date().isoformat()


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class UserRegister(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    name: str = Field(min_length=1, max_length=80)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: EmailStr
    name: str
    is_admin: bool = False


class AuthResponse(BaseModel):
    token: str
    user: User


class EventCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=5000)
    date: str
    end_date: Optional[str] = None
    location: str = Field(min_length=1, max_length=200)  # public: city or general area
    location_details: Optional[str] = Field(default=None, max_length=1000)  # exact address, RSVP-only
    category: str = Field(min_length=1, max_length=50)
    max_attendees: int = Field(ge=1, le=100000)

    @field_validator("date")
    @classmethod
    def _v_date(cls, v):
        return _check_iso(v, required=True)

    @field_validator("end_date")
    @classmethod
    def _v_end(cls, v):
        return _check_iso(v)


class Event(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: str
    date: str
    end_date: Optional[str] = None
    location: str
    location_details: Optional[str] = None
    category: str
    max_attendees: int
    attendees_count: int = 0
    created_at: str


class RSVPCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    event_id: str
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr


class RSVP(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    event_id: str
    user_id: str
    name: str
    email: EmailStr
    created_at: str


class RSVPWithEvent(RSVP):
    event_title: Optional[str] = None
    event_date: Optional[str] = None
    event_end_date: Optional[str] = None
    event_location: Optional[str] = None
    event_location_details: Optional[str] = None


class BlogPostCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1, max_length=50000)
    excerpt: str = Field(min_length=1, max_length=500)
    category: str = Field(min_length=1, max_length=50)
    tags: List[str] = Field(default_factory=list, max_length=20)
    image_url: Optional[str] = Field(default=None, max_length=2000)
    published: bool = True

    @field_validator("image_url")
    @classmethod
    def _v_image(cls, v):
        return _check_http_url(v)

    @field_validator("tags")
    @classmethod
    def _v_tags(cls, v):
        return [t.strip()[:40] for t in v if t and t.strip()]


class BlogPost(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    slug: Optional[str] = None
    title: str
    content: str
    excerpt: str
    category: str
    tags: List[str] = Field(default_factory=list)
    image_url: Optional[str] = None
    published: bool = True
    author_name: str
    created_at: str


class TravelPackageCreate(BaseModel):
    """A trip. Dates and price are optional so a trip can simply be announced."""
    model_config = ConfigDict(str_strip_whitespace=True)
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=5000)
    destination: str = Field(min_length=1, max_length=200)
    duration: str = Field(default="", max_length=100)
    price: Optional[float] = Field(default=None, ge=0)
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    external_url: Optional[str] = Field(default=None, max_length=2000)
    image_url: Optional[str] = Field(default=None, max_length=2000)
    highlights: List[str] = Field(default_factory=list, max_length=30)

    @field_validator("start_date", "end_date")
    @classmethod
    def _v_dates(cls, v):
        return _check_iso(v)

    @field_validator("external_url", "image_url")
    @classmethod
    def _v_urls(cls, v):
        return _check_http_url(v)

    @field_validator("highlights")
    @classmethod
    def _v_highlights(cls, v):
        return [h.strip()[:200] for h in v if h and h.strip()]


class TravelPackage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: str
    destination: str
    duration: str = ""
    price: Optional[float] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    external_url: Optional[str] = None
    image_url: Optional[str] = None
    highlights: List[str] = Field(default_factory=list)
    created_at: str


class BookingInquiryCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    package_id: str
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    phone: str = Field(default="", max_length=40)
    message: str = Field(default="", max_length=2000)
    travel_date: str = Field(default="", max_length=40)


class BookingInquiry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    package_id: str
    user_id: str
    name: str
    email: EmailStr
    phone: str = ""
    message: str = ""
    travel_date: str = ""
    created_at: str


class BookingInquiryWithPackage(BookingInquiry):
    package_title: Optional[str] = None
    package_destination: Optional[str] = None


class SubmissionCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=3000)
    when: str = Field(min_length=1, max_length=200)  # free text, e.g. "March 14-16"
    location: str = Field(min_length=1, max_length=200)
    website: Optional[str] = Field(default=None, max_length=500)
    contact_name: str = Field(min_length=1, max_length=100)
    contact_email: EmailStr
    company: Optional[str] = None  # honeypot: real people leave this empty

    @field_validator("website")
    @classmethod
    def _v_site(cls, v):
        return _check_http_url(v)


class SubmissionStatus(BaseModel):
    status: Literal["pending", "approved", "rejected"]


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------
@api_router.post("/auth/register", response_model=AuthResponse)
async def register(user_data: UserRegister, request: Request):
    ip = client_ip(request)
    register_limiter.check(ip)
    register_limiter.hit(ip)

    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    # Nobody becomes admin automatically. Promote people with make_admin.py.
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password": get_password_hash(user_data.password),
        "is_admin": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    try:
        await db.users.insert_one(user_doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail="Email already registered")

    token = create_access_token({"sub": user_id})
    user = User(id=user_id, email=user_data.email, name=user_data.name, is_admin=False)
    return AuthResponse(token=token, user=user)


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(payload: UserLogin):
    key = payload.email.lower()
    login_limiter.check(key)

    user = await db.users.find_one({"email": payload.email}, {"_id": 0})
    if not user or not verify_password(payload.password, user["password"]):
        login_limiter.hit(key)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    login_limiter.reset(key)
    token = create_access_token({"sub": user["id"]})
    user_obj = User(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        is_admin=user.get("is_admin", False)
    )
    return AuthResponse(token=token, user=user_obj)


@api_router.get("/auth/me", response_model=User)
async def get_me(user_id: str = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)


# ---------------------------------------------------------------------------
# Events
# ---------------------------------------------------------------------------
def public_event(doc: dict) -> dict:
    """Hide the exact address from people who have not RSVP'd."""
    visible = dict(doc)
    visible.pop("location_details", None)
    return visible


@api_router.get("/events", response_model=List[Event])
async def get_events(category: Optional[str] = None, upcoming: bool = False):
    query = {}
    if category:
        query["category"] = category
    if upcoming:
        today = today_iso()
        query["$or"] = [{"date": {"$gte": today}}, {"end_date": {"$gte": today}}]
    events = await db.events.find(query, {"_id": 0}).sort("date", 1).to_list(1000)
    return [public_event(e) for e in events]


@api_router.get("/events/{event_id}", response_model=Event)
async def get_event(event_id: str, user_id: Optional[str] = Depends(get_optional_user_id)):
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    can_see_address = False
    if user_id:
        if await is_admin(user_id):
            can_see_address = True
        else:
            rsvp = await db.rsvps.find_one({"event_id": event_id, "user_id": user_id}, {"_id": 0, "id": 1})
            can_see_address = rsvp is not None
    return event if can_see_address else public_event(event)


@api_router.get("/admin/events", response_model=List[Event])
async def admin_list_events(user_id: str = Depends(get_current_admin_user)):
    return await db.events.find({}, {"_id": 0}).sort("date", 1).to_list(1000)


@api_router.post("/events", response_model=Event)
async def create_event(event_data: EventCreate, user_id: str = Depends(get_current_admin_user)):
    event_doc = {
        "id": str(uuid.uuid4()),
        **event_data.model_dump(),
        "attendees_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.events.insert_one(event_doc)
    return Event(**event_doc)


@api_router.put("/events/{event_id}", response_model=Event)
async def update_event(event_id: str, event_data: EventCreate, user_id: str = Depends(get_current_admin_user)):
    existing = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Event not found")
    if event_data.max_attendees < existing.get("attendees_count", 0):
        raise HTTPException(
            status_code=400,
            detail=f"Max attendees can't be lower than the {existing.get('attendees_count', 0)} people already registered",
        )

    await db.events.update_one({"id": event_id}, {"$set": event_data.model_dump()})
    updated_event = await db.events.find_one({"id": event_id}, {"_id": 0})
    return Event(**updated_event)


@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str, user_id: str = Depends(get_current_admin_user)):
    result = await db.events.delete_one({"id": event_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    await db.rsvps.delete_many({"event_id": event_id})  # don't leave orphaned RSVPs behind
    return {"message": "Event deleted successfully"}


@api_router.get("/events/{event_id}/attendees", response_model=List[RSVP])
async def get_event_attendees(event_id: str, user_id: str = Depends(get_current_admin_user)):
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return await db.rsvps.find({"event_id": event_id}, {"_id": 0}).to_list(1000)


# ---------------------------------------------------------------------------
# RSVPs
# ---------------------------------------------------------------------------
@api_router.post("/rsvp", response_model=RSVP)
async def create_rsvp(rsvp_data: RSVPCreate, user_id: str = Depends(get_current_user)):
    event = await db.events.find_one({"id": rsvp_data.event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    existing_rsvp = await db.rsvps.find_one(
        {"event_id": rsvp_data.event_id, "user_id": user_id}, {"_id": 0}
    )
    if existing_rsvp:
        raise HTTPException(status_code=400, detail="You're already registered for this event")

    # Reserve a spot atomically so two people can't both take the last one.
    reserved = await db.events.update_one(
        {"id": rsvp_data.event_id, "attendees_count": {"$lt": event["max_attendees"]}},
        {"$inc": {"attendees_count": 1}},
    )
    if reserved.modified_count == 0:
        raise HTTPException(status_code=400, detail="This event is full")

    rsvp_doc = {
        "id": str(uuid.uuid4()),
        "event_id": rsvp_data.event_id,
        "user_id": user_id,
        "name": rsvp_data.name,
        "email": rsvp_data.email,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    try:
        await db.rsvps.insert_one(rsvp_doc)
    except DuplicateKeyError:
        await db.events.update_one({"id": rsvp_data.event_id}, {"$inc": {"attendees_count": -1}})
        raise HTTPException(status_code=400, detail="You're already registered for this event")
    except Exception:
        await db.events.update_one({"id": rsvp_data.event_id}, {"$inc": {"attendees_count": -1}})
        raise

    return RSVP(**rsvp_doc)


@api_router.delete("/rsvp/{rsvp_id}")
async def cancel_rsvp(rsvp_id: str, user_id: str = Depends(get_current_user)):
    rsvp = await db.rsvps.find_one({"id": rsvp_id, "user_id": user_id}, {"_id": 0})
    if not rsvp:
        raise HTTPException(status_code=404, detail="RSVP not found")
    await db.rsvps.delete_one({"id": rsvp_id, "user_id": user_id})
    await db.events.update_one(
        {"id": rsvp["event_id"], "attendees_count": {"$gt": 0}},
        {"$inc": {"attendees_count": -1}},
    )
    return {"message": "RSVP cancelled"}


@api_router.get("/my-rsvps", response_model=List[RSVPWithEvent])
async def get_my_rsvps(user_id: str = Depends(get_current_user)):
    rsvps = await db.rsvps.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    event_ids = list({r["event_id"] for r in rsvps})
    events = await db.events.find({"id": {"$in": event_ids}}, {"_id": 0}).to_list(1000)
    by_id = {e["id"]: e for e in events}

    result = []
    for r in rsvps:
        event = by_id.get(r["event_id"], {})
        result.append({
            **r,
            "event_title": event.get("title"),
            "event_date": event.get("date"),
            "event_end_date": event.get("end_date"),
            "event_location": event.get("location"),
            # This person has RSVP'd, so they may see the exact address.
            "event_location_details": event.get("location_details"),
        })
    result.sort(key=lambda r: r.get("event_date") or "")
    return result


# ---------------------------------------------------------------------------
# Blog
# ---------------------------------------------------------------------------
@api_router.get("/blog", response_model=List[BlogPost])
async def get_blog_posts(category: Optional[str] = None, tag: Optional[str] = None):
    query = {"published": {"$ne": False}}  # drafts stay hidden; older posts without the field count as published
    if category:
        query["category"] = category
    if tag:
        query["tags"] = tag
    return await db.blog_posts.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)


@api_router.get("/admin/blog", response_model=List[BlogPost])
async def admin_list_blog_posts(user_id: str = Depends(get_current_admin_user)):
    return await db.blog_posts.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)


@api_router.get("/blog/{post_id}", response_model=BlogPost)
async def get_blog_post(post_id: str, user_id: Optional[str] = Depends(get_optional_user_id)):
    # The link can use either the post id or its readable slug.
    post = await db.blog_posts.find_one({"$or": [{"id": post_id}, {"slug": post_id}]}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.get("published") is False and not await is_admin(user_id):
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@api_router.post("/blog", response_model=BlogPost)
async def create_blog_post(post_data: BlogPostCreate, user_id: str = Depends(get_current_admin_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    post_id = str(uuid.uuid4())
    post_doc = {
        "id": post_id,
        "slug": f"{slugify(post_data.title)}-{post_id[:6]}",
        **post_data.model_dump(),
        "author_name": user["name"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.blog_posts.insert_one(post_doc)
    return BlogPost(**post_doc)


@api_router.put("/blog/{post_id}", response_model=BlogPost)
async def update_blog_post(post_id: str, post_data: BlogPostCreate, user_id: str = Depends(get_current_admin_user)):
    result = await db.blog_posts.update_one({"id": post_id}, {"$set": post_data.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    updated_post = await db.blog_posts.find_one({"id": post_id}, {"_id": 0})
    return BlogPost(**updated_post)


@api_router.delete("/blog/{post_id}")
async def delete_blog_post(post_id: str, user_id: str = Depends(get_current_admin_user)):
    result = await db.blog_posts.delete_one({"id": post_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"message": "Post deleted successfully"}


# ---------------------------------------------------------------------------
# Trips (stored as "travel packages" so existing data keeps working)
# ---------------------------------------------------------------------------
@api_router.get("/travel-packages", response_model=List[TravelPackage])
async def get_travel_packages():
    return await db.travel_packages.find({}, {"_id": 0}).to_list(1000)


@api_router.get("/travel-packages/{package_id}", response_model=TravelPackage)
async def get_travel_package(package_id: str):
    package = await db.travel_packages.find_one({"id": package_id}, {"_id": 0})
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    return package


@api_router.post("/travel-packages", response_model=TravelPackage)
async def create_travel_package(package_data: TravelPackageCreate, user_id: str = Depends(get_current_admin_user)):
    package_doc = {
        "id": str(uuid.uuid4()),
        **package_data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.travel_packages.insert_one(package_doc)
    return TravelPackage(**package_doc)


@api_router.put("/travel-packages/{package_id}", response_model=TravelPackage)
async def update_travel_package(package_id: str, package_data: TravelPackageCreate, user_id: str = Depends(get_current_admin_user)):
    result = await db.travel_packages.update_one({"id": package_id}, {"$set": package_data.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Package not found")
    updated_package = await db.travel_packages.find_one({"id": package_id}, {"_id": 0})
    return TravelPackage(**updated_package)


@api_router.delete("/travel-packages/{package_id}")
async def delete_travel_package(package_id: str, user_id: str = Depends(get_current_admin_user)):
    result = await db.travel_packages.delete_one({"id": package_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Package not found")
    return {"message": "Package deleted successfully"}


@api_router.post("/booking-inquiries", response_model=BookingInquiry)
async def create_booking_inquiry(inquiry_data: BookingInquiryCreate, user_id: str = Depends(get_current_user)):
    package = await db.travel_packages.find_one({"id": inquiry_data.package_id}, {"_id": 0})
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")

    inquiry_doc = {
        "id": str(uuid.uuid4()),
        **inquiry_data.model_dump(),
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.booking_inquiries.insert_one(inquiry_doc)
    return BookingInquiry(**inquiry_doc)


@api_router.get("/my-bookings", response_model=List[BookingInquiryWithPackage])
async def get_my_bookings(user_id: str = Depends(get_current_user)):
    bookings = await db.booking_inquiries.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    package_ids = list({b["package_id"] for b in bookings})
    packages = await db.travel_packages.find({"id": {"$in": package_ids}}, {"_id": 0}).to_list(1000)
    by_id = {p["id"]: p for p in packages}
    return [
        {
            **b,
            "package_title": by_id.get(b["package_id"], {}).get("title"),
            "package_destination": by_id.get(b["package_id"], {}).get("destination"),
        }
        for b in bookings
    ]


@api_router.get("/travel-packages/{package_id}/inquiries", response_model=List[BookingInquiry])
async def get_package_inquiries(package_id: str, user_id: str = Depends(get_current_admin_user)):
    package = await db.travel_packages.find_one({"id": package_id}, {"_id": 0})
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    return await db.booking_inquiries.find({"package_id": package_id}, {"_id": 0}).to_list(1000)


# ---------------------------------------------------------------------------
# Event submissions from the community (reviewed by an admin)
# ---------------------------------------------------------------------------
@api_router.post("/event-submissions")
async def create_event_submission(data: SubmissionCreate, request: Request):
    ip = client_ip(request)
    submission_limiter.check(ip)

    if data.company:  # honeypot filled in: pretend it worked, store nothing
        return {"message": "Thanks! We'll review your event."}

    submission_limiter.hit(ip)
    doc = {
        "id": str(uuid.uuid4()),
        **data.model_dump(exclude={"company"}),
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.event_submissions.insert_one(doc)
    return {"message": "Thanks! We'll review your event."}


@api_router.get("/admin/submissions", response_model=List[dict])
async def admin_list_submissions(user_id: str = Depends(get_current_admin_user)):
    return await db.event_submissions.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)


@api_router.patch("/admin/submissions/{submission_id}")
async def admin_update_submission(submission_id: str, body: SubmissionStatus, user_id: str = Depends(get_current_admin_user)):
    result = await db.event_submissions.update_one({"id": submission_id}, {"$set": {"status": body.status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Submission not found")
    return {"message": "Updated"}


@api_router.delete("/admin/submissions/{submission_id}")
async def admin_delete_submission(submission_id: str, user_id: str = Depends(get_current_admin_user)):
    result = await db.event_submissions.delete_one({"id": submission_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Submission not found")
    return {"message": "Deleted"}


# ---------------------------------------------------------------------------
# Admin overviews
# ---------------------------------------------------------------------------
@api_router.get("/admin/all-rsvps", response_model=List[dict])
async def get_all_rsvps_with_events(user_id: str = Depends(get_current_admin_user)):
    rsvps = await db.rsvps.find({}, {"_id": 0}).to_list(5000)
    events = await db.events.find({}, {"_id": 0}).to_list(5000)
    by_id = {e["id"]: e for e in events}

    return [
        {
            **rsvp,
            "event_title": by_id[rsvp["event_id"]]["title"] if rsvp["event_id"] in by_id else "Unknown Event",
            "event_date": by_id.get(rsvp["event_id"], {}).get("date"),
            "event_location": by_id.get(rsvp["event_id"], {}).get("location"),
        }
        for rsvp in rsvps
    ]


@api_router.get("/admin/all-inquiries", response_model=List[dict])
async def get_all_inquiries_with_packages(user_id: str = Depends(get_current_admin_user)):
    inquiries = await db.booking_inquiries.find({}, {"_id": 0}).to_list(5000)
    packages = await db.travel_packages.find({}, {"_id": 0}).to_list(5000)
    by_id = {p["id"]: p for p in packages}

    return [
        {
            **inquiry,
            "package_title": by_id[inquiry["package_id"]]["title"] if inquiry["package_id"] in by_id else "Unknown Trip",
            "package_destination": by_id.get(inquiry["package_id"], {}).get("destination"),
        }
        for inquiry in inquiries
    ]


app.include_router(api_router)

# CORS: set CORS_ORIGINS in backend/.env to your site address(es), comma-separated,
# for example: https://www.black-nudist.com
_origins = [o.strip() for o in os.environ.get('CORS_ORIGINS', '*').split(',') if o.strip()] or ['*']
if _origins == ['*']:
    logger.warning("CORS_ORIGINS is not set; allowing requests from any website. Set it to your site address.")
app.add_middleware(
    CORSMiddleware,
    allow_credentials=_origins != ['*'],
    allow_origins=_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def ensure_indexes():
    """Unique indexes stop duplicate accounts and duplicate RSVPs even under load."""
    specs = [
        (db.users, [("email", 1)], {"unique": True}),
        (db.rsvps, [("event_id", 1), ("user_id", 1)], {"unique": True}),
        (db.blog_posts, [("slug", 1)], {}),
        (db.events, [("date", 1)], {}),
    ]
    for collection, keys, kwargs in specs:
        try:
            await collection.create_index(keys, **kwargs)
        except Exception as exc:  # e.g. old duplicate rows already exist
            logger.warning("Could not create index %s on %s: %s", keys, collection.name, exc)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
