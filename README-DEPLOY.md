# Deep Brain 项目部署指南

本项目提供了自动化部署脚本，支持 Windows 和 Mac/Linux 平台。脚本会自动检测并安装 Docker 环境，构建生产镜像，并部署整个应用。

## 快速开始

### Windows 用户

1. **以管理员身份运行**命令提示符或 PowerShell
2. 进入项目目录
3. 运行部署脚本：
   ```cmd
   deploy.bat
   ```

### Mac/Linux 用户

1. 打开终端
2. 进入项目目录
3. 运行部署脚本：
   ```bash
   ./deploy.sh
   ```

## 部署流程

脚本会自动执行以下步骤：

1. **环境检测**：检查 Docker 是否已安装
2. **自动安装**：如果未安装 Docker，会自动下载并安装
3. **服务检查**：确保 Docker 服务正在运行
4. **停止现有容器**：清理之前的部署
5. **构建开发镜像**：用于编译前端代码
6. **构建生产镜像**：创建优化的生产环境镜像
7. **启动服务**：使用 Docker Compose 启动所有服务

## 部署后访问

部署完成后，可以通过以下地址访问：

- **前端应用**：http://localhost
- **后端API**：http://localhost:8000
- **MongoDB**：localhost:27017

## 环境变量配置

在运行部署脚本之前，建议设置以下环境变量：

```bash
# OpenAI API Key（可选，用于AI功能）
export OPENAI_API_KEY="your-openai-api-key"

# Windows 用户使用：
set OPENAI_API_KEY=your-openai-api-key
```

## 常用管理命令

### 查看容器状态
```bash
# Mac/Linux
docker compose -f docker-compose.prod.yml ps

# Windows
docker-compose -f docker-compose.prod.yml ps
```

### 查看日志
```bash
# 查看所有服务日志
docker compose -f docker-compose.prod.yml logs -f

# 查看特定服务日志
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f mongodb
```

### 重启服务
```bash
# 重启所有服务
docker compose -f docker-compose.prod.yml restart

# 重启特定服务
docker compose -f docker-compose.prod.yml restart frontend
```

### 停止服务
```bash
docker compose -f docker-compose.prod.yml down
```

### 完全清理（包括数据卷）
```bash
docker compose -f docker-compose.prod.yml down -v
```

## 生产环境架构

部署后的架构包含：

- **Frontend**：基于 Nginx 的静态文件服务器，运行在端口 80
- **Backend**：Python FastAPI 应用，运行在端口 8000
- **MongoDB**：数据库服务，运行在端口 27017
- **网络**：所有服务通过 Docker 内部网络通信

## 故障排除

### Docker 安装失败

如果自动安装 Docker 失败，请手动安装：

- **Windows**：下载 [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop)
- **Mac**：下载 [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop)
- **Linux**：参考 [Docker 官方安装指南](https://docs.docker.com/engine/install/)

### 端口冲突

如果遇到端口冲突，可以修改 `docker-compose.prod.yml` 文件中的端口映射：

```yaml
ports:
  - "8080:80"  # 将前端端口改为 8080
  - "8001:8000" # 将后端端口改为 8001
```

### 权限问题（Linux/Mac）

如果遇到 Docker 权限问题：

```bash
# 将当前用户添加到 docker 组
sudo usermod -aG docker $USER

# 重新登录或运行
newgrp docker
```

### 内存不足

确保系统有足够的内存（建议至少 4GB）。可以通过以下命令检查 Docker 资源使用：

```bash
docker system df
docker stats
```

## 开发环境

如果需要运行开发环境而不是生产环境，可以使用：

```bash
# 开发环境（支持热重载）
docker compose up -d
```

## 更新部署

当代码更新后，重新运行部署脚本即可：

```bash
# Windows
deploy.bat

# Mac/Linux
./deploy.sh
```

脚本会自动停止旧容器，重新构建镜像，并启动新的容器。

## 安全注意事项

1. **更改默认密码**：修改 `docker-compose.prod.yml` 中的 MongoDB 密码
2. **JWT 密钥**：在生产环境中更改 `JWT_SECRET`
3. **防火墙**：确保只开放必要的端口
4. **HTTPS**：在生产环境中配置 SSL 证书

## 技术支持

如果遇到问题，请检查：

1. Docker 是否正确安装并运行
2. 系统资源是否充足
3. 网络连接是否正常
4. 端口是否被其他应用占用

更多技术支持，请查看项目文档或提交 Issue。