import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { mindmapAPI, llmAPI, taskAPI } from '../../services/api';
import type { Task, TaskResponse } from '../../services/api';

interface GenerateMindMapRequest {
  topic: string;
  description?: string;
  depth?: number;
  style?: string;
}

interface ExpandNodeRequest {
  node_id: string;
  expansion_topic?: string;
  max_new_nodes?: number;
}

interface CreateMindMapRequest {
  title: string;
  description?: string;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  layout?: string;
  theme?: string;
  is_public?: boolean;
}

export interface MindMapNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    level?: number;
    isRoot?: boolean;
    description?: string;
  };
  style?: any;
}

export interface MindMapEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
  style?: any;
}

export interface MindMap {
  id: string;
  title: string;
  description?: string;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  layout: string;
  theme: string;
  is_public: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
  version: number;
}

interface MindmapState {
  mindmaps: MindMap[];
  currentMindmap: MindMap | null;
  isLoading: boolean;
  error: string | null;
  isGenerating: boolean;
  isExpanding: boolean;
  expandingNodeId: string | null;
  generatingTasks: { [taskId: string]: Task };
  expandingTasks: { [nodeId: string]: string }; // nodeId -> taskId
  completedMindmapId: string | null;
}

const initialState: MindmapState = {
  mindmaps: [],
  currentMindmap: null,
  isLoading: false,
  error: null,
  isGenerating: false,
  isExpanding: false,
  expandingNodeId: null,
  generatingTasks: {},
  expandingTasks: {},
  completedMindmapId: null,
};

// 异步actions
export const fetchMindmaps = createAsyncThunk(
  'mindmap/fetchMindmaps',
  async (_, { rejectWithValue }) => {
    try {
      const response = await mindmapAPI.getMindmaps();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch mindmaps');
    }
  }
);

export const fetchMindmapById = createAsyncThunk(
  'mindmap/fetchMindmapById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await mindmapAPI.getMindmapById(id);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch mindmap');
    }
  }
);

export const createMindmap = createAsyncThunk(
  'mindmap/createMindmap',
  async (mindmapData: CreateMindMapRequest, { rejectWithValue }) => {
    try {
      const response = await mindmapAPI.createMindmap(mindmapData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create mindmap');
    }
  }
);

export const updateMindmap = createAsyncThunk(
  'mindmap/updateMindmap',
  async ({ id, data }: { id: string; data: Partial<MindMap> }, { rejectWithValue }) => {
    try {
      const response = await mindmapAPI.updateMindmap(id, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || '更新思维导图失败');
    }
  }
);

export const deleteMindmap = createAsyncThunk(
  'mindmap/deleteMindmap',
  async (id: string, { rejectWithValue }) => {
    try {
      await mindmapAPI.deleteMindmap(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || '删除思维导图失败');
    }
  }
);

export const generateMindmap = createAsyncThunk(
  'mindmap/generateMindmap',
  async (request: {
    topic: string;
    description?: string;
    depth?: number;
    style?: string;
  }, { rejectWithValue, dispatch }) => {
    try {
      const response = await llmAPI.generateMindmap(request);
      const taskResponse: TaskResponse = response.data;
      
      // 开始轮询任务状态
      dispatch(pollTaskStatus(taskResponse.task_id));
      
      return taskResponse;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || '生成思维导图失败');
    }
  }
);

export const pollTaskStatus = createAsyncThunk(
  'mindmap/pollTaskStatus',
  async (taskId: string, { rejectWithValue, dispatch }) => {
    try {
      const response = await taskAPI.getTask(taskId);
      const task: Task = response.data;
      
      if (task.status === 'completed') {
        // 任务完成，停止轮询
        return task;
      } else if (task.status === 'failed') {
        // 任务失败
        return rejectWithValue(task.error_message || '任务执行失败');
      } else {
        // 任务仍在进行中，继续轮询
        setTimeout(() => {
          dispatch(pollTaskStatus(taskId));
        }, 2000); // 每2秒轮询一次
        return task;
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || '获取任务状态失败');
    }
  }
);

