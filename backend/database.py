import os
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from typing import Optional

class Database:
    client: Optional[AsyncIOMotorClient] = None
    database = None

database = Database()

async def get_database():
    return database.database

async def connect_to_mongo():
    """创建数据库连接"""
    mongodb_uri = os.getenv("MONGODB_URI", "mongodb://admin:password123@localhost:27017/deepbrain?authSource=admin")
    
    try:
        database.client = AsyncIOMotorClient(mongodb_uri)
        database.database = database.client.deepbrain
        
        # 测试连接
        await database.client.admin.command('ping')
        print("Successfully connected to MongoDB")
        
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        raise e

async def close_mongo_connection():
    """关闭数据库连接"""
    if database.client:
        database.client.close()
        print("Disconnected from MongoDB")

# 获取集合的辅助函数
async def get_users_collection():
    db = await get_database()
    return db.users

async def get_mindmaps_collection():
    db = await get_database()
    return db.mindmaps