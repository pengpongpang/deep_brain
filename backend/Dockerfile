# 多阶段构建优化版本
# 第一阶段：依赖安装
FROM python:3.11-slim AS dependencies

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 复制requirements文件
COPY requirements.txt .

# 安装Python依赖到指定目录
RUN pip install --no-cache-dir --user -r requirements.txt

# 第二阶段：生产镜像
FROM python:3.11-slim AS production

# 设置工作目录
WORKDIR /app

# 从dependencies阶段复制已安装的包
COPY --from=dependencies /root/.local /root/.local

# 确保脚本在PATH中
ENV PATH=/root/.local/bin:$PATH

# 复制应用代码
COPY . .

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]