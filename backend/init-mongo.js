// MongoDB初始化脚本
db = db.getSiblingDB('deepbrain');

// 创建用户集合
db.createCollection('users');

// 创建思维导图集合
db.createCollection('mindmaps');

// 为用户集合创建索引
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "username": 1 }, { unique: true });

// 为思维导图集合创建索引
db.mindmaps.createIndex({ "user_id": 1 });
db.mindmaps.createIndex({ "created_at": -1 });
db.mindmaps.createIndex({ "title": "text", "description": "text" });

print('Database initialized successfully!');