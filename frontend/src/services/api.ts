import axios, { AxiosResponse } from 'axios';

// API基础配置
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加认证token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token过期或无效，清除本地存储并重定向到登录页
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 类型定义
export interface User {
  id: string;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface MindMapNode {
  id: string;
  data: {
    label: string;
    description?: string;
    color?: string;
  };
  position: {
    x: number;
    y: number;
  };
  type?: string;
}

export interface MindMapEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
}

export interface MindMap {
  id: string;
  title: string;
  description?: string;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  is_public: boolean;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMindMapRequest {
  title: string;
  description?: string;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  is_public?: boolean;
}

export interface UpdateMindMapRequest {
  title?: string;
  description?: string;
  nodes?: MindMapNode[];
  edges?: MindMapEdge[];
  is_public?: boolean;
}

export interface GenerateMindMapRequest {
  topic: string;
  description?: string;
  max_nodes?: number;
}

export interface ExpandNodeRequest {
  node_id: string;
  expansion_topic?: string;
  max_new_nodes?: number;
}

export interface Task {
  id: string;
  title?: string;
  description?: string;
  task_type: 'generate_mindmap' | 'expand_node';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'stopped' | 'restarting';
  progress: number;
  result?: any;
  error_message?: string;
  input_data: any;
  task_definition?: any;
  is_stoppable: boolean;
  is_restartable: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface TaskResponse {
  task_id: string;
  message: string;
  status_url?: string;
}

// 认证API
export const authAPI = {
  login: (data: LoginRequest): Promise<AxiosResponse<LoginResponse>> =>
    api.post('/auth/login', data),
  
  register: (data: RegisterRequest): Promise<AxiosResponse<User>> =>
    api.post('/auth/register', data),
  
  getCurrentUser: (): Promise<AxiosResponse<User>> =>
    api.get('/auth/me'),
  
  updateUser: (data: Partial<User>): Promise<AxiosResponse<User>> =>
    api.put('/auth/me', data),
};

// 思维导图API
export const mindmapAPI = {
  getMindmaps: (): Promise<AxiosResponse<MindMap[]>> =>
    api.get('/mindmaps'),
  
  getMindmapById: (id: string): Promise<AxiosResponse<MindMap>> =>
    api.get(`/mindmaps/${id}`),
  
  createMindmap: (data: CreateMindMapRequest): Promise<AxiosResponse<MindMap>> =>
    api.post('/mindmaps', data),
  
  updateMindmap: (id: string, data: UpdateMindMapRequest): Promise<AxiosResponse<MindMap>> =>
    api.put(`/mindmaps/${id}`, data),
  
  deleteMindmap: (id: string): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/mindmaps/${id}`),
  
  searchPublicMindmaps: (query: string): Promise<AxiosResponse<MindMap[]>> =>
    api.get(`/mindmaps/search?q=${encodeURIComponent(query)}`),
};

// LLM API
export const llmAPI = {
  generateMindmap: (data: GenerateMindMapRequest): Promise<AxiosResponse<TaskResponse>> =>
    api.post('/llm/generate-mindmap', data),
  
  expandNode: (mindmapId: string, data: ExpandNodeRequest): Promise<AxiosResponse<MindMap>> =>
    api.post(`/llm/expand-node/${mindmapId}`, data),
  
  suggestTopics: (query: string): Promise<AxiosResponse<string[]>> =>
    api.get(`/llm/suggest-topics?q=${encodeURIComponent(query)}`),
  
  getUsageStats: (): Promise<AxiosResponse<{ mindmaps_created: number }>> =>
    api.get('/llm/usage-stats'),
};

// 任务API
export const taskAPI = {
  getTask: (taskId: string): Promise<AxiosResponse<Task>> =>
    api.get(`/tasks/${taskId}`),
  
  getUserTasks: (limit?: number): Promise<AxiosResponse<Task[]>> =>
    api.get(`/tasks${limit ? `?limit=${limit}` : ''}`),
  
  createGenerateMindmapTask: (data: GenerateMindMapRequest): Promise<AxiosResponse<TaskResponse>> =>
    api.post('/tasks/generate-mindmap', data),
  
  createExpandNodeTask: (data: ExpandNodeRequest, currentNodes: any[]): Promise<AxiosResponse<TaskResponse>> =>
    api.post('/tasks/expand-node', { request: data, current_nodes: currentNodes }),
  
  stopTask: (taskId: string): Promise<AxiosResponse<{ message: string; task_id: string }>> =>
    api.post(`/tasks/${taskId}/stop`),
  
  restartTask: (taskId: string): Promise<AxiosResponse<{ message: string; original_task_id: string; new_task_id: string }>> =>
    api.post(`/tasks/${taskId}/restart`),

  deleteTask: (taskId: string): Promise<AxiosResponse<{ message: string; task_id: string }>> =>
    api.delete(`/tasks/${taskId}`),
};

// 为了向后兼容，保留旧的导出名称
export const taskApi = taskAPI;

export default api;