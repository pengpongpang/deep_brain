@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM 启用Docker BuildKit以提升构建性能
set DOCKER_BUILDKIT=1
set COMPOSE_DOCKER_CLI_BUILD=1

echo ========================================
echo Deep Brain 项目自动部署脚本 (Windows)
echo ========================================
echo.

:: 检查是否以管理员权限运行
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo 错误: 请以管理员权限运行此脚本
    echo 右键点击脚本文件，选择"以管理员身份运行"
    pause
    exit /b 1
)

:: 检查Docker是否已安装
echo [1/6] 检查Docker环境...
docker --version >nul 2>&1
if %errorLevel% neq 0 (
    echo Docker未安装，开始自动安装...
    call :install_docker
    if !errorLevel! neq 0 (
        echo Docker安装失败，请手动安装Docker Desktop
        echo 下载地址: https://www.docker.com/products/docker-desktop
        pause
        exit /b 1
    )
) else (
    echo Docker已安装
)

:: 检查Docker是否运行
echo [2/6] 检查Docker服务状态...
docker info >nul 2>&1
if %errorLevel% neq 0 (
    echo Docker服务未运行，请启动Docker Desktop
    echo 等待Docker启动...
    timeout /t 10 /nobreak >nul
    docker info >nul 2>&1
    if !errorLevel! neq 0 (
        echo 请手动启动Docker Desktop后重新运行此脚本
        pause
        exit /b 1
    )
)
echo Docker服务正在运行

:: 清理旧的Docker资源
echo [3/7] 清理本项目的Docker资源...
REM 停止并删除本项目的容器
docker-compose -f docker-compose.prod.yml down --remove-orphans
REM 删除本项目的镜像（如果存在）
docker rmi deep-brain-frontend deep-brain-backend deep-brain-frontend-builder 2>nul || echo 镜像不存在，跳过删除
REM 清理悬空镜像（dangling images）
docker image prune -f

:: 停止现有容器
echo [4/7] 停止现有容器...
docker-compose down

:: 构建开发镜像（用于打包前端）
echo [5/7] 构建开发镜像并打包前端...
if not exist "frontend\build" mkdir frontend\build

:: 构建前端开发镜像
docker build -f frontend\Dockerfile.build -t deep-brain-frontend-builder frontend
if %errorLevel% neq 0 (
    echo 前端开发镜像构建失败
    pause
    exit /b 1
)

:: 从开发镜像中提取构建文件
docker create --name temp-frontend deep-brain-frontend-builder
docker cp temp-frontend:/app/build frontend/
docker rm temp-frontend

:: 检查和加载密钥配置
echo [6/7] 检查和加载密钥配置...
call :check_and_load_secrets
if !errorLevel! neq 0 (
    pause
    exit /b 1
)

:: 使用预创建的生产环境配置
echo [7/7] 使用生产环境配置...

:: 使用预创建的docker-compose.prod.yml文件

:: 启动生产环境（并行构建以提升速度）
echo 启动生产环境...
REM 并行构建所有服务
docker-compose -f docker-compose.prod.yml build --parallel
docker-compose -f docker-compose.prod.yml up -d
if %errorLevel% neq 0 (
    echo 部署失败
    pause
    exit /b 1
)

echo.
echo ========================================
echo 部署完成！
echo ========================================
echo 前端访问地址: http://localhost
echo 后端API地址: http://localhost:8000
echo MongoDB地址: localhost:27017
echo.
echo 查看容器状态: docker-compose -f docker-compose.prod.yml ps
echo 查看日志: docker-compose -f docker-compose.prod.yml logs -f
echo 停止服务: docker-compose -f docker-compose.prod.yml down
echo.
pause
exit /b 0

:install_docker
echo 正在下载Docker Desktop...
:: 检查系统架构
wmic os get osarchitecture | find "64" >nul
if %errorLevel% equ 0 (
    set "docker_url=https://desktop.docker.com/win/main/amd64/Docker Desktop Installer.exe"
) else (
    echo 不支持的系统架构
    exit /b 1
)

:: 下载Docker Desktop
powershell -Command "& {Invoke-WebRequest -Uri '%docker_url%' -OutFile 'DockerDesktopInstaller.exe'}"
if %errorLevel% neq 0 (
    echo Docker下载失败
    exit /b 1
)

echo 正在安装Docker Desktop...
start /wait DockerDesktopInstaller.exe install --quiet
if %errorLevel% neq 0 (
    echo Docker安装失败
    exit /b 1
)

:: 清理安装文件
del DockerDesktopInstaller.exe

echo Docker安装完成，请重启计算机后重新运行此脚本
pause
exit /b 0

:check_and_load_secrets
echo 检查密钥配置文件...
if not exist ".env.secrets" (
    echo 错误: 未找到 .env.secrets 文件
    echo 请创建 .env.secrets 文件并配置以下变量:
    echo   DEEPSEEK_API_KEY=your-deepseek-api-key
    echo   JWT_SECRET=your-jwt-secret-key
    echo.
    echo 示例:
    echo   copy .env.secrets.example .env.secrets
    echo   然后编辑 .env.secrets 文件
    exit /b 1
)

echo 加载密钥配置...
for /f "usebackq tokens=1,2 delims==" %%a in (".env.secrets") do (
    if "%%a"=="DEEPSEEK_API_KEY" (
        set "DEEPSEEK_API_KEY=%%b"
        if "%%b"=="your-deepseek-api-key-here" (
            echo 错误: DEEPSEEK_API_KEY 未配置，请编辑 .env.secrets 文件
            exit /b 1
        )
    )
    if "%%a"=="JWT_SECRET" (
        set "JWT_SECRET=%%b"
        if "%%b"=="your-super-secret-jwt-key-change-in-production-sc" (
            echo 错误: JWT_SECRET 未配置，请编辑 .env.secrets 文件
            exit /b 1
        )
    )
)

if "!DEEPSEEK_API_KEY!"=="" (
    echo 错误: DEEPSEEK_API_KEY 未在 .env.secrets 中找到
    exit /b 1
)

if "!JWT_SECRET!"=="" (
    echo 错误: JWT_SECRET 未在 .env.secrets 中找到
    exit /b 1
)

echo 密钥配置加载成功:
echo   DEEPSEEK_API_KEY: !DEEPSEEK_API_KEY:~0,8!...
echo   JWT_SECRET: !JWT_SECRET:~0,8!...
echo.
exit /b 0