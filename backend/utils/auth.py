import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from models.user import TokenData, User
from database import get_users_collection
from bson import ObjectId

# 密码加密配置
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT配置
SECRET_KEY = os.getenv("JWT_SECRET", "your-super-secret-jwt-key-change-in-production")
REFRESH_SECRET_KEY = os.getenv("JWT_REFRESH_SECRET", "your-super-secret-refresh-key-change-in-production")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_DAYS = int(os.getenv("JWT_ACCESS_EXPIRATION_DAYS", "2"))  # 2天
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("JWT_REFRESH_EXPIRATION_DAYS", "7"))  # 7天
REFRESH_INTERVAL_DAYS = int(os.getenv("JWT_REFRESH_INTERVAL_DAYS", "1"))  # 1天刷新一次

security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """生成密码哈希"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """创建JWT访问令牌"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None, last_refresh: Optional[float] = None):
    """创建JWT刷新令牌"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    # 添加刷新时间戳
    if last_refresh is None:
        last_refresh = datetime.utcnow().timestamp()
    
    to_encode.update({
        "exp": expire, 
        "type": "refresh",
        "last_refresh": last_refresh
    })
    encoded_jwt = jwt.encode(to_encode, REFRESH_SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_refresh_token(token: str) -> Optional[dict]:
    """验证刷新令牌"""
    try:
        payload = jwt.decode(token, REFRESH_SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            return None
            
        # 检查上次刷新时间，如果未设置last_refresh，则设为当前时间减去刷新间隔
        last_refresh = payload.get("last_refresh")
        if not last_refresh:
            # 首次刷新，设置为当前时间减去刷新间隔，确保可以刷新
            last_refresh = (datetime.utcnow() - timedelta(days=REFRESH_INTERVAL_DAYS)).timestamp()
            
        # 计算距离上次刷新的时间
        now = datetime.utcnow().timestamp()
        days_since_refresh = (now - last_refresh) / (24 * 3600)  # 转换为天数
        
        # 更新payload中的last_refresh时间
        payload["last_refresh"] = now if days_since_refresh >= REFRESH_INTERVAL_DAYS else last_refresh
        payload["should_refresh"] = days_since_refresh >= REFRESH_INTERVAL_DAYS
            
        return payload
    except JWTError:
        return None

async def get_user_by_email(email: str) -> Optional[dict]:
    """根据邮箱获取用户"""
    users_collection = await get_users_collection()
    user = await users_collection.find_one({"email": email})
    return user

async def get_user_by_id(user_id: str) -> Optional[dict]:
    """根据ID获取用户"""
    users_collection = await get_users_collection()
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    return user

async def authenticate_user(email: str, password: str) -> Optional[dict]:
    """验证用户凭据"""
    user = await get_user_by_email(email)
    if not user:
        return None
    if not verify_password(password, user["hashed_password"]):
        return None
    return user

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """获取当前用户"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        token_type: str = payload.get("type")
        if email is None or token_type != "access":
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    
    user = await get_user_by_email(email=token_data.email)
    if user is None:
        raise credentials_exception
    
    return User(**user)

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """获取当前活跃用户"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user