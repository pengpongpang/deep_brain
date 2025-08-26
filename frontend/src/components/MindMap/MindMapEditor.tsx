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
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  EdgeChange,
  NodeChange,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import CustomNode from './CustomNode';
import { RootState, AppDispatch } from '../../store/store';
import {
  fetchMindmapById,
  updateMindmap,
  expandNode,
} from '../../store/slices/mindmapSlice';
import { addNotification, setExpandingNodeId } from '../../store/slices/uiSlice';

interface NodeData {
  label: string;
  content?: string;
  description?: string;
  color?: string;
  level?: number;
  parent_id?: string | null;
  isRoot?: boolean;
  hasChildren?: boolean;
  collapsed?: boolean;
  order?: number; // 同级节点的排序字段
  onEdit?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
  onAddChild?: (nodeId: string) => void;
  onExpand?: (nodeId: string) => void;
  onToggleCollapse?: (nodeId: string) => void;
}

interface CustomNode extends Node {
  data: NodeData;
}

const nodeTypes = {
  custom: CustomNode,
};

const MindMapEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { currentMindmap, isLoading } = useSelector((state: RootState) => state.mindmap);
  const { expandingNodeId } = useSelector((state: RootState) => state.ui);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<CustomNode | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [expandDialogOpen, setExpandDialogOpen] = useState(false);
  const [addNodeDialogOpen, setAddNodeDialogOpen] = useState(false);
  const [nodeToExpand, setNodeToExpand] = useState<string | null>(null);
  const [expansionTopic, setExpansionTopic] = useState('');
  const [newNodeTitle, setNewNodeTitle] = useState('');
  const [newNodeDescription, setNewNodeDescription] = useState('');
  const [parentNodeForNewNode, setParentNodeForNewNode] = useState<string | null>(null);
  const [settingsMenuAnchor, setSettingsMenuAnchor] = useState<null | HTMLElement>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  // 加载思维导图数据
  useEffect(() => {
    if (id) {
      dispatch(fetchMindmapById(id));
    }
  }, [dispatch, id]);

  // 更新节点和边
  useEffect(() => {
    if (currentMindmap) {
      const processedNodes = processNodesWithLayout(currentMindmap.nodes || []);
      setNodes(processedNodes);
      setEdges(currentMindmap.edges || []);
    }
  }, [currentMindmap, setNodes, setEdges, collapsedNodes]);

  // 处理节点布局和收折状态
  const processNodesWithLayout = useCallback((rawNodes: any[]) => {
    const nodeMap = new Map(rawNodes.map(node => [node.id, node]));
    const processedNodes = [];
    
    // 计算每个节点的子节点
    const getChildren = (nodeId: string) => {
      return rawNodes.filter(node => node.data?.parent_id === nodeId || 
        rawNodes.find(edge => edge.source === nodeId && edge.target === node.id));
    };

  // 收折展开处理
  const handleToggleCollapse = (nodeId: string) => {
    setCollapsedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  // 编辑节点
  const handleEditNode = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
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
    
    for (const node of rawNodes) {
      const children = getChildren(node.id);
      const hasChildren = children.length > 0;
      const isCollapsed = collapsedNodes.has(node.id);
      
      // 如果父节点被收折，则隐藏子节点
      const isHidden = rawNodes.some(parentNode => {
        const parentChildren = getChildren(parentNode.id);
        return parentChildren.some(child => child.id === node.id) && collapsedNodes.has(parentNode.id);
      });
      
      if (!isHidden) {
        processedNodes.push({
          ...node,
          data: {
            ...node.data,
            hasChildren,
            collapsed: isCollapsed,
            onEdit: handleEditNode,
            onDelete: handleDeleteNode,
            onAddChild: handleAddNode,
            onExpand: handleExpandNode,
            onToggleCollapse: handleToggleCollapse,
          },
        });
      }
    }
    
    return applyImprovedLayout(processedNodes);
  }, [collapsedNodes]);

  // 重新应用智能布局到所有节点
  const reapplyLayout = useCallback((updatedNodes: any[], updatedEdges: any[]) => {
    const processedNodes = processNodesWithLayout(updatedNodes);
    setNodes(processedNodes);
    setEdges(updatedEdges);
  }, [processNodesWithLayout, setNodes, setEdges]);
  
  // 从左到右的树形布局算法
  const applyImprovedLayout = (nodes: any[]) => {
    if (nodes.length === 0) return nodes;
    
    const layoutNodes = [...nodes];
    
    // 找到根节点
    const rootNode = layoutNodes.find(node => 
      node.data?.isRoot === true || 
      node.data?.level === 0 || 
      node.data?.parent_id === null || 
      node.data?.parent_id === undefined
    ) || layoutNodes[0];
    
    // 构建父子关系映射
    const childrenMap = new Map<string, any[]>();
    layoutNodes.forEach(node => {
      const parentId = node.data?.parent_id;
      if (parentId) {
        if (!childrenMap.has(parentId)) {
          childrenMap.set(parentId, []);
        }
        childrenMap.get(parentId)!.push(node);
      }
    });
    
    // 对每个父节点的子节点按order字段排序
    childrenMap.forEach((children, parentId) => {
      children.sort((a, b) => (a.data?.order || 0) - (b.data?.order || 0));
    });
    
    // 计算每个节点的子树高度（用于垂直间距计算）
    const calculateSubtreeHeight = (nodeId: string): number => {
      const children = childrenMap.get(nodeId) || [];
      if (children.length === 0) return 1;
      return children.reduce((sum, child) => sum + calculateSubtreeHeight(child.id), 0);
    };
    
    // 树形布局配置
    const LEVEL_WIDTH = 250; // 每层之间的水平间距
    const NODE_HEIGHT = 80;  // 节点之间的垂直间距
    const ROOT_X = 100;      // 根节点的X坐标
    const ROOT_Y = 300;      // 根节点的Y坐标
    
    // 递归计算节点位置
    const calculateNodePosition = (node: any, x: number, startY: number): number => {
      const nodeIndex = layoutNodes.findIndex(n => n.id === node.id);
      const children = childrenMap.get(node.id) || [];
      
      if (children.length === 0) {
        // 叶子节点：直接设置位置
        if (nodeIndex !== -1) {
          layoutNodes[nodeIndex] = {
            ...layoutNodes[nodeIndex],
            position: { x, y: startY },
          };
        }
        return startY + NODE_HEIGHT;
      }
      
      // 有子节点：先计算所有子节点的位置
      let currentY = startY;
      const childPositions: number[] = [];
      
      children.forEach((child) => {
        const childX = x + LEVEL_WIDTH;
        const childEndY = calculateNodePosition(child, childX, currentY);
        childPositions.push((currentY + childEndY - NODE_HEIGHT) / 2); // 子节点的中心Y坐标
        currentY = childEndY;
      });
      
      // 计算当前节点的Y坐标（子节点的中心位置）
      const nodeY = childPositions.length > 0 
        ? (childPositions[0] + childPositions[childPositions.length - 1]) / 2
        : startY;
      
      // 设置当前节点位置
      if (nodeIndex !== -1) {
        layoutNodes[nodeIndex] = {
          ...layoutNodes[nodeIndex],
          position: { x, y: nodeY },
        };
      }
      
      return currentY;
    };
    
    // 从根节点开始计算位置
    calculateNodePosition(rootNode, ROOT_X, ROOT_Y);
    
    return layoutNodes;
  };

  // 监听节点和边的变化
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [nodes, edges]);

  // 处理节点拖动结束事件
  const handleNodeDragStop = useCallback(
    (event: React.MouseEvent, draggedNode: Node) => {
      // 检查是否拖拽到其他节点上
      const draggedNodeRect = {
        x: draggedNode.position.x,
        y: draggedNode.position.y,
        width: 200, // 节点宽度
        height: 80,  // 节点高度
      };
      
      // 查找与拖拽节点重叠的目标节点
      const targetNode = nodes.find(node => {
        if (node.id === draggedNode.id) return false; // 排除自己
        
        const nodeRect = {
          x: node.position.x,
          y: node.position.y,
          width: 200,
          height: 80,
        };
        
        // 检查矩形重叠
        return (
          draggedNodeRect.x < nodeRect.x + nodeRect.width &&
          draggedNodeRect.x + draggedNodeRect.width > nodeRect.x &&
          draggedNodeRect.y < nodeRect.y + nodeRect.height &&
          draggedNodeRect.y + draggedNodeRect.height > nodeRect.y
        );
      });
      
      // 如果找到目标节点，建立父子关系
      if (targetNode && targetNode.id !== draggedNode.data.parent_id) {
        // 防止循环引用：检查目标节点不是拖拽节点的子节点
        const isCircularReference = (parentId: string, childId: string): boolean => {
          const parent = nodes.find(n => n.id === parentId);
          if (!parent) return false;
          if (parent.data.parent_id === childId) return true;
          if (parent.data.parent_id) {
            return isCircularReference(parent.data.parent_id, childId);
          }
          return false;
        };
        
        if (!isCircularReference(targetNode.id, draggedNode.id)) {
          // 更新拖拽节点的父子关系
          setNodes(currentNodes => {
            const updatedNodes = currentNodes.map(node => {
              if (node.id === draggedNode.id) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    parent_id: targetNode.id,
                    level: (targetNode.data.level || 0) + 1,
                    isRoot: false,
                  },
                };
              }
              return node;
            });
            
            // 移除旧的边
            setEdges(currentEdges => {
              const filteredEdges = currentEdges.filter(edge => edge.target !== draggedNode.id);
              // 添加新的边
              const newEdge = {
                id: `edge-${targetNode.id}-${draggedNode.id}`,
                source: targetNode.id,
                target: draggedNode.id,
                type: 'smoothstep',
              };
              return [...filteredEdges, newEdge];
            });
            
            return processNodesWithLayout(updatedNodes);
          });
          
          // 显示成功提示
          dispatch(addNotification({
            type: 'success',
            message: `节点"${draggedNode.data.label}"已设为"${targetNode.data.label}"的子节点`,
          }));
          
          return; // 提前返回，不执行下面的重新布局
        }
      }
      
      // 如果没有建立新的父子关系，检查是否是同级节点排序
       if (draggedNode.data.parent_id) {
         // 获取同级节点
         const siblings = nodes.filter(node => 
           node.data.parent_id === draggedNode.data.parent_id && 
           node.id !== draggedNode.id
         );
         
         if (siblings.length > 0) {
           // 按Y坐标排序同级节点，确定新的排序
           const allSiblings = [...siblings, draggedNode].sort((a, b) => a.position.y - b.position.y);
           
           // 更新所有同级节点的order字段
           setNodes(currentNodes => {
             const updatedNodes = currentNodes.map(node => {
               const siblingIndex = allSiblings.findIndex(s => s.id === node.id);
               if (siblingIndex !== -1) {
                 return {
                   ...node,
                   data: {
                     ...node.data,
                     order: siblingIndex,
                   },
                 };
               }
               return node;
             });
             
             return processNodesWithLayout(updatedNodes);
           });
           
           // 显示排序成功提示
           dispatch(addNotification({
             type: 'info',
             message: `节点"${draggedNode.data.label}"已重新排序`,
           }));
           
           return;
         }
       }
       
       // 如果没有排序操作，只是重新应用布局
       setTimeout(() => {
         setNodes(currentNodes => {
           const processedNodes = processNodesWithLayout(currentNodes);
           return processedNodes;
         });
       }, 100);
    },
    [nodes, processNodesWithLayout, setNodes, setEdges, dispatch]
  );

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleNodeClick = (event: React.MouseEvent, node: CustomNode) => {
    setSelectedNode(node);
  };

  const handleNodeDoubleClick = (event: React.MouseEvent, node: CustomNode) => {
    setSelectedNode(node);
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!currentMindmap || !id) return;

    try {
      await dispatch(updateMindmap({
            id,
            data: {
              nodes: nodes.map(node => ({
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
              edges: edges.map(edge => ({
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

  const handleAddNode = (parentId?: string) => {
    // 如果没有指定父节点但有选中的节点，则使用选中的节点作为父节点
    // 如果都没有，则使用根节点作为父节点
    let actualParentId: string | null = parentId || selectedNode?.id || null;
    
    if (!actualParentId) {
      // 找到根节点
      const rootNode = nodes.find(node => 
        node.data?.isRoot === true || 
        node.data?.level === 0 || 
        node.data?.parent_id === null || 
        node.data?.parent_id === undefined
      );
      actualParentId = rootNode?.id || null;
    }
    
    setParentNodeForNewNode(actualParentId);
    setNewNodeTitle('');
    setNewNodeDescription('');
    setAddNodeDialogOpen(true);
  };

  const handleCreateNode = () => {
    if (!newNodeTitle.trim()) {
      return;
    }

    const parentNode = parentNodeForNewNode ? nodes.find(n => n.id === parentNodeForNewNode) : null;
    
    // 计算新节点的order值（同级节点的最大order + 1）
    const siblings = nodes.filter(node => node.data.parent_id === parentNodeForNewNode);
    const maxOrder = siblings.reduce((max, node) => Math.max(max, node.data?.order || 0), -1);
    const newOrder = maxOrder + 1;
    
    const newNode: CustomNode = {
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
      },
    };
    
    const updatedNodes = [...nodes, newNode];
    let updatedEdges = [...edges];
    
    // 如果有父节点，创建连接边
    if (parentNodeForNewNode) {
      const newEdge = {
        id: `edge-${parentNodeForNewNode}-${newNode.id}`,
        source: parentNodeForNewNode,
        target: newNode.id,
        type: 'smoothstep',
      };
      updatedEdges = [...edges, newEdge];
    }

    // 立即重新应用智能布局
    reapplyLayout(updatedNodes, updatedEdges);

    // 关闭对话框并重置状态
    setAddNodeDialogOpen(false);
    setNewNodeTitle('');
    setNewNodeDescription('');
    setParentNodeForNewNode(null);
  };

  const handleEditNode = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
      setEditDialogOpen(true);
    }
  };

  const handleDeleteNode = (nodeId?: string) => {
    const targetNodeId = nodeId || selectedNode?.id;
    if (targetNodeId && window.confirm('确定要删除这个节点吗？')) {
      setNodes((nds) => nds.filter((n) => n.id !== targetNodeId));
      setEdges((eds) => eds.filter((e) => e.source !== targetNodeId && e.target !== targetNodeId));
      if (selectedNode?.id === targetNodeId) {
        setSelectedNode(null);
      }
    }
  };

  const handleExpandNodeAction = (nodeId: string) => {
    setNodeToExpand(nodeId);
    setExpandDialogOpen(true);
  };



  const handleExpandNode = async () => {
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

  const handleNodeContextMenu = (event: React.MouseEvent, node: CustomNode) => {
    event.preventDefault();
    setNodeToExpand(node.id);
    setExpandDialogOpen(true);
  };

  const handleUpdateNode = (updatedData: NodeData) => {
    if (selectedNode) {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === selectedNode.id
            ? { ...node, data: updatedData }
            : node
        )
      );
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
              onNodeContextMenu={handleNodeContextMenu}
              onNodeDragStop={handleNodeDragStop}
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
            onClick={() => handleExpandNodeAction(selectedNode.id)}
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
            onClick={handleExpandNode}
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