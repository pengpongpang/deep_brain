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
  applyNodeChanges,
  applyEdgeChanges,
  useOnSelectionChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import CustomNodeComponent from './CustomNode';
import { RootState, AppDispatch } from '../../store/store';
import {
  fetchMindmapById,
  updateMindmap,
  expandNode,
  pollExpandTaskStatus,
  updateCurrentMindmapNodes,
  updateCurrentMindmapEdges,
} from '../../store/slices/mindmapSlice';
import { addNotification, setExpandingNodeId } from '../../store/slices/uiSlice';
import { useMindmapStore } from '../../store/mindmapStore';

const nodeTypes = {
  custom: CustomNodeComponent,
};

// 选择处理组件 - 必须在ReactFlowProvider内部使用
const SelectionHandler: React.FC<{
  onSelectionChange: ({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) => void;
}> = ({ onSelectionChange }) => {
  useOnSelectionChange({
    onChange: onSelectionChange,
  });
  return null;
};

const MindMapEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { currentMindmap, isLoading, expandingTasks } = useSelector((state: RootState) => state.mindmap);
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
  
  // 本地状态管理nodes和edges以支持拖拽
  const [localNodes, setLocalNodes] = useState<Node[]>([]);
  const [localEdges, setLocalEdges] = useState<Edge[]>([]);
  
  // 选择状态管理
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<Edge[]>([]);

  // 加载思维导图数据
  useEffect(() => {
    if (id) {
      dispatch(fetchMindmapById(id));
    }
  }, [dispatch, id]);

  // 更新节点和边
  useEffect(() => {
    if (currentMindmap) {
      const nodesToProcess = currentMindmap.nodes || [];
      const edgesToProcess = currentMindmap.edges || [];
      console.log('Initializing store with:', nodesToProcess.length, 'nodes and', edgesToProcess.length, 'edges');
      
      // 检查是否有折叠状态需要保持（当有扩展任务正在进行时）
      const hasExpandingTasks = Object.keys(expandingTasks).length > 0;
      // 直接从 store 获取当前折叠状态，避免依赖循环
      const currentCollapsedNodes = useMindmapStore.getState().collapsedNodes;
      const shouldPreserveCollapsedState = hasExpandingTasks || currentCollapsedNodes.size > 0;
      
      // 初始化数据，根据情况决定是否保持折叠状态
      initializeData(nodesToProcess, edgesToProcess, shouldPreserveCollapsedState);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMindmap, expandingTasks]);
  
  // 收折展开处理
  const handleToggleCollapse = useCallback((nodeId: string) => {
    console.log('=== TOGGLE COLLAPSE START ===');
    console.log('Target node ID:', nodeId);
    toggleCollapse(nodeId);
    console.log('=== TOGGLE COLLAPSE END ===');
  }, [toggleCollapse]);
  
  // 同步store中的数据到本地状态
  useEffect(() => {
    const hasExpandingTasks = Object.keys(expandingTasks).length > 0;
    const nodesWithCallbacks = visibleNodes.map(node => {
      const isExpanding = expandingTasks[node.id] !== undefined;
      return {
        ...node,
        data: {
          ...node.data,
          isExpanding,
          isDisabled: hasExpandingTasks,
          onEdit: handleEditNode,
          onDelete: handleDeleteNode,
          onAddChild: handleAddNode,
          onExpand: handleExpandNode,
          onToggleCollapse: handleToggleCollapse,
        },
      };
    });
    setLocalNodes(nodesWithCallbacks);
    setLocalEdges(edges);
  }, [visibleNodes, edges, expandingTasks, handleToggleCollapse]);

  // 处理选择变化
  const onSelectionChange = useCallback(
    ({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) => {
      console.log('Selection changed:', { nodes: nodes.length, edges: edges.length });
      setSelectedNodes(nodes);
      setSelectedEdges(edges);
      
      // 如果只选中了一个节点，更新selectedNode状态以保持兼容性
      if (nodes.length === 1) {
        setSelectedNode(nodes[0]);
      } else {
        setSelectedNode(null);
      }
    },
    [setSelectedNode]
  );

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
    if (nodeId) {
      // 删除指定节点
      if (window.confirm('确定要删除这个节点吗？')) {
        deleteNode(nodeId);
        if (selectedNode?.id === nodeId) {
          setSelectedNode(null);
        }
      }
    } else {
      // 删除选中的节点（支持多选）
      const nodesToDelete = selectedNodes.length > 0 ? selectedNodes : (selectedNode ? [selectedNode] : []);
      
      if (nodesToDelete.length === 0) return;
      
      const confirmMessage = nodesToDelete.length === 1 
        ? '确定要删除这个节点吗？'
        : `确定要删除这${nodesToDelete.length}个节点吗？`;
        
      if (window.confirm(confirmMessage)) {
        // 删除所有选中的节点
        nodesToDelete.forEach(node => {
          deleteNode(node.id);
        });
        
        // 清空选择状态
        setSelectedNode(null);
        setSelectedNodes([]);
        setSelectedEdges([]);
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
      console.log('=== onNodesChange 触发 ===');
      console.log('所有变化:', JSON.stringify(changes, null, 2));
      
      // 正常处理所有节点变化，不在这里处理拖拽排序
      setLocalNodes((nds) => applyNodeChanges(changes, nds));
      setHasUnsavedChanges(true);
    },
    [setHasUnsavedChanges]
  );
  
  // 处理拖拽结束事件
  const onNodeDragStop = useCallback(
    (event: React.MouseEvent, node: Node) => {
      console.log('=== 拖拽结束事件触发 ===');
      console.log('拖拽的节点:', node.data.label);
      console.log('最终位置:', node.position);
      
      const draggedNode = localNodes.find(n => n.id === node.id);
      if (!draggedNode) {
        console.log('未找到拖拽节点');
        return;
      }
      
      // 获取同级节点
      const siblings = localNodes.filter(n => 
        n.data.parent_id === draggedNode.data.parent_id && 
        n.id !== draggedNode.id
      );
      
      console.log('拖拽节点的父节点ID:', draggedNode.data.parent_id);
      console.log('找到的同级节点数量:', siblings.length);
      console.log('同级节点列表:', siblings.map(s => ({ id: s.id, label: s.data.label, y: s.position?.y })));
      
      if (siblings.length === 0) {
        console.log('没有同级节点，无需排序');
        return;
      }
      
      // 根据Y坐标排序同级节点
      const allSiblings = [...siblings, { ...draggedNode, position: node.position }];
      allSiblings.sort((a, b) => (a.position?.y || 0) - (b.position?.y || 0));
      
      console.log('排序前同级节点:', allSiblings.map(s => ({ label: s.data.label, y: s.position?.y })));
      
      // 重新计算位置
      const VERTICAL_SPACING = 100;
      const startY = allSiblings[0].position?.y || 0;
      
      const updatedNodes = allSiblings.map((sibling, index) => {
        const newY = startY + index * VERTICAL_SPACING;
        console.log(`节点 ${sibling.data.label} 新Y坐标: ${newY}`);
        return {
          ...sibling,
          position: {
            x: sibling.position?.x || 0,
            y: newY,
          },
          data: {
            ...sibling.data,
            order: index,
          },
        };
      });
      
      console.log('排序后同级节点:', updatedNodes.map(s => ({ label: s.data.label, y: s.position?.y, order: s.data.order })));
      
      // 更新本地节点状态
      setLocalNodes(prevNodes => {
        const nodeMap = new Map(updatedNodes.map(node => [node.id, node]));
        return prevNodes.map(node => nodeMap.get(node.id) || node);
      });
      
      console.log('本地节点状态已更新');
      
      // 同步更新store中的order属性
      allSiblings.forEach((sibling, index) => {
        console.log(`更新store节点 ${sibling.data.label} order为 ${index}`);
        updateNode(sibling.id, { order: index });
      });
      
      setHasUnsavedChanges(true);
      console.log('=== 拖拽排序处理完成 ===');
    },
    [localNodes, updateNode, setHasUnsavedChanges]
  );

  // 处理边变化
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      console.log('Edges changed:', changes);
      setLocalEdges((eds) => applyEdgeChanges(changes, eds));
      setHasUnsavedChanges(true);
    },
    [setHasUnsavedChanges]
  );

  // 处理连接
  const onConnect = useCallback(
    (params: Connection) => {
      console.log('Connection:', params);
    },
    []
  );

  // 处理节点双击
  const handleNodeDoubleClick = (event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setEditDialogOpen(true);
  };

  // 节点已经在useEffect中处理了回调函数

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
    if (!nodeToExpand || !id || !currentMindmap) return;

    try {
      const result = await dispatch(expandNode({
        mindmapId: id!,
        nodeId: nodeToExpand,
        expansionPrompt: expansionTopic || '',
        maxChildren: 15,
        currentNodes: currentMindmap.nodes,
        currentEdges: currentMindmap.edges,
      })).unwrap();
      
      // 立即关闭弹窗
      setExpandDialogOpen(false);
      setExpansionTopic('');
      setNodeToExpand(null);
      
      // 开始轮询任务状态
      if (result && result.taskId) {
        dispatch(pollExpandTaskStatus({
          taskId: result.taskId,
          nodeId: nodeToExpand,
          mindmapId: id!,
        }));
        
        dispatch(addNotification({
          type: 'info',
          message: '节点扩展任务已创建，正在处理中...',
        }));
      }
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        message: '创建扩展任务失败，请重试',
      }));
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
          
          <IconButton
            onClick={() => handleDeleteNode()}
            disabled={!selectedNode && selectedNodes.length === 0}
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
            nodes={localNodes}
            edges={localEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDoubleClick={handleNodeDoubleClick}
            onNodeDragStop={onNodeDragStop}
            nodeTypes={nodeTypes}
            nodesDraggable={true}
            elementsSelectable={true}
            selectionOnDrag={true}
            selectNodesOnDrag={false}
            multiSelectionKeyCode={['Meta', 'Control']}
            panOnDrag={[1, 2]}
            fitView
            attributionPosition="bottom-left"
          >
            <SelectionHandler onSelectionChange={onSelectionChange} />
            <Background />
            <Controls />
          </ReactFlow>
        </ReactFlowProvider>
        

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