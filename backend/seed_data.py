import asyncio
import sys
sys.path.insert(0, '/app/backend')
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone, timedelta
import uuid

async def seed_data():
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
    db = client[os.environ.get('DB_NAME', 'test_database')]
    
    print("Clearing existing data...")
    # SAFETY: this script used to delete every event, post and trip before inserting
    # demo content. It now refuses to touch a database that already has content.
    existing = (
        await db.events.count_documents({})
        + await db.blog_posts.count_documents({})
        + await db.travel_packages.count_documents({})
    )
    if existing and "--wipe-everything" not in sys.argv:
        print(f"Stopped: the database already has {existing} events/posts/trips. Nothing was changed.")
        print("This script only adds DEMO content to an empty database. Do not run it on your live site.")
        client.close()
        return

    await db.events.delete_many({})
    await db.blog_posts.delete_many({})
    await db.travel_packages.delete_many({})
    
    print("Seeding events...")
    events = [
        {
            "id": str(uuid.uuid4()),
            "title": "Tech Innovation Summit 2025",
            "description": "Join us for a full day of inspiring talks, networking, and hands-on workshops with industry leaders shaping the future of technology.",
            "date": (datetime.now(timezone.utc) + timedelta(days=15)).isoformat(),
            "location": "San Francisco Convention Center",
            "category": "conference",
            "max_attendees": 500,
            "attendees_count": 127,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Digital Marketing Workshop",
            "description": "Learn the latest strategies and tools to grow your online presence and drive real business results.",
            "date": (datetime.now(timezone.utc) + timedelta(days=8)).isoformat(),
            "location": "Online (Zoom)",
            "category": "workshop",
            "max_attendees": 100,
            "attendees_count": 45,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Summer Music Festival",
            "description": "An unforgettable evening of live music featuring top artists from around the world under the stars.",
            "date": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
            "location": "Central Park Amphitheater",
            "category": "concert",
            "max_attendees": 2000,
            "attendees_count": 856,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Startup Founders Meetup",
            "description": "Connect with fellow entrepreneurs, share experiences, and build valuable relationships in an informal setting.",
            "date": (datetime.now(timezone.utc) + timedelta(days=5)).isoformat(),
            "location": "Innovation Hub Coworking",
            "category": "networking",
            "max_attendees": 80,
            "attendees_count": 42,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Community Art Exhibition",
            "description": "Celebrate local artists and their incredible works in this special exhibition and gallery opening event.",
            "date": (datetime.now(timezone.utc) + timedelta(days=12)).isoformat(),
            "location": "Downtown Art Gallery",
            "category": "social",
            "max_attendees": 150,
            "attendees_count": 78,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    await db.events.insert_many(events)
    print(f"✓ Seeded {len(events)} events")
    
    print("Seeding blog posts...")
    posts = [
        {
            "id": str(uuid.uuid4()),
            "title": "10 Hidden Gems in Southeast Asia You Must Visit",
            "content": "Southeast Asia is filled with breathtaking destinations beyond the usual tourist spots. From secret beaches in Thailand to ancient temples in Cambodia, discover the hidden treasures that make this region truly special. Our journey takes us through remote islands, mountain villages, and pristine natural wonders that few travelers get to experience.\\n\\nThese destinations offer authentic cultural experiences, stunning landscapes, and the chance to connect with local communities in meaningful ways. Whether you're seeking adventure, relaxation, or cultural immersion, these hidden gems provide unforgettable experiences away from the crowds.",
            "excerpt": "Discover the secret destinations that make Southeast Asia truly magical, from hidden beaches to ancient temples.",
            "category": "travel",
            "tags": ["asia", "adventure", "hidden gems", "backpacking"],
            "image_url": "https://images.unsplash.com/photo-1759082105395-623ea6eddfde?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzd8MHwxfHNlYXJjaHwyfHx0cmF2ZWwlMjBkZXN0aW5hdGlvbiUyMG1vdW50YWlucyUyMGJlYWNoJTIwY2l0eXxlbnwwfHx8fDE3NjUyMjI2MzB8MA&ixlib=rb-4.1.0&q=85",
            "author_name": "Sarah Chen",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=3)).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "The Ultimate Guide to Solo Travel: Tips from a Veteran Explorer",
            "content": "Solo travel can be one of the most rewarding experiences of your life. It teaches independence, builds confidence, and allows you to truly immerse yourself in new cultures at your own pace. After traveling solo to over 50 countries, I've learned invaluable lessons about staying safe, making connections, and embracing the freedom of independent exploration.\\n\\nThis comprehensive guide covers everything from planning your first solo trip to managing common challenges on the road. You'll learn how to choose destinations, budget effectively, stay safe, meet fellow travelers, and make the most of your solo adventures.",
            "excerpt": "Everything you need to know about solo travel, from safety tips to making meaningful connections on the road.",
            "category": "tips",
            "tags": ["solo travel", "safety", "budgeting", "planning"],
            "image_url": "https://images.unsplash.com/photo-1761666508190-1945dbc21751?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzd8MHwxfHNlYXJjaHwzfHx0cmF2ZWwlMjBkZXN0aW5hdGlvbiUyMG1vdW50YWlucyUyMGJlYWNoJTIwY2l0eXxlbnwwfHx8fDE3NjUyMjI2MzB8MA&ixlib=rb-4.1.0&q=85",
            "author_name": "Marcus Johnson",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "How Cultural Immersion Changed My Perspective on Life",
            "content": "Living with local families in rural villages taught me more about life, happiness, and community than any book or classroom ever could. This journey through authentic cultural experiences transformed not just how I travel, but how I see the world and my place in it.\\n\\nFrom sharing meals with Moroccan families to learning traditional crafts in Japanese villages, each experience deepened my understanding of different ways of life. I discovered that true travel isn't about checking off landmarks—it's about connecting with people, understanding their stories, and opening yourself to new perspectives.",
            "excerpt": "A personal journey through authentic cultural experiences that transform how we see the world.",
            "category": "culture",
            "tags": ["cultural immersion", "personal growth", "local experiences"],
            "image_url": "https://images.unsplash.com/photo-1658554628060-45507a7cb288?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODB8MHwxfHNlYXJjaHwyfHxwZW9wbGUlMjBhdCUyMHNvY2lhbCUyMGV2ZW50JTIwY29uY2VydCUyMGNvbmZlcmVuY2V8ZW58MHx8fHwxNzY1MjIyNjMzfDA&ixlib=rb-4.1.0&q=85",
            "author_name": "Elena Rodriguez",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=10)).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Adventure Sports: Conquering Fears and Finding Freedom",
            "content": "From skydiving in New Zealand to bungee jumping in Nepal, adventure sports push us beyond our comfort zones and reveal strengths we never knew we had. This article explores the psychology of fear, the thrill of adventure, and how extreme experiences can lead to profound personal growth.\\n\\nWhether you're a seasoned adrenaline junkie or someone curious about taking the leap, discover how adventure sports offer more than just thrills—they provide opportunities for self-discovery, confidence building, and unforgettable memories.",
            "excerpt": "Explore how adventure sports push boundaries and create transformative travel experiences.",
            "category": "adventure",
            "tags": ["adventure", "extreme sports", "personal growth", "adrenaline"],
            "image_url": "https://images.unsplash.com/photo-1764889746854-0a6fd46ccac8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzd8MHwxfHNlYXJjaHwxfHx0cmF2ZWwlMjBkZXN0aW5hdGlvbiUyMG1vdW50YWlucyUyMGJlYWNoJTIwY2l0eXxlbnwwfHx8fDE3NjUyMjI2MzB8MA&ixlib=rb-4.1.0&q=85",
            "author_name": "Jake Morrison",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=15)).isoformat()
        }
    ]
    await db.blog_posts.insert_many(posts)
    print(f"✓ Seeded {len(posts)} blog posts")
    
    print("Seeding travel packages...")
    packages = [
        {
            "id": str(uuid.uuid4()),
            "title": "Bali Paradise Escape",
            "description": "Experience the magic of Bali with this carefully curated package including luxury accommodations, cultural tours, and beach relaxation.",
            "destination": "Bali, Indonesia",
            "duration": "7 Days / 6 Nights",
            "price": 1299,
            "image_url": "https://images.unsplash.com/photo-1764889746854-0a6fd46ccac8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzd8MHwxfHNlYXJjaHwxfHx0cmF2ZWwlMjBkZXN0aW5hdGlvbiUyMG1vdW50YWlucyUyMGJlYWNoJTIwY2l0eXxlbnwwfHx8fDE3NjUyMjI2MzB8MA&ixlib=rb-4.1.0&q=85",
            "highlights": [
                "5-star beachfront resort accommodation",
                "Traditional Balinese temple tours",
                "Private sunset dinner cruise",
                "Daily breakfast and selected meals",
                "Airport transfers included"
            ],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Swiss Alps Adventure",
            "description": "Discover the breathtaking beauty of the Swiss Alps with hiking, mountain railways, and charming alpine villages.",
            "destination": "Interlaken, Switzerland",
            "duration": "10 Days / 9 Nights",
            "price": 2499,
            "image_url": "https://images.unsplash.com/photo-1761666508190-1945dbc21751?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzd8MHwxfHNlYXJjaHwzfHx0cmF2ZWwlMjBkZXN0aW5hdGlvbiUyMG1vdW50YWlucyUyMGJlYWNoJTIwY2l0eXxlbnwwfHx8fDE3NjUyMjI2MzB8MA&ixlib=rb-4.1.0&q=85",
            "highlights": [
                "Jungfraujoch - Top of Europe train journey",
                "Guided alpine hiking tours",
                "Stay in traditional Swiss chalets",
                "Cheese and chocolate factory visits",
                "Swiss Travel Pass included"
            ],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Tokyo & Kyoto Cultural Journey",
            "description": "Immerse yourself in Japanese culture with this perfect blend of modern Tokyo and traditional Kyoto experiences.",
            "destination": "Japan",
            "duration": "12 Days / 11 Nights",
            "price": 3199,
            "image_url": "https://images.unsplash.com/photo-1759082105395-623ea6eddfde?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzd8MHwxfHNlYXJjaHwyfHx0cmF2ZWwlMjBkZXN0aW5hdGlvbiUyMG1vdW50YWlucyUyMGJlYWNoJTIwY2l0eXxlbnwwfHx8fDE3NjUyMjI2MzB8MA&ixlib=rb-4.1.0&q=85",
            "highlights": [
                "Bullet train (Shinkansen) experience",
                "Traditional tea ceremony and kimono wearing",
                "Guided tours of temples and shrines",
                "Tokyo city highlights and Akihabara district",
                "Authentic Japanese cuisine experiences"
            ],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Iceland Northern Lights Expedition",
            "description": "Chase the Aurora Borealis and explore Iceland's otherworldly landscapes including waterfalls, glaciers, and hot springs.",
            "destination": "Reykjavik, Iceland",
            "duration": "8 Days / 7 Nights",
            "price": 2199,
            "image_url": "https://images.unsplash.com/photo-1568836977990-b65d73abcf3d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMG5hdHVyZSUyMHRleHR1cmUlMjBncmFpbiUyMHBhcGVyfGVufDB8fHx8MTc2NTIyMjYzNHww&ixlib=rb-4.1.0&q=85",
            "highlights": [
                "Northern Lights hunting tours",
                "Blue Lagoon geothermal spa",
                "Golden Circle sightseeing",
                "Glacier hiking and ice cave exploration",
                "Whale watching excursion"
            ],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "African Safari Experience",
            "description": "Witness the incredible wildlife of Africa on this once-in-a-lifetime safari adventure through Tanzania and Kenya.",
            "destination": "Tanzania & Kenya",
            "duration": "14 Days / 13 Nights",
            "price": 4299,
            "image_url": "https://images.unsplash.com/photo-1593056658266-afb568f25edd?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHwyfHxhYnN0cmFjdCUyMG5hdHVyZSUyMHRleHR1cmUlMjBncmFpbiUyMHBhcGVyfGVufDB8fHx8MTc2NTIyMjYzNHww&ixlib=rb-4.1.0&q=85",
            "highlights": [
                "Serengeti National Park game drives",
                "Great Migration viewing (seasonal)",
                "Ngorongoro Crater exploration",
                "Maasai village cultural visit",
                "Luxury safari lodge accommodations"
            ],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Greek Islands Hopping",
            "description": "Sail through the stunning Greek islands, exploring ancient ruins, pristine beaches, and charming white-washed villages.",
            "destination": "Santorini, Mykonos & Crete",
            "duration": "9 Days / 8 Nights",
            "price": 1899,
            "image_url": "https://images.unsplash.com/photo-1726519031203-3db0ab5d867e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODB8MHwxfHNlYXJjaHwxfHxwZW9wbGUlMjBhdCUyMHNvY2lhbCUyMGV2ZW50JTIwY29uY2VydCUyMGNvbmZlcmVuY2V8ZW58MHx8fHwxNzY1MjIyNjMzfDA&ixlib=rb-4.1.0&q=85",
            "highlights": [
                "Ferry passes between islands",
                "Sunset views in Santorini (Oia)",
                "Beach clubs and nightlife in Mykonos",
                "Ancient Knossos Palace tour in Crete",
                "Traditional Greek cooking class"
            ],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    await db.travel_packages.insert_many(packages)
    print(f"✓ Seeded {len(packages)} travel packages")
    
    print("\\n✅ Database seeded successfully!")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_data())