// 获取从根节点到指定节点的路径
const getNodePathToRoot = (nodeId: string, nodes: MindMapNode[], edges: MindMapEdge[]): MindMapNode[] => {
  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  const parentMap = new Map<string, string>();
  
  // 构建父子关系映射
  edges.forEach(edge => {
    parentMap.set(edge.target, edge.source);
  });
  
  const path: MindMapNode[] = [];
  let currentNodeId: string | undefined = nodeId;
  
  // 从当前节点向上追溯到根节点
  while (currentNodeId) {
    const node = nodeMap.get(currentNodeId);
    if (node) {
      path.unshift(node); // 添加到路径开头
    }
    currentNodeId = parentMap.get(currentNodeId);
  }
  
  return path;
};

export const expandNode = createAsyncThunk(
  'mindmap/expandNode',
  async ({
    mindmapId,
    nodeId,
    expansionPrompt,
    context,
    maxChildren,
    currentNodes,
    currentEdges
  }: {
    mindmapId: string;
    nodeId: string;
    expansionPrompt: string;
    context?: string;
    maxChildren?: number;
    currentNodes: MindMapNode[];
    currentEdges: MindMapEdge[];
  }, { rejectWithValue }) => {
    try {
      // 只获取从根节点到扩展节点的路径节点
      const pathNodes = getNodePathToRoot(nodeId, currentNodes, currentEdges);
      
      // 使用任务API创建扩展任务
      const response = await taskAPI.createExpandNodeTask({
        node_id: nodeId,
        expansion_topic: expansionPrompt,
        max_new_nodes: maxChildren || 15
      }, pathNodes);
      
      return {
        taskId: response.data.task_id,
        nodeId: nodeId,
        mindmapId: mindmapId,
        message: response.data.message
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || '创建扩展任务失败');
    }
  }
);

export const pollExpandTaskStatus = createAsyncThunk(
  'mindmap/pollExpandTaskStatus',
  async ({ taskId, nodeId, mindmapId }: { taskId: string; nodeId: string; mindmapId: string }, { rejectWithValue, dispatch, getState }) => {
    try {
      const response = await taskAPI.getTask(taskId);
      const task = response.data;
      
      if (task.status === 'completed') {
        // 任务完成，处理扩展结果
        if (task.result && task.result.nodes && task.result.edges) {
          // 直接添加新节点和边到当前思维导图
          dispatch(addNodesToCurrentMindmap({
            nodes: task.result.nodes,
            edges: task.result.edges
          }));
          
          // 保存更新后的思维导图到后端
          const state = getState() as any;
          const currentMindmap = state.mindmap.currentMindmap;
          if (currentMindmap) {
            try {
              await dispatch(updateMindmap({
                id: mindmapId,
                data: {
                  nodes: currentMindmap.nodes,
                  edges: currentMindmap.edges
                }
              }));
            } catch (error) {
              console.warn('Failed to save expanded mindmap to backend:', error);
            }
          }
        } else {
          // 如果任务完成但没有扩展结果，重新获取思维导图
          dispatch(fetchMindmapById(mindmapId));
        }
        return { taskId, nodeId, status: 'completed', result: task.result };
      } else if (task.status === 'failed') {
        return rejectWithValue(task.error_message || '扩展任务失败');
      } else {
        // 任务还在进行中，继续轮询
        setTimeout(() => {
          dispatch(pollExpandTaskStatus({ taskId, nodeId, mindmapId }));
        }, 2000);
        return { taskId, nodeId, status: task.status };
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || '获取任务状态失败');
    }
  }
);

