from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

# 导入路由
from routes.auth import router as auth_router
from routes.mindmaps import router as mindmaps_router
from routes.llm import router as llm_router
from routes.tasks import router as tasks_router

# 导入数据库连接
from database import connect_to_mongo, close_mongo_connection

# 加载环境变量
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时连接数据库
    await connect_to_mongo()
    yield
    # 关闭时断开数据库连接
    await close_mongo_connection()

# 创建FastAPI应用
app = FastAPI(
    title="Deep Brain API",
    description="LLM驱动的思维导图工具后端API",
    version="1.0.0",
    lifespan=lifespan
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React开发服务器
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
        "http://localhost:3003",  # 当前前端端口
        "http://127.0.0.1:3003",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局异常处理
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

# 注册路由
app.include_router(auth_router, prefix="/api")
app.include_router(mindmaps_router, prefix="/api")
app.include_router(llm_router, prefix="/api")
app.include_router(tasks_router, prefix="/api/tasks")

# 根路径
@app.get("/")
async def root():
    return {
        "message": "Welcome to Deep Brain API",
        "version": "1.0.0",
        "docs": "/docs"
    }

# 健康检查
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "deep-brain-backend"
    }

if __name__ == "__main__":
    import uvicorn
    
    host = os.getenv("BACKEND_HOST", "0.0.0.0")
    port = int(os.getenv("BACKEND_PORT", "8000"))
    debug = os.getenv("DEBUG", "True").lower() == "true"
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=debug
    )