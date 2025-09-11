#!/bin/bash

# Deep Brain 项目自动部署脚本 (Mac/Linux)
# 使用方法: chmod +x deploy.sh && ./deploy.sh

set -e  # 遇到错误立即退出

# 启用Docker BuildKit以提升构建性能
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

echo "========================================"
echo "Deep Brain 项目自动部署脚本 (Mac/Linux)"
echo "========================================"
echo

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检测操作系统
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        log_info "检测到 macOS 系统"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        log_info "检测到 Linux 系统"
    else
        log_error "不支持的操作系统: $OSTYPE"
        exit 1
    fi
}

# 检查Docker是否已安装
check_docker() {
    log_info "[1/6] 检查Docker环境..."
    if command -v docker &> /dev/null; then
        log_success "Docker已安装"
        DOCKER_VERSION=$(docker --version)
        log_info "Docker版本: $DOCKER_VERSION"
    else
        log_warning "Docker未安装，开始自动安装..."
        install_docker
    fi
}

# 安装Docker
install_docker() {
    if [[ "$OS" == "macos" ]]; then
        install_docker_macos
    elif [[ "$OS" == "linux" ]]; then
        install_docker_linux
    fi
}

# 在macOS上安装Docker
install_docker_macos() {
    log_info "正在为macOS安装Docker..."
    
    # 检查是否安装了Homebrew
    if ! command -v brew &> /dev/null; then
        log_info "安装Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    
    # 检查系统架构
    ARCH=$(uname -m)
    if [[ "$ARCH" == "arm64" ]]; then
        log_info "检测到Apple Silicon (M1/M2)，安装Docker Desktop..."
        brew install --cask docker
    else
        log_info "检测到Intel处理器，安装Docker Desktop..."
        brew install --cask docker
    fi
    
    log_success "Docker安装完成"
    log_warning "请手动启动Docker Desktop应用程序，然后重新运行此脚本"
    exit 0
}

# 在Linux上安装Docker
install_docker_linux() {
    log_info "正在为Linux安装Docker..."
    
    # 检测Linux发行版
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        DISTRO=$ID
    else
        log_error "无法检测Linux发行版"
        exit 1
    fi
    
    case $DISTRO in
        ubuntu|debian)
            install_docker_ubuntu_debian
            ;;
        centos|rhel|fedora)
            install_docker_centos_rhel
            ;;
        *)
            log_error "不支持的Linux发行版: $DISTRO"
            log_info "请手动安装Docker: https://docs.docker.com/engine/install/"
            exit 1
            ;;
    esac
}

# Ubuntu/Debian安装Docker
install_docker_ubuntu_debian() {
    log_info "在Ubuntu/Debian上安装Docker..."
    
    # 更新包索引
    sudo apt-get update
    
    # 安装必要的包
    sudo apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    # 添加Docker官方GPG密钥
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/$DISTRO/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # 设置仓库
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$DISTRO \
        $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # 安装Docker Engine
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # 启动Docker服务
    sudo systemctl start docker
    sudo systemctl enable docker
    
    # 将当前用户添加到docker组
    sudo usermod -aG docker $USER
    
    log_success "Docker安装完成"
    log_warning "请重新登录或运行 'newgrp docker' 以使用Docker"
}

# CentOS/RHEL安装Docker
install_docker_centos_rhel() {
    log_info "在CentOS/RHEL上安装Docker..."
    
    # 安装必要的包
    sudo yum install -y yum-utils
    
    # 设置仓库
    sudo yum-config-manager \
        --add-repo \
        https://download.docker.com/linux/centos/docker-ce.repo
    
    # 安装Docker Engine
    sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # 启动Docker服务
    sudo systemctl start docker
    sudo systemctl enable docker
    
    # 将当前用户添加到docker组
    sudo usermod -aG docker $USER
    
    log_success "Docker安装完成"
    log_warning "请重新登录或运行 'newgrp docker' 以使用Docker"
}

# 检查Docker服务状态
check_docker_service() {
    log_info "[2/6] 检查Docker服务状态..."
    
    if docker info &> /dev/null; then
        log_success "Docker服务正在运行"
    else
        log_warning "Docker服务未运行，尝试启动..."
        
        if [[ "$OS" == "macos" ]]; then
            log_error "请手动启动Docker Desktop应用程序"
            exit 1
        else
            sudo systemctl start docker
            sleep 5
            if docker info &> /dev/null; then
                log_success "Docker服务启动成功"
            else
                log_error "Docker服务启动失败"
                exit 1
            fi
        fi
    fi
}

# 检查Docker Compose
check_docker_compose() {
    if docker compose version &> /dev/null; then
        log_success "Docker Compose (plugin) 可用"
        COMPOSE_CMD="docker compose"
    elif command -v docker-compose &> /dev/null; then
        log_success "Docker Compose (standalone) 可用"
        COMPOSE_CMD="docker-compose"
    else
        log_error "Docker Compose未安装"
        exit 1
    fi
}

# 停止现有容器
stop_existing_containers() {
    log_info "[3/6] 停止现有容器..."
    
    if [[ -f "docker-compose.prod.yml" ]]; then
        $COMPOSE_CMD -f docker-compose.prod.yml down || true
    fi
    
    if [[ -f "docker-compose.yml" ]]; then
        $COMPOSE_CMD down || true
    fi
    
    log_success "现有容器已停止"
}

