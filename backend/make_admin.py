"""Usage: python make_admin.py add|remove|list [email]"""
import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent / '.env')


async def main():
    db = AsyncIOMotorClient(os.environ['MONGO_URL'])[os.environ['DB_NAME']]
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'list'
    if cmd == 'list':
        async for u in db.users.find({"is_admin": True}, {"_id": 0, "email": 1}):
            print(u["email"])
        return
    if cmd not in ('add', 'remove') or len(sys.argv) < 3:
        print(__doc__)
        return
    res = await db.users.update_one({"email": sys.argv[2]}, {"$set": {"is_admin": cmd == 'add'}})
    print("Updated" if res.matched_count else "No user with that email")


asyncio.run(main())
