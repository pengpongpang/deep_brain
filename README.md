# Deep Brain - LLM驱动的思维导图工具

一个基于LLM的智能思维导图生成和扩展工具，支持用户登录注册，可以根据主题自动生成思维导图并支持节点智能扩展。

## 技术栈

- **前端**: React.js + TypeScript
- **后端**: Python + FastAPI
- **数据库**: MongoDB
- **容器化**: Docker + Docker Compose
- **思维导图渲染**: React Flow / D3.js
- **LLM集成**: OpenAI API

## 项目结构

```
deep-brain/
├── docker-compose.yml          # Docker编排配置
├── README.md                   # 项目说明
├── .env.example               # 环境变量示例
├── backend/                   # Python后端
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py
│   ├── models/               # 数据模型
│   ├── routes/               # API路由
│   ├── services/             # 业务逻辑
│   └── utils/                # 工具函数
└── frontend/                 # React前端
    ├── Dockerfile
    ├── package.json
    ├── src/
    │   ├── components/       # React组件
    │   ├── pages/           # 页面组件
    │   ├── services/        # API服务
    │   ├── store/           # 状态管理
    │   └── utils/           # 工具函数
    └── public/
```

## 快速开始

1. 克隆项目并进入目录
2. 复制环境变量文件: `cp .env.example .env`
3. 配置OpenAI API Key在.env文件中
4. 前端环境配置（可选）:
   - 复制前端环境变量文件: `cp frontend/.env.example frontend/.env.local`
   - 根据部署环境配置API URL
5. 启动服务: `docker-compose up -d`
6. 访问应用: http://localhost:3000

## 环境配置说明

### 前端API配置
- **开发环境**: 前端使用相对路径 `/api`，通过proxy代理到后端
- **生产环境**: 需要在 `frontend/.env.local` 中设置 `REACT_APP_API_URL` 为完整的API服务器地址
- **示例配置**: 参考 `frontend/.env.example` 文件

## 核心功能

- 用户注册/登录系统
- 基于主题的思维导图自动生成
- 节点智能扩展功能
- 思维导图的保存和管理
- 响应式的交互界面

## API文档

后端API文档可在 http://localhost:8000/docs 查看