# 构建前端生产版本
build_frontend() {
    log_info "[4/6] 构建前端生产版本..."
    
    # 创建构建目录
    mkdir -p frontend/build
    
    log_info "构建前端打包镜像..."
    docker build -f frontend/Dockerfile.build -t deep-brain-frontend-builder frontend/
    
    # 从开发镜像中提取构建文件
    log_info "提取构建结果文件..."
    docker create --name temp-frontend deep-brain-frontend-builder
    docker cp temp-frontend:/app/build frontend/
    docker rm temp-frontend
    
    log_success "前端构建完成"
}

# 使用预创建的生产环境配置
# 检查和加载环境变量
check_and_load_secrets() {
    log_info "[5/7] 检查和加载保密密钥..."
    
    # 检查密钥配置文件是否存在
    if [[ ! -f ".env.secrets" ]]; then
        log_error "缺少 .env.secrets 文件"
        log_error "请创建 .env.secrets 文件并配置以下密钥:"
        log_error "  - DEEPSEEK_API_KEY"
        log_error "  - JWT_SECRET"
        exit 1
    fi
    
    # 加载环境变量
    source .env.secrets
    
    # 检查必需的环境变量
    if [[ -z "$DEEPSEEK_API_KEY" || "$DEEPSEEK_API_KEY" == "your-deepseek-api-key-here" ]]; then
        log_error "DEEPSEEK_API_KEY 未配置或使用默认值"
        log_error "请在 .env.secrets 文件中设置有效的 DEEPSEEK_API_KEY"
        exit 1
    fi
    
    if [[ -z "$JWT_SECRET" || "$JWT_SECRET" == "your-super-secret-jwt-key-change-in-production" ]]; then
        log_error "JWT_SECRET 未配置或使用默认值"
        log_error "请在 .env.secrets 文件中设置有效的 JWT_SECRET"
        exit 1
    fi
    
    # 导出环境变量供docker-compose使用
    export DEEPSEEK_API_KEY
    export JWT_SECRET
    
    log_success "环境变量检查和加载完成"
    log_info "DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY:0:10}..."
    log_info "JWT_SECRET: ${JWT_SECRET:0:10}..."
}

use_production_config() {
    log_info "[6/7] 使用预创建的生产环境配置..."
    
    # 检查必要的配置文件是否存在
    if [[ ! -f "frontend/Dockerfile.prod" ]]; then
        log_error "缺少 frontend/Dockerfile.prod 文件"
        exit 1
    fi
    
    if [[ ! -f "frontend/nginx.conf" ]]; then
        log_error "缺少 frontend/nginx.conf 文件"
        exit 1
    fi
    
    if [[ ! -f "docker-compose.prod.yml" ]]; then
        log_error "缺少 docker-compose.prod.yml 文件"
        exit 1
    fi
    
    log_success "生产环境配置文件检查完成"
}

# 部署应用
deploy_application() {
    log_info "[7/7] 启动生产环境..."
    
    # 清理本项目的旧镜像和容器
    log_info "清理本项目的Docker资源..."
    # 停止并删除本项目的容器
    $COMPOSE_CMD -f docker-compose.prod.yml down --remove-orphans
    # 删除本项目的镜像（如果存在）
    docker rmi deep-brain-frontend deep-brain-backend deep-brain-frontend-builder 2>/dev/null || true
    # 清理悬空镜像（dangling images）
    docker image prune -f
    
    # 构建并启动容器（并行构建以提升速度）
    log_info "构建并启动Docker容器..."
    $COMPOSE_CMD -f docker-compose.prod.yml down
    # 并行构建所有服务
    $COMPOSE_CMD -f docker-compose.prod.yml build --parallel
    $COMPOSE_CMD -f docker-compose.prod.yml up -d
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 10
    
    # 检查容器状态
    log_info "检查容器状态..."
    $COMPOSE_CMD -f docker-compose.prod.yml ps
    
    log_success "部署完成！"
}

# 显示部署信息
show_deployment_info() {
    echo
    echo "========================================"
    echo "部署完成！"
    echo "========================================"
    echo "前端访问地址: http://localhost"
    echo "后端API地址: http://localhost:8000"
    echo "MongoDB地址: localhost:27017"
    echo
    echo "常用命令:"
    echo "查看容器状态: $COMPOSE_CMD -f docker-compose.prod.yml ps"
    echo "查看日志: $COMPOSE_CMD -f docker-compose.prod.yml logs -f"
    echo "停止服务: $COMPOSE_CMD -f docker-compose.prod.yml down"
    echo "重启服务: $COMPOSE_CMD -f docker-compose.prod.yml restart"
    echo
}

# 清理函数
cleanup() {
    log_info "清理临时文件..."
    # 清理构建过程中产生的临时容器
    docker container prune -f || true
}

# 错误处理
error_handler() {
    log_error "部署过程中发生错误，正在清理..."
    cleanup
    exit 1
}

# 设置错误处理
trap error_handler ERR

# 主函数
main() {
    detect_os
    check_docker
    check_docker_service
    check_docker_compose
    stop_existing_containers
    check_and_load_secrets
    build_frontend
    use_production_config
    deploy_application
    cleanup
    show_deployment_info
}

# 运行主函数
main "$@"