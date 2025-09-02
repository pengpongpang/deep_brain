import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import SaveConfirmDialog from '../Common/SaveConfirmDialog';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import { useMindmapSnapshot } from '../../hooks/useMindmapSnapshot';
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
  enhanceNodeDescription,
  pollEnhanceTaskStatus,
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
}> = React.memo(({ onSelectionChange }) => {
  useOnSelectionChange({
    onChange: onSelectionChange,
  });
  return null;
});

// 视图状态管理组件 - 必须在ReactFlowProvider内部使用
const ViewportHandler: React.FC<{
  saveViewport: (viewport: { x: number; y: number; zoom: number }) => void;
  getSavedViewport: () => { x: number; y: number; zoom: number } | null;
  shouldRestoreViewport: boolean;
  onViewportRestored: () => void;
  isInitialLoad: boolean;
}> = React.memo(({ saveViewport, getSavedViewport, shouldRestoreViewport, onViewportRestored, isInitialLoad }) => {
  const reactFlowInstance = useReactFlow();
  const [hasRestoredViewport, setHasRestoredViewport] = useState(false);
  const [hasPerformedInitialFitView, setHasPerformedInitialFitView] = useState(false);

  // 保存当前视图状态
  const handleViewportChange = useCallback(() => {
    const viewport = reactFlowInstance.getViewport();
    saveViewport(viewport);
  }, [reactFlowInstance, saveViewport]);

  // 初始fitView逻辑
  useEffect(() => {
    if (isInitialLoad && !hasPerformedInitialFitView) {
      // 延迟执行fitView，确保节点已经渲染完成
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.1 });
        setHasPerformedInitialFitView(true);
        console.log('Performed initial fitView');
      }, 200);
    }
  }, [isInitialLoad, hasPerformedInitialFitView, reactFlowInstance]);

  // 恢复视图状态
  useEffect(() => {
    if (shouldRestoreViewport && !hasRestoredViewport) {
      const savedViewport = getSavedViewport();
      if (savedViewport) {
        // 增加延迟时间，确保节点和边都已经完全渲染完成
        setTimeout(() => {
          // 再次检查ReactFlow实例是否可用
          if (reactFlowInstance && reactFlowInstance.getNodes().length > 0) {
            reactFlowInstance.setViewport(savedViewport);
            setHasRestoredViewport(true);
            onViewportRestored();
            console.log('Restored viewport:', savedViewport);
          } else {
            console.warn('ReactFlow instance not ready, skipping viewport restore');
            setHasRestoredViewport(true);
            onViewportRestored();
          }
        }, 300); // 增加延迟时间到300ms
      } else {
        setHasRestoredViewport(true);
        onViewportRestored();
      }
    }
  }, [shouldRestoreViewport, hasRestoredViewport, getSavedViewport, reactFlowInstance, onViewportRestored]);

  // 监听视图变化并保存
  useEffect(() => {
    // 使用定时器定期保存视图状态，而不是依赖事件监听器
    const interval = setInterval(() => {
      handleViewportChange();
    }, 500); // 每500ms保存一次视图状态

    return () => {
      clearInterval(interval);
    };
  }, [handleViewportChange]);

  // 重置恢复状态当shouldRestoreViewport变为false时
  useEffect(() => {
    if (!shouldRestoreViewport && hasRestoredViewport) {
      setHasRestoredViewport(false);
      console.log('Reset viewport restore state');
    }
  }, [shouldRestoreViewport, hasRestoredViewport]);

  return null;
});

const MindMapEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { currentMindmap, isLoading, expandingTasks, enhancingTasks } = useSelector((state: RootState) => state.mindmap);
  const { expandingNodeId } = useSelector((state: RootState) => state.ui);
  
  // 使用Zustand store替代本地状态
  const {
    rawNodes,
    rawEdges,
    visibleNodes,
    visibleEdges: edges,
    collapsedNodes,
    selectedNode,
    initializeData,
    toggleCollapse,
    addNode,
    updateNode,
    deleteNode,
    moveNode,
    reorderNodes,
    setSelectedNode,
    saveViewport,
    getSavedViewport,
    clearSavedViewport,
  } = useMindmapStore();
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [expandDialogOpen, setExpandDialogOpen] = useState(false);
  const [enhanceDialogOpen, setEnhanceDialogOpen] = useState(false);
  const [addNodeDialogOpen, setAddNodeDialogOpen] = useState(false);
  const [nodeToExpand, setNodeToExpand] = useState<string | null>(null);
  const [nodeToEnhance, setNodeToEnhance] = useState<string | null>(null);
  const [expansionTopic, setExpansionTopic] = useState('');
  const [enhancementPrompt, setEnhancementPrompt] = useState('');
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
  
  // 保存确认对话框状态
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  
  // 删除确认对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<string | null>(null);
  const [nodesToDelete, setNodesToDelete] = useState<Node[]>([]);
  
  // 视图状态管理
  const [shouldRestoreViewport, setShouldRestoreViewport] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // 快照系统
  const { createSnapshot, updateSnapshot, compareWithSnapshot } = useMindmapSnapshot();
  
  // 按需检查是否有未保存的更改（仅在离开页面时调用）
  const checkUnsavedChanges = useCallback(() => {
    return compareWithSnapshot(rawNodes, rawEdges);
  }, [compareWithSnapshot, rawNodes, rawEdges]);
  
  // 视图恢复完成回调
  const handleViewportRestored = useCallback(() => {
    setShouldRestoreViewport(false);
    console.log('Viewport restoration completed');
  }, []);
  
  // 重置视图恢复状态
  const resetViewportRestore = useCallback(() => {
    setShouldRestoreViewport(false);
  }, []);
  
  // 触发视图恢复
  const triggerViewportRestore = useCallback(() => {
    if (!isInitialLoad) {
      // 延迟触发视图恢复，确保数据更新完成
      setTimeout(() => {
        setShouldRestoreViewport(true);
        console.log('Triggering viewport restore');
      }, 100);
    }
  }, [isInitialLoad]);

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
      
      // 重置视图恢复状态，避免重复恢复
      resetViewportRestore();
      
      // 检查是否有折叠状态需要保持（当有扩展任务正在进行时）
      const hasExpandingTasks = Object.keys(expandingTasks).length > 0;
      // 直接从 store 获取当前折叠状态，避免依赖循环
      const currentCollapsedNodes = useMindmapStore.getState().collapsedNodes;
      const shouldPreserveCollapsedState = hasExpandingTasks || currentCollapsedNodes.size > 0;
      
      // 初始化数据，根据情况决定是否保持折叠状态
      initializeData(nodesToProcess, edgesToProcess, shouldPreserveCollapsedState);
      
      // 如果不是初始加载，触发视图恢复
      if (!isInitialLoad) {
        triggerViewportRestore();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMindmap, expandingTasks, isInitialLoad, triggerViewportRestore, resetViewportRestore]);
  
  // 在数据初始加载完成后创建快照（只在mindmap变化时创建，避免每次数据更新都重置快照）
  useEffect(() => {
    if (rawNodes.length > 0 && currentMindmap && isInitialLoad) {
      // 创建初始快照，使用store中的rawNodes和rawEdges
      createSnapshot(rawNodes, rawEdges);
      console.log('Created initial snapshot with', rawNodes.length, 'nodes and', rawEdges.length, 'edges');
      
      // 标记初始加载完成
      setIsInitialLoad(false);
      console.log('Initial load completed');
    }
  }, [currentMindmap, createSnapshot, rawNodes, rawEdges, isInitialLoad]); // 添加isInitialLoad依赖
  
  // 收折展开处理
  const handleToggleCollapse = useCallback((nodeId: string) => {
    toggleCollapse(nodeId);
  }, [toggleCollapse]);
  
  // 同步store中的数据到本地状态
  useEffect(() => {
    const hasExpandingTasks = Object.keys(expandingTasks).length > 0;
    
    setLocalNodes(prevNodes => {
      // 检查是否需要更新位置（布局变化）
      const shouldUpdatePositions = visibleNodes.some(storeNode => {
        const prevNode = prevNodes.find(p => p.id === storeNode.id);
        return !prevNode || 
               Math.abs(prevNode.position.x - storeNode.position.x) > 1 ||
               Math.abs(prevNode.position.y - storeNode.position.y) > 1;
      });
      
      // 如果正在进行视图恢复，强制重新创建节点以确保状态一致性
      if (shouldRestoreViewport) {
        console.log('Force updating nodes during viewport restore');
        const nodesWithCallbacks = visibleNodes.map(node => {
          const isExpanding = expandingTasks[node.id] !== undefined;
          const isEnhancing = enhancingTasks[node.id] !== undefined;
          return {
            ...node,
            data: {
              ...node.data,
              isExpanding,
              isEnhancing,
              isDisabled: hasExpandingTasks,
              onEdit: handleEditNode,
              onDelete: handleDeleteNode,
              onAddChild: handleAddNode,
              onExpand: handleExpandNode,
              onEnhanceDescription: handleEnhanceDescription,
              onToggleCollapse: handleToggleCollapse,
            },
          };
        });
        return nodesWithCallbacks;
      }
      
      // 如果节点数量没有变化且位置也没有显著变化，更新节点数据和扩展状态
      if (prevNodes.length === visibleNodes.length && prevNodes.length > 0 && !shouldUpdatePositions) {
        return prevNodes.map(prevNode => {
          const storeNode = visibleNodes.find(n => n.id === prevNode.id);
          if (!storeNode) return prevNode;
          
          const isExpanding = expandingTasks[prevNode.id] !== undefined;
          const isEnhancing = enhancingTasks[prevNode.id] !== undefined;
          return {
            ...prevNode,
            data: {
              ...storeNode.data, // 使用store中的最新数据
              isExpanding,
              isEnhancing,
              isDisabled: hasExpandingTasks,
              onEdit: handleEditNode,
            onDelete: handleDeleteNode,
            onAddChild: handleAddNode,
            onExpand: handleExpandNode,
            onEnhanceDescription: handleEnhanceDescription,
            onToggleCollapse: handleToggleCollapse,
            },
          };
        });
      }
      
      // 节点数量变化时才完全重新创建
      const nodesWithCallbacks = visibleNodes.map(node => {
        const isExpanding = expandingTasks[node.id] !== undefined;
        const isEnhancing = enhancingTasks[node.id] !== undefined;
        return {
          ...node,
          data: {
            ...node.data,
            isExpanding,
            isEnhancing,
            isDisabled: hasExpandingTasks,
            onEdit: handleEditNode,
            onDelete: handleDeleteNode,
            onAddChild: handleAddNode,
            onExpand: handleExpandNode,
            onEnhanceDescription: handleEnhanceDescription,
            onToggleCollapse: handleToggleCollapse,
          },
        };
      });
      return nodesWithCallbacks;
    });
    
    setLocalEdges(edges);
  }, [visibleNodes, edges, expandingTasks, enhancingTasks, handleToggleCollapse, shouldRestoreViewport]); // eslint-disable-line react-hooks/exhaustive-deps

  // 处理选择变化
  const onSelectionChange = useCallback(
    ({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) => {
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
  const handleEditNode = useCallback((nodeId: string) => {
    const node = visibleNodes.find(n => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
      setEditDialogOpen(true);
    }
  }, [visibleNodes, setSelectedNode]);



  // 描述补充
  const handleEnhanceDescription = useCallback(async (nodeId: string) => {
    // 检查是否有未保存的更改
    if (checkUnsavedChanges()) {
      if (!currentMindmap || !id) {
        dispatch(addNotification({
          type: 'error',
          message: '无法保存，思维导图数据不完整',
        }));
        return;
      }
      
      try {
        // 先保存更改
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
                order: node.data.order || 0,
              },
              level: node.data.level || 0,
              parent_id: node.data.parent_id || null,
              isRoot: node.data.isRoot || false,
              order: node.data.order || 0,
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
        
        // 保存成功后更新快照
        updateSnapshot(rawNodes, rawEdges);
        
        dispatch(addNotification({
          type: 'success',
          message: '已保存更改，开始补充描述',
        }));
      } catch (error) {
        dispatch(addNotification({
          type: 'error',
          message: '保存失败，无法补充描述',
        }));
        return;
      }
    }
    
    setNodeToEnhance(nodeId);
    setEnhanceDialogOpen(true);
  }, [checkUnsavedChanges, dispatch, currentMindmap, id, rawNodes, rawEdges, updateSnapshot]);

  // 扩展节点
  const handleExpandNode = useCallback(async (nodeId: string) => {
    // 检查是否有未保存的更改
    if (checkUnsavedChanges()) {
      if (!currentMindmap || !id) {
        dispatch(addNotification({
          type: 'error',
          message: '无法保存，思维导图数据不完整',
        }));
        return;
      }
      
      try {
        // 先保存更改
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
                order: node.data.order || 0,
              },
              level: node.data.level || 0,
              parent_id: node.data.parent_id || null,
              isRoot: node.data.isRoot || false,
              order: node.data.order || 0,
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
        
        // 保存成功后更新快照
        updateSnapshot(rawNodes, rawEdges);
        
        dispatch(addNotification({
          type: 'success',
          message: '已保存更改，开始扩展节点',
        }));
      } catch (error) {
        dispatch(addNotification({
          type: 'error',
          message: '保存失败，无法扩展节点',
        }));
        return;
      }
    }
    
    setNodeToExpand(nodeId);
    setExpandDialogOpen(true);
  }, [checkUnsavedChanges, dispatch, currentMindmap, id, rawNodes, rawEdges, updateSnapshot]);

  // 删除节点
  const handleDeleteNode = useCallback((nodeId?: string) => {
    if (nodeId) {
      // 删除指定节点
      setNodeToDelete(nodeId);
      setNodesToDelete([]);
      setDeleteDialogOpen(true);
    } else {
      // 删除选中的节点（支持多选）
      const nodesToDeleteList = selectedNodes.length > 0 ? selectedNodes : (selectedNode ? [selectedNode] : []);
      
      if (nodesToDeleteList.length === 0) return;
      
      setNodeToDelete(null);
      setNodesToDelete(nodesToDeleteList);
      setDeleteDialogOpen(true);
    }
  }, [selectedNode, selectedNodes]);
  
  // 确认删除节点
  const confirmDeleteNode = useCallback(() => {
    if (nodeToDelete) {
      // 删除指定节点
      deleteNode(nodeToDelete);
      if (selectedNode?.id === nodeToDelete) {
        setSelectedNode(null);
      }
    } else if (nodesToDelete.length > 0) {
      // 删除所有选中的节点
      nodesToDelete.forEach(node => {
        deleteNode(node.id);
      });
      
      // 清空选择状态
      setSelectedNode(null);
      setSelectedNodes([]);
      setSelectedEdges([]);
    }
    
    // 关闭对话框并重置状态
    setDeleteDialogOpen(false);
    setNodeToDelete(null);
    setNodesToDelete([]);
  }, [deleteNode, nodeToDelete, nodesToDelete, selectedNode, setSelectedNode]);
  
  // 取消删除
  const cancelDeleteNode = useCallback(() => {
    setDeleteDialogOpen(false);
    setNodeToDelete(null);
    setNodesToDelete([]);
  }, []);

  // 添加节点
  const handleAddNode = useCallback((parentId?: string) => {
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
  }, [selectedNode, visibleNodes, collapsedNodes, toggleCollapse]);

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
    // hasUnsavedChanges现在通过快照对比自动计算
    
    setAddNodeDialogOpen(false);
    setNewNodeTitle('');
    setNewNodeDescription('');
    setParentNodeForNewNode(null);
  };

  // 处理节点变化 - 优化拖动性能
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // 过滤掉拖动过程中的位置变化，只保留其他类型的变化
      const filteredChanges = changes.filter(change => {
        if (change.type === 'position' && change.dragging) {
          // 拖动过程中不更新状态，避免卡顿
          return false;
        }
        return true;
      });
      
      // 只应用非拖动的变化
      if (filteredChanges.length > 0) {
        setLocalNodes((nds) => applyNodeChanges(filteredChanges, nds));
        // hasUnsavedChanges现在通过快照对比自动计算
      }
      
      // 对于拖动过程中的位置变化，直接更新DOM而不触发状态更新
      const dragChanges = changes.filter(change => 
        change.type === 'position' && change.dragging
      );
      
      if (dragChanges.length > 0) {
        // 直接更新localNodes的位置，但不触发重新渲染
        setLocalNodes((nds) => {
          return nds.map(node => {
            const dragChange = dragChanges.find(change => {
              if (change.type === 'position' && 'id' in change) {
                return change.id === node.id;
              }
              return false;
            });
            if (dragChange && dragChange.type === 'position' && 'position' in dragChange && dragChange.position) {
              return {
                ...node,
                position: dragChange.position
              };
            }
            return node;
          });
        });
      }
    },
    []
  );
  
  // 处理拖拽结束事件 - 触发重新布局或建立父子关系
  const onNodeDragStop = useCallback(
    (event: React.MouseEvent, node: Node) => {
      // 检查是否拖拽到了另一个节点上
      const draggedNode = rawNodes.find(n => n.id === node.id);
      if (!draggedNode) return;
      
      // 获取鼠标位置下的元素
      const elementsBelow = document.elementsFromPoint(event.clientX, event.clientY);
      
      // 查找是否有其他节点在拖拽位置下方
      let targetNodeElement = null;
      for (const element of elementsBelow) {
        const nodeId = element.getAttribute('data-id');
        if (nodeId && nodeId !== node.id && rawNodes.find(n => n.id === nodeId)) {
          targetNodeElement = element;
          break;
        }
      }
      
      if (targetNodeElement) {
         const targetNodeId = targetNodeElement.getAttribute('data-id');
         if (!targetNodeId) return;
         
         const targetNode = rawNodes.find(n => n.id === targetNodeId);
         
         if (targetNode && targetNodeId !== draggedNode.data.parent_id) {
          // 检查是否会创建循环引用
          const wouldCreateCycle = (nodeId: string, potentialParentId: string): boolean => {
             let currentId: string | null = potentialParentId;
             while (currentId) {
               if (currentId === nodeId) return true;
               const currentNode = rawNodes.find(n => n.id === currentId);
               currentId = currentNode?.data.parent_id || null;
             }
             return false;
           };
          
          if (!wouldCreateCycle(draggedNode.id, targetNodeId)) {
             // 建立新的父子关系
             moveNode(draggedNode.id, targetNodeId);
            dispatch(addNotification({
              type: 'success',
              message: `节点"${draggedNode.data.label}"已移动到"${targetNode.data.label}"下`,
            }));
            return;
          } else {
            dispatch(addNotification({
              type: 'warning',
              message: '无法移动节点：会创建循环引用',
            }));
          }
        }
      }
      
      // 如果没有拖拽到其他节点上，执行原有的重新排序逻辑
      const siblings = rawNodes.filter(n => n.data.parent_id === draggedNode.data.parent_id);
      
      // 创建一个临时的节点位置映射，包含拖动后的位置
      const nodePositions = new Map();
      localNodes.forEach(ln => nodePositions.set(ln.id, ln.position));
      nodePositions.set(node.id, node.position); // 使用拖动后的新位置
      
      // 按Y坐标重新排序同级节点
      const sortedSiblings = siblings.sort((a, b) => {
        const aY = nodePositions.get(a.id)?.y || 0;
        const bY = nodePositions.get(b.id)?.y || 0;
        return aY - bY;
      });
      
      // 调用reorderNodes触发重新布局
      reorderNodes(draggedNode.id, sortedSiblings);
      // hasUnsavedChanges现在通过快照对比自动计算
    },
    [reorderNodes, rawNodes, localNodes, moveNode, dispatch]
  );

  // 处理边变化
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setLocalEdges((eds) => applyEdgeChanges(changes, eds));
      // hasUnsavedChanges现在通过快照对比自动计算
    },
    []
  );

  // 处理连接
  const onConnect = useCallback(
    (params: Connection) => {
      setLocalEdges((eds) => addEdge(params, eds));
      // hasUnsavedChanges现在通过快照对比自动计算
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
              order: node.data.order || 0,
            },
            level: node.data.level || 0,
            parent_id: node.data.parent_id || null,
            isRoot: node.data.isRoot || false,
            order: node.data.order || 0,
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
      
      // hasUnsavedChanges现在通过快照对比自动计算
      
      // 保存成功后更新快照
      updateSnapshot(rawNodes, rawEdges);
      console.log('Updated snapshot after save with', rawNodes.length, 'nodes and', rawEdges.length, 'edges');
      
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

  // 处理导航确认
  const handleNavigationConfirm = useCallback((destination: string) => {
    if (checkUnsavedChanges()) {
      setPendingNavigation(destination);
      setSaveConfirmOpen(true);
    } else {
      navigate(destination);
    }
  }, [checkUnsavedChanges, navigate]);

  // 保存并导航
  const handleSaveAndNavigate = useCallback(async () => {
    try {
      await handleSave();
      if (pendingNavigation) {
        navigate(pendingNavigation);
      }
    } catch (error) {
      // 保存失败，不导航
    } finally {
      setSaveConfirmOpen(false);
      setPendingNavigation(null);
    }
  }, [handleSave, pendingNavigation, navigate]);

  // 不保存直接导航
  const handleDiscardAndNavigate = useCallback(() => {
    // hasUnsavedChanges现在通过快照对比自动计算，不需要手动设置
    if (pendingNavigation) {
      navigate(pendingNavigation);
    }
    setSaveConfirmOpen(false);
    setPendingNavigation(null);
  }, [pendingNavigation, navigate]);

  // 使用路由变化警告钩子
  const { showDialog, dialogProps } = useUnsavedChangesWarning({
    hasUnsavedChanges: checkUnsavedChanges,
    onSave: handleSave,
    message: '您有未保存的更改，是否要保存？',
  });

  // 描述补充提交
  const handleEnhanceDescriptionSubmit = async () => {
    if (!nodeToEnhance || !id || !currentMindmap) return;

    try {
      const result = await dispatch(enhanceNodeDescription({
         mindmapId: id!,
         nodeId: nodeToEnhance,
         enhancementPrompt: enhancementPrompt || '',
         currentNodes: currentMindmap.nodes,
         currentEdges: currentMindmap.edges,
       })).unwrap();
      
      // 立即关闭弹窗
      setEnhanceDialogOpen(false);
      setEnhancementPrompt('');
      setNodeToEnhance(null);
      
      // 开始轮询任务状态
      if (result && result.taskId) {
        dispatch(pollEnhanceTaskStatus({
          taskId: result.taskId,
          nodeId: nodeToEnhance,
          mindmapId: id!,
        }));
        
        dispatch(addNotification({
          type: 'info',
          message: '描述补充任务已创建，正在处理中...',
        }));
      }
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        message: '创建描述补充任务失败，请重试',
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
    <Box sx={{ height: 'calc(100vh - 64px - 48px)', display: 'flex', flexDirection: 'column' }}>
      {/* 工具栏 */}
      <Paper elevation={1} sx={{ zIndex: 1000 }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {currentMindmap.title}
          </Typography>
          
          <Button
            startIcon={<SaveIcon />}
            onClick={handleSave}
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
            multiSelectionKeyCode={['Meta', 'Control', 'Shift']}
            panOnDrag={[1, 2]}
            deleteKeyCode={null}
            preventScrolling={false}
            nodeOrigin={[0, 0.5]}
            attributionPosition="bottom-left"
            elevateNodesOnSelect={false}
            disableKeyboardA11y={true}
            nodesConnectable={false}
            onlyRenderVisibleElements={true}
            maxZoom={2}
            minZoom={0.1}
            snapToGrid={false}
            snapGrid={[15, 15]}
            connectionMode={"loose" as any}
          >
            <SelectionHandler onSelectionChange={onSelectionChange} />
            <ViewportHandler 
              saveViewport={saveViewport}
              getSavedViewport={getSavedViewport}
              shouldRestoreViewport={shouldRestoreViewport}
              onViewportRestored={handleViewportRestored}
              isInitialLoad={isInitialLoad}
            />
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
            value={selectedNode?.data.label || ''}
            onChange={(e) => {
              if (selectedNode) {
                const updatedNode = {
                  ...selectedNode,
                  data: { ...selectedNode.data, label: e.target.value },
                };
                setSelectedNode(updatedNode);
                // 实时更新store中的节点数据
                updateNode(selectedNode.id, { label: e.target.value });
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
            value={selectedNode?.data.content || ''}
            onChange={(e) => {
              if (selectedNode) {
                const updatedNode = {
                  ...selectedNode,
                  data: { ...selectedNode.data, content: e.target.value },
                };
                setSelectedNode(updatedNode);
                // 实时更新store中的节点数据
                updateNode(selectedNode.id, { content: e.target.value });
              }
            }}
          />
          <TextField
            margin="dense"
            label="详细描述"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={selectedNode?.data.description || ''}
            onChange={(e) => {
              if (selectedNode) {
                const updatedNode = {
                  ...selectedNode,
                  data: { ...selectedNode.data, description: e.target.value },
                };
                setSelectedNode(updatedNode);
                // 实时更新store中的节点数据
                updateNode(selectedNode.id, { description: e.target.value });
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setEditDialogOpen(false);
              setSelectedNode(null);
            }} 
            variant="contained"
          >
            关闭
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

      {/* AI描述补充对话框 */}
      <Dialog open={enhanceDialogOpen} onClose={() => setEnhanceDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>AI描述补充</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            使用AI为选中的节点补充详细描述
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="补充上下文（可选）"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={enhancementPrompt}
            onChange={(e) => setEnhancementPrompt(e.target.value)}
            placeholder="输入相关背景信息或特定要求，留空则自动补充"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEnhanceDialogOpen(false)}>取消</Button>
          <Button
            onClick={handleEnhanceDescriptionSubmit}
            variant="contained"
            disabled={enhancingTasks[nodeToEnhance || ''] !== undefined}
          >
            {enhancingTasks[nodeToEnhance || ''] !== undefined ? '补充中...' : '开始补充'}
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
        <MenuItem onClick={() => handleNavigationConfirm('/mindmaps')}>返回列表</MenuItem>
        <MenuItem onClick={() => {/* TODO: 实现分享功能 */}}>分享</MenuItem>
        <MenuItem onClick={() => {/* TODO: 实现导出功能 */}}>导出</MenuItem>
      </Menu>

      {/* 删除确认对话框 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={cancelDeleteNode}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          确认删除
        </DialogTitle>
        <DialogContent>
          <Typography>
            {nodeToDelete 
              ? '确定要删除这个节点吗？此操作将同时删除其所有子节点，且无法撤销。'
              : nodesToDelete.length === 1
                ? '确定要删除这个节点吗？此操作将同时删除其所有子节点，且无法撤销。'
                : `确定要删除这${nodesToDelete.length}个节点吗？此操作将同时删除其所有子节点，且无法撤销。`
            }
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDeleteNode}>
            取消
          </Button>
          <Button onClick={confirmDeleteNode} color="error" variant="contained">
            删除
          </Button>
        </DialogActions>
      </Dialog>

      {/* 保存确认对话框 */}
      <SaveConfirmDialog
        open={showDialog || saveConfirmOpen}
        onClose={showDialog ? dialogProps.onClose : () => setSaveConfirmOpen(false)}
        onSave={showDialog ? dialogProps.onSave : handleSaveAndNavigate}
        onDiscard={showDialog ? dialogProps.onDiscard : handleDiscardAndNavigate}
        title="离开页面确认"
        message={showDialog ? dialogProps.message : "您有未保存的更改，是否要保存后离开？"}
      />
    </Box>
  );
};

export default MindMapEditor;