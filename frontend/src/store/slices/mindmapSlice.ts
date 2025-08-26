import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { mindmapAPI, llmAPI } from '../../services/api';

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

interface MindMapState {
  mindmaps: MindMap[];
  currentMindmap: MindMap | null;
  isLoading: boolean;
  error: string | null;
  isGenerating: boolean;
  isExpanding: boolean;
  expandingNodeId: string | null;
}

const initialState: MindMapState = {
  mindmaps: [],
  currentMindmap: null,
  isLoading: false,
  error: null,
  isGenerating: false,
  isExpanding: false,
  expandingNodeId: null,
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
  }, { rejectWithValue }) => {
    try {
      const response = await llmAPI.generateMindmap(request);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || '生成思维导图失败');
    }
  }
);

export const expandNode = createAsyncThunk(
  'mindmap/expandNode',
  async ({
    mindmapId,
    nodeId,
    expansionPrompt,
    context,
    maxChildren
  }: {
    mindmapId: string;
    nodeId: string;
    expansionPrompt: string;
    context?: string;
    maxChildren?: number;
  }, { rejectWithValue }) => {
    try {
      const response = await llmAPI.expandNode(mindmapId, {
        node_id: nodeId,
        expansion_topic: expansionPrompt,
        max_new_nodes: maxChildren || 5
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || '扩展节点失败');
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
        state.isGenerating = false;
        const payload = action.payload as any;
        if (payload && payload.mindmap) {
          state.mindmaps.push(payload.mindmap);
          state.currentMindmap = payload.mindmap;
        }
      })
      .addCase(generateMindmap.rejected, (state, action) => {
        state.isGenerating = false;
        state.error = action.payload as string;
      })
      // Expand node
      .addCase(expandNode.pending, (state) => {
        state.isExpanding = true;
        state.error = null;
      })
      .addCase(expandNode.fulfilled, (state, action) => {
        state.isExpanding = false;
        state.expandingNodeId = null;
        if (state.currentMindmap && action.payload) {
          const expandedData = action.payload as any;
          if (expandedData.nodes) {
            state.currentMindmap.nodes = [...state.currentMindmap.nodes, ...expandedData.nodes];
          }
          if (expandedData.edges) {
            state.currentMindmap.edges = [...state.currentMindmap.edges, ...expandedData.edges];
          }
        }
      })
      .addCase(expandNode.rejected, (state, action) => {
        state.isExpanding = false;
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
} = mindmapSlice.actions;

export default mindmapSlice.reducer;