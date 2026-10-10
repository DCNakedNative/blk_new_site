"""
Finds (and, only when asked, removes) the DEMO content that seed_data.py created:
the fake events, blog posts and travel packages that came with the original template.

It matches the demo items by their exact titles, so your real content is never touched.

  python purge_demo_data.py            # just LIST what it found (changes nothing)
  python purge_demo_data.py --delete   # remove the demo items and their RSVPs/inquiries
"""
import asyncio
import os
import sys

sys.path.insert(0, '/app/backend')
from motor.motor_asyncio import AsyncIOMotorClient

DEMO_EVENTS = [
    "Tech Innovation Summit 2025",
    "Digital Marketing Workshop",
    "Summer Music Festival",
    "Startup Founders Meetup",
    "Community Art Exhibition",
]
DEMO_POSTS = [
    "10 Hidden Gems in Southeast Asia You Must Visit",
    "The Ultimate Guide to Solo Travel: Tips from a Veteran Explorer",
    "How Cultural Immersion Changed My Perspective on Life",
    "Adventure Sports: Conquering Fears and Finding Freedom",
]
DEMO_TRIPS = [
    "Bali Paradise Escape",
    "Swiss Alps Adventure",
    "Tokyo & Kyoto Cultural Journey",
    "Iceland Northern Lights Expedition",
    "African Safari Experience",
    "Greek Islands Hopping",
]


async def main(delete: bool):
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
    db = client[os.environ.get('DB_NAME', 'test_database')]

    events = await db.events.find({"title": {"$in": DEMO_EVENTS}}, {"_id": 0, "id": 1, "title": 1}).to_list(100)
    posts = await db.blog_posts.find({"title": {"$in": DEMO_POSTS}}, {"_id": 0, "id": 1, "title": 1}).to_list(100)
    trips = await db.travel_packages.find({"title": {"$in": DEMO_TRIPS}}, {"_id": 0, "id": 1, "title": 1}).to_list(100)

    print(f"Demo events found:  {len(events)}")
    for e in events:
        print(f"   - {e['title']}")
    print(f"Demo posts found:   {len(posts)}")
    for p in posts:
        print(f"   - {p['title']}")
    print(f"Demo trips found:   {len(trips)}")
    for t in trips:
        print(f"   - {t['title']}")

    if not (events or posts or trips):
        print("\nNo demo content found. Nothing to do.")
    elif not delete:
        print("\nNothing was changed. Run again with --delete to remove these.")
    else:
        event_ids = [e["id"] for e in events]
        trip_ids = [t["id"] for t in trips]
        r1 = await db.events.delete_many({"id": {"$in": event_ids}})
        r2 = await db.rsvps.delete_many({"event_id": {"$in": event_ids}})
        r3 = await db.blog_posts.delete_many({"id": {"$in": [p["id"] for p in posts]}})
        r4 = await db.travel_packages.delete_many({"id": {"$in": trip_ids}})
        r5 = await db.booking_inquiries.delete_many({"package_id": {"$in": trip_ids}})
        print(
            f"\nDeleted {r1.deleted_count} events (+{r2.deleted_count} RSVPs), "
            f"{r3.deleted_count} posts, {r4.deleted_count} trips (+{r5.deleted_count} inquiries)."
        )

    client.close()


if __name__ == "__main__":
    asyncio.run(main("--delete" in sys.argv))
