import axios, { AxiosResponse } from 'axios';
import { logout, setTokens } from '../store/slices/authSlice';

// API基础配置
// 使用相对路径，利用package.json中的proxy配置
// 在生产环境中，可以通过REACT_APP_API_URL环境变量覆盖
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token刷新状态管理
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

// 刷新token函数
const refreshToken = async (): Promise<string | null> => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refresh_token: refreshToken
    });

    const newAccessToken = response.data.access_token;
    const newRefreshToken = response.data.refresh_token;
    
    // 使用Redux action更新状态和localStorage
    const { store } = require('../store/store');
    store.dispatch(setTokens({ 
      accessToken: newAccessToken, 
      refreshToken: newRefreshToken 
    }));
    
    return newAccessToken;
  } catch (error) {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw error;
  }
};

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

// 响应拦截器 - 处理token过期和自动刷新
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // 如果正在刷新token，将请求加入队列
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshToken();
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
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
  refresh_token: string;
  token_type: string;
  expires_in: number;
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

export interface EnhanceDescriptionRequest {
  node_id: string;
  enhancement_prompt?: string;
}

export interface Task {
  id: string;
  title?: string;
  description?: string;
  task_type: 'generate_mindmap' | 'expand_node' | 'enhance_description';
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
  
  createEnhanceDescriptionTask: (data: EnhanceDescriptionRequest, currentNodes: any[]): Promise<AxiosResponse<TaskResponse>> =>
    api.post('/tasks/enhance-description', { request: data, current_nodes: currentNodes }),
  
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