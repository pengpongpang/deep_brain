import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Paper,
  Toolbar,
  IconButton,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
  Tooltip,
  Menu,
  MenuItem,
  Chip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  Settings as SettingsIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  FitScreen as FitScreenIcon,
  AutoAwesome as AIIcon,
} from '@mui/icons-material';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  addEdge,
  Connection,
  EdgeChange,
  NodeChange,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import CustomNodeComponent from './CustomNode';
import { RootState, AppDispatch } from '../../store/store';
import {
  fetchMindmapById,
  updateMindmap,
  expandNode,
  updateCurrentMindmapNodes,
  updateCurrentMindmapEdges,
} from '../../store/slices/mindmapSlice';
import { addNotification, setExpandingNodeId } from '../../store/slices/uiSlice';
import { useMindmapStore } from '../../store/mindmapStore';

const nodeTypes = {
  custom: CustomNodeComponent,
};

const MindMapEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { currentMindmap, isLoading } = useSelector((state: RootState) => state.mindmap);
  const { expandingNodeId } = useSelector((state: RootState) => state.ui);
  
  // 使用Zustand store替代本地状态
  const {
    visibleNodes,
    visibleEdges: edges,
    rawNodes,
    rawEdges,
    selectedNode,
    hasUnsavedChanges,
    collapsedNodes,
    initializeData,
    toggleCollapse,
    addNode,
    updateNode,
    deleteNode,
    moveNode,
    reorderNodes,
    setSelectedNode,
    setHasUnsavedChanges,
  } = useMindmapStore();
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [expandDialogOpen, setExpandDialogOpen] = useState(false);
  const [addNodeDialogOpen, setAddNodeDialogOpen] = useState(false);
  const [nodeToExpand, setNodeToExpand] = useState<string | null>(null);
  const [expansionTopic, setExpansionTopic] = useState('');
  const [newNodeTitle, setNewNodeTitle] = useState('');
  const [newNodeDescription, setNewNodeDescription] = useState('');
  const [parentNodeForNewNode, setParentNodeForNewNode] = useState<string | null>(null);
  const [settingsMenuAnchor, setSettingsMenuAnchor] = useState<null | HTMLElement>(null);

  // 加载思维导图数据
  useEffect(() => {
    if (id) {
      dispatch(fetchMindmapById(id));
    }
  }, [dispatch, id]);

  // 更新节点和边
  useEffect(() => {
    if (currentMindmap && rawNodes.length === 0) {
      const nodesToProcess = currentMindmap.nodes || [];
      const edgesToProcess = currentMindmap.edges || [];
      console.log('Initializing store with:', nodesToProcess.length, 'nodes and', edgesToProcess.length, 'edges');
      initializeData(nodesToProcess, edgesToProcess);
    }
  }, [currentMindmap, rawNodes.length, initializeData]);
  
  // 收折展开处理
  const handleToggleCollapse = useCallback((nodeId: string) => {
    console.log('=== TOGGLE COLLAPSE START ===');
    console.log('Target node ID:', nodeId);
    toggleCollapse(nodeId);
    console.log('=== TOGGLE COLLAPSE END ===');
  }, [toggleCollapse]);

  // 编辑节点
  const handleEditNode = (nodeId: string) => {
    const node = visibleNodes.find(n => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
      setEditDialogOpen(true);
    }
  };

  // 扩展节点
  const handleExpandNode = (nodeId: string) => {
    setNodeToExpand(nodeId);
    setExpandDialogOpen(true);
  };

  // 删除节点
  const handleDeleteNode = (nodeId?: string) => {
    const targetNodeId = nodeId || selectedNode?.id;
    if (targetNodeId && window.confirm('确定要删除这个节点吗？')) {
      deleteNode(targetNodeId);
      if (selectedNode?.id === targetNodeId) {
        setSelectedNode(null);
      }
    }
  };

  // 添加节点
  const handleAddNode = (parentId?: string) => {
    let actualParentId: string | null = parentId || selectedNode?.id || null;
    
    if (!actualParentId) {
      const rootNode = visibleNodes.find(node => 
        node.data?.isRoot === true || 
        node.data?.level === 0 || 
        node.data?.parent_id === null || 
        node.data?.parent_id === undefined
      );
      actualParentId = rootNode?.id || null;
    }
    
    if (actualParentId && collapsedNodes.has(actualParentId)) {
      toggleCollapse(actualParentId);
    }
    
    setParentNodeForNewNode(actualParentId);
    setNewNodeTitle('');
    setNewNodeDescription('');
    setAddNodeDialogOpen(true);
  };

  // 创建节点
  const handleCreateNode = () => {
    if (!newNodeTitle.trim()) {
      return;
    }

    const parentNode = parentNodeForNewNode ? rawNodes.find(n => n.id === parentNodeForNewNode) : null;
    const siblings = rawNodes.filter(node => node.data.parent_id === parentNodeForNewNode);
    const maxOrder = siblings.reduce((max, node) => Math.max(max, node.data?.order || 0), -1);
    const newOrder = maxOrder + 1;
    
    const newNode = {
      id: `node-${Date.now()}`,
      type: 'custom',
      position: { x: 0, y: 0 }, // 临时位置，将由布局算法重新计算
      data: {
        label: newNodeTitle.trim(),
        description: newNodeDescription.trim(),
        content: newNodeDescription.trim(),
        color: '#1976d2',
        level: parentNode ? (parentNode.data.level || 0) + 1 : 1,
        parent_id: parentNodeForNewNode || null,
        isRoot: !parentNodeForNewNode,
        order: newOrder,
        onEdit: handleEditNode,
        onDelete: handleDeleteNode,
        onAddChild: handleAddNode,
        onExpand: handleExpandNode,
        onToggleCollapse: handleToggleCollapse,
      },
    };
    
    addNode(newNode, parentNodeForNewNode || undefined);
    
    setAddNodeDialogOpen(false);
    setNewNodeTitle('');
    setNewNodeDescription('');
    setParentNodeForNewNode(null);
  };

  // 处理节点变化
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // 这里可以处理节点位置变化等
      console.log('Nodes changed:', changes);
    },
    []
  );

  // 处理边变化
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      console.log('Edges changed:', changes);
    },
    []
  );

  // 处理连接
  const onConnect = useCallback(
    (params: Connection) => {
      console.log('Connection:', params);
    },
    []
  );

  // 处理节点点击
  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  };

  // 处理节点双击
  const handleNodeDoubleClick = (event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setEditDialogOpen(true);
  };

  // 为节点添加回调函数
  const nodes = visibleNodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      onEdit: handleEditNode,
      onDelete: handleDeleteNode,
      onAddChild: handleAddNode,
      onExpand: handleExpandNode,
      onToggleCollapse: handleToggleCollapse,
    },
  }));

  // 保存
  const handleSave = async () => {
    if (!currentMindmap || !id) return;

    try {
      await dispatch(updateMindmap({
        id,
        data: {
          nodes: rawNodes.map(node => ({
            id: node.id,
            label: node.data.label || 'Untitled',
            type: node.type || 'custom',
            position: node.position,
            data: {
              label: node.data.label || 'Untitled',
              level: node.data.level || 0,
              content: node.data.content || '',
              description: node.data.description || '',
              color: node.data.color || '#1976d2',
              isRoot: node.data.isRoot || false,
              parent_id: node.data.parent_id || null,
            },
            level: node.data.level || 0,
            parent_id: node.data.parent_id || null,
            isRoot: node.data.isRoot || false,
          })),
          edges: rawEdges.map(edge => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: edge.type || 'smoothstep',
            animated: edge.animated || false,
          })),
        },
      })).unwrap();
      
      setHasUnsavedChanges(false);
      dispatch(addNotification({
        type: 'success',
        message: '思维导图保存成功',
      }));
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        message: '保存失败，请重试',
      }));
    }
  };

  // 扩展节点提交
  const handleExpandNodeSubmit = async () => {
    if (!nodeToExpand || !id) return;

    try {
      dispatch(setExpandingNodeId(nodeToExpand));
      await dispatch(expandNode({
        mindmapId: id!,
        nodeId: nodeToExpand,
        expansionPrompt: expansionTopic || '',
        maxChildren: 5,
      })).unwrap();
      
      dispatch(addNotification({
        type: 'success',
        message: '节点扩展成功',
      }));
      setExpandDialogOpen(false);
      setExpansionTopic('');
      setNodeToExpand(null);
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        message: '节点扩展失败，请重试',
      }));
    } finally {
      dispatch(setExpandingNodeId(null));
    }
  };

  // 更新节点
  const handleUpdateNode = (updatedData: any) => {
    if (selectedNode) {
      updateNode(selectedNode.id, updatedData);
      setEditDialogOpen(false);
      setSelectedNode(null);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography>加载中...</Typography>
      </Box>
    );
  }

  if (!currentMindmap) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography>思维导图不存在</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {/* 工具栏 */}
      <Paper elevation={1} sx={{ zIndex: 1000 }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {currentMindmap.title}
            {hasUnsavedChanges && (
              <Chip label="未保存" size="small" color="warning" sx={{ ml: 1 }} />
            )}
          </Typography>
          
          <Button
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
            sx={{ mr: 1 }}
          >
            保存
          </Button>
          
          <IconButton onClick={() => handleAddNode()}>
            <AddIcon />
          </IconButton>
          
          <IconButton
            onClick={() => handleDeleteNode()}
            disabled={!selectedNode}
            color="error"
          >
            <DeleteIcon />
          </IconButton>
          
          <IconButton onClick={(e) => setSettingsMenuAnchor(e.currentTarget)}>
            <SettingsIcon />
          </IconButton>
        </Toolbar>
      </Paper>

      {/* React Flow 画布 */}
      <Box sx={{ flexGrow: 1, position: 'relative' }}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
          >
            <Background />
            <Controls />
          </ReactFlow>
        </ReactFlowProvider>
        
        {/* AI扩展按钮 */}
        {selectedNode && (
          <Fab
            color="secondary"
            size="small"
            sx={{
              position: 'absolute',
              bottom: 80,
              right: 16,
            }}
            onClick={() => handleExpandNode(selectedNode.id)}
            disabled={expandingNodeId === selectedNode.id}
          >
            <AIIcon />
          </Fab>
        )}
      </Box>

      {/* 编辑节点对话框 */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>编辑节点</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="标题"
            fullWidth
            variant="outlined"
            defaultValue={selectedNode?.data.label || ''}
            onChange={(e) => {
              if (selectedNode) {
                setSelectedNode({
                  ...selectedNode,
                  data: { ...selectedNode.data, label: e.target.value },
                });
              }
            }}
          />
          <TextField
            margin="dense"
            label="内容"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            defaultValue={selectedNode?.data.content || ''}
            onChange={(e) => {
              if (selectedNode) {
                setSelectedNode({
                  ...selectedNode,
                  data: { ...selectedNode.data, content: e.target.value },
                });
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>取消</Button>
          <Button
            onClick={() => selectedNode && handleUpdateNode(selectedNode.data)}
            variant="contained"
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* AI扩展对话框 */}
      <Dialog open={expandDialogOpen} onClose={() => setExpandDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>AI节点扩展</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            使用AI为选中的节点生成相关的子节点
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="扩展主题（可选）"
            fullWidth
            variant="outlined"
            value={expansionTopic}
            onChange={(e) => setExpansionTopic(e.target.value)}
            placeholder="输入具体的扩展方向，留空则自动扩展"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExpandDialogOpen(false)}>取消</Button>
          <Button
            onClick={handleExpandNodeSubmit}
            variant="contained"
            disabled={expandingNodeId === nodeToExpand}
          >
            {expandingNodeId === nodeToExpand ? '扩展中...' : '开始扩展'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 新建节点对话框 */}
      <Dialog open={addNodeDialogOpen} onClose={() => setAddNodeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {parentNodeForNewNode ? '添加子节点' : '新建节点'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            {parentNodeForNewNode 
              ? '为选中的节点添加一个子节点' 
              : '创建一个新的思维导图节点'
            }
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="节点标题"
            fullWidth
            variant="outlined"
            value={newNodeTitle}
            onChange={(e) => setNewNodeTitle(e.target.value)}
            placeholder="请输入节点标题"
            required
          />
          <TextField
            margin="dense"
            label="节点描述（可选）"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newNodeDescription}
            onChange={(e) => setNewNodeDescription(e.target.value)}
            placeholder="请输入节点的详细描述"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddNodeDialogOpen(false)}>取消</Button>
          <Button
            onClick={handleCreateNode}
            variant="contained"
            disabled={!newNodeTitle.trim()}
          >
            创建节点
          </Button>
        </DialogActions>
      </Dialog>

      {/* 设置菜单 */}
      <Menu
        anchorEl={settingsMenuAnchor}
        open={Boolean(settingsMenuAnchor)}
        onClose={() => setSettingsMenuAnchor(null)}
      >
        <MenuItem onClick={() => navigate('/mindmaps')}>返回列表</MenuItem>
        <MenuItem onClick={() => {/* TODO: 实现分享功能 */}}>分享</MenuItem>
        <MenuItem onClick={() => {/* TODO: 实现导出功能 */}}>导出</MenuItem>
      </Menu>
    </Box>
  );
};

export default MindMapEditor;