const mindmapSlice = createSlice({
  name: 'mindmap',
  initialState,
  reducers: {
    setCurrentMindmap: (state, action: PayloadAction<MindMap | null>) => {
      state.currentMindmap = action.payload;
    },
    updateCurrentMindmapNodes: (state, action: PayloadAction<MindMapNode[]>) => {
      if (state.currentMindmap) {
        state.currentMindmap.nodes = action.payload;
      }
    },
    updateCurrentMindmapEdges: (state, action: PayloadAction<MindMapEdge[]>) => {
      if (state.currentMindmap) {
        state.currentMindmap.edges = action.payload;
      }
    },
    addNodesToCurrentMindmap: (state, action: PayloadAction<{ nodes: MindMapNode[]; edges: MindMapEdge[] }>) => {
      if (state.currentMindmap) {
        state.currentMindmap.nodes = [...state.currentMindmap.nodes, ...action.payload.nodes];
        state.currentMindmap.edges = [...state.currentMindmap.edges, ...action.payload.edges];
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    clearCompletedMindmapId: (state) => {
      state.completedMindmapId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch mindmaps
      .addCase(fetchMindmaps.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMindmaps.fulfilled, (state, action) => {
        state.isLoading = false;
        state.mindmaps = action.payload as any;
      })
      .addCase(fetchMindmaps.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch mindmap by ID
      .addCase(fetchMindmapById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMindmapById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentMindmap = action.payload as any;
      })
      .addCase(fetchMindmapById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create mindmap
      .addCase(createMindmap.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createMindmap.fulfilled, (state, action) => {
        state.isLoading = false;
        state.mindmaps.push(action.payload as any);
        state.currentMindmap = action.payload as any;
      })
      .addCase(createMindmap.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update mindmap
      .addCase(updateMindmap.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateMindmap.fulfilled, (state, action) => {
        state.isLoading = false;
        const payload = action.payload as any;
        const index = state.mindmaps.findIndex(m => m.id === payload.id);
        if (index !== -1) {
          state.mindmaps[index] = payload;
        }
        if (state.currentMindmap && state.currentMindmap.id === payload.id) {
          state.currentMindmap = payload;
        }
      })
      .addCase(updateMindmap.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete mindmap
      .addCase(deleteMindmap.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteMindmap.fulfilled, (state, action) => {
        state.isLoading = false;
        state.mindmaps = state.mindmaps.filter(m => m.id !== action.payload);
        if (state.currentMindmap?.id === action.payload) {
          state.currentMindmap = null;
        }
      })
      .addCase(deleteMindmap.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Generate mindmap
      .addCase(generateMindmap.pending, (state) => {
        state.isGenerating = true;
        state.error = null;
      })
      .addCase(generateMindmap.fulfilled, (state, action) => {
        const taskResponse = action.payload as any;
        if (taskResponse && taskResponse.task_id) {
          state.generatingTasks[taskResponse.task_id] = {
            id: taskResponse.task_id,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as Task;
        }
      })
      .addCase(generateMindmap.rejected, (state, action) => {
        state.isGenerating = false;
        state.error = action.payload as string;
      })
      // Poll task status
       .addCase(pollTaskStatus.fulfilled, (state, action) => {
         const task = action.payload as any;
         if (task && task.id) {
           state.generatingTasks[task.id] = task;
           
           if (task.status === 'completed') {
             state.isGenerating = false;
             if (task.result && task.result.mindmap) {
               state.mindmaps.push(task.result.mindmap);
               state.currentMindmap = task.result.mindmap;
               // 存储完成的思维导图ID，供组件使用
                state.completedMindmapId = task.result.mindmap.id;
             }
             // 清理已完成的任务
             delete state.generatingTasks[task.id];
           } else if (task.status === 'failed') {
             state.isGenerating = false;
             state.error = task.error_message || '任务执行失败';
             // 清理失败的任务
             delete state.generatingTasks[task.id];
           }
         }
       })
      .addCase(pollTaskStatus.rejected, (state, action) => {
        state.isGenerating = false;
        state.error = action.payload as string;
      })
      // Expand node
      .addCase(expandNode.pending, (state) => {
        state.error = null;
      })
      .addCase(expandNode.fulfilled, (state, action) => {
        const result = action.payload as any;
        if (result && result.taskId && result.nodeId) {
          // 记录扩展任务
          state.expandingTasks[result.nodeId] = result.taskId;
          state.expandingNodeId = result.nodeId;
        }
      })
      .addCase(expandNode.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Poll expand task status
      .addCase(pollExpandTaskStatus.fulfilled, (state, action) => {
        const result = action.payload as any;
        if (result && result.status === 'completed') {
          // 任务完成，清理扩展状态
          delete state.expandingTasks[result.nodeId];
          if (state.expandingNodeId === result.nodeId) {
            state.expandingNodeId = null;
          }
        }
      })
      .addCase(pollExpandTaskStatus.rejected, (state, action) => {
        // 轮询失败，清理扩展状态
        const nodeId = state.expandingNodeId;
        if (nodeId) {
          delete state.expandingTasks[nodeId];
          state.expandingNodeId = null;
        }
        state.error = action.payload as string;
      });
  },
});

export const {
  setCurrentMindmap,
  updateCurrentMindmapNodes,
  updateCurrentMindmapEdges,
  addNodesToCurrentMindmap,
  clearError,
  clearCompletedMindmapId,
} = mindmapSlice.actions;

export default mindmapSlice.reducer;