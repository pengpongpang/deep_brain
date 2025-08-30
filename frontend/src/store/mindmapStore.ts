import { create } from 'zustand';
import { Node, Edge } from 'reactflow';

// 节点数据接口
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
  order?: number;
  onEdit?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
  onAddChild?: (nodeId: string) => void;
  onExpand?: (nodeId: string) => void;
  onToggleCollapse?: (nodeId: string) => void;
}

// 自定义节点接口
interface CustomNode extends Node {
  data: NodeData;
}

// Store状态接口
interface MindmapState {
  // 原始数据（包含所有节点和边，不受折叠状态影响）
  rawNodes: CustomNode[];
  rawEdges: Edge[];
  
  // 可见数据（受折叠状态影响）
  visibleNodes: CustomNode[];
  visibleEdges: Edge[];
  
  // 折叠状态
  collapsedNodes: Set<string>;
  
  // UI状态
  selectedNode: CustomNode | null;
  hasUnsavedChanges: boolean;
  
  // 操作方法
  initializeData: (nodes: CustomNode[], edges: Edge[]) => void;
  toggleCollapse: (nodeId: string) => void;
  addNode: (node: CustomNode, parentId?: string) => void;
  updateNode: (nodeId: string, data: Partial<NodeData>) => void;
  deleteNode: (nodeId: string) => void;
  moveNode: (nodeId: string, newParentId: string) => void;
  reorderNodes: (nodeId: string, siblings: CustomNode[]) => void;
  setSelectedNode: (node: CustomNode | null) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  
  // 内部方法
  updateVisibleData: () => void;
  processNodesWithLayout: (nodes: CustomNode[]) => CustomNode[];
}

// 布局算法
const applyImprovedLayout = (nodes: CustomNode[]): CustomNode[] => {
  if (nodes.length === 0) return [];

  // 找到根节点
  const rootNode = nodes.find(node => 
    node.data?.isRoot === true || 
    node.data?.level === 0 || 
    node.data?.parent_id === null || 
    node.data?.parent_id === undefined
  );

  if (!rootNode) return nodes;

  // 计算每个节点的位置
  const nodePositions = new Map<string, { x: number; y: number }>();
  const levelWidth = 250; // 增加层级间距
  const minNodeSpacing = 120; // 最小节点间距
  const nodeHeight = 80; // 节点高度

  // 计算子树高度的函数
  const calculateSubtreeHeight = (nodeId: string): number => {
    const children = nodes.filter(node => node.data?.parent_id === nodeId);
    if (children.length === 0) return nodeHeight;
    
    let totalHeight = 0;
    children.forEach(child => {
      totalHeight += calculateSubtreeHeight(child.id);
    });
    
    // 确保子树高度至少等于子节点数量 * 最小间距
    return Math.max(totalHeight, children.length * minNodeSpacing);
  };

  // 处理根节点
  nodePositions.set(rootNode.id, { x: 0, y: 0 });

  // 递归处理子节点
  const processChildren = (parentId: string, level: number) => {
    const children = nodes.filter(node => node.data?.parent_id === parentId);
    if (children.length === 0) return;

    // 按order字段排序
    children.sort((a, b) => (a.data?.order || 0) - (b.data?.order || 0));

    const parentPos = nodePositions.get(parentId);
    if (!parentPos) return;

    // 计算每个子节点的子树高度
    const childHeights = children.map(child => calculateSubtreeHeight(child.id));
    const totalHeight = childHeights.reduce((sum, height) => sum + height, 0);
    
    // 计算起始Y位置，使子节点居中分布
    let currentY = parentPos.y - totalHeight / 2;
    
    children.forEach((child, index) => {
      const x = parentPos.x + levelWidth;
      const childHeight = childHeights[index];
      
      // 将节点放在其子树高度的中心
      const y = currentY + childHeight / 2;
      
      nodePositions.set(child.id, { x, y });
      
      // 递归处理子节点
      processChildren(child.id, level + 1);
      
      // 移动到下一个子节点的位置
      currentY += childHeight;
    });
  };

  processChildren(rootNode.id, 1);

  // 应用位置到节点
  return nodes.map(node => {
    const position = nodePositions.get(node.id) || { x: 0, y: 0 };
    return {
      ...node,
      position,
    };
  });
};

// 创建Zustand store
export const useMindmapStore = create<MindmapState>((set, get) => ({
  // 初始状态
  rawNodes: [],
  rawEdges: [],
  visibleNodes: [],
  visibleEdges: [],
  collapsedNodes: new Set<string>(),
  selectedNode: null,
  hasUnsavedChanges: false,

  // 初始化数据
  initializeData: (nodes: CustomNode[], edges: Edge[]) => {
    console.log('Store: Initializing data with', nodes.length, 'nodes and', edges.length, 'edges');
    set({
      rawNodes: nodes,
      rawEdges: edges,
      collapsedNodes: new Set<string>(),
      hasUnsavedChanges: false,
    });
    get().updateVisibleData();
  },

  // 切换折叠状态
  toggleCollapse: (nodeId: string) => {
    console.log('Store: Toggling collapse for node', nodeId);
    const { collapsedNodes } = get();
    const newCollapsedNodes = new Set(collapsedNodes);
    
    if (newCollapsedNodes.has(nodeId)) {
      console.log('Store: Expanding node', nodeId);
      newCollapsedNodes.delete(nodeId);
    } else {
      console.log('Store: Collapsing node', nodeId);
      newCollapsedNodes.add(nodeId);
    }
    
    set({ 
      collapsedNodes: newCollapsedNodes,
      hasUnsavedChanges: true 
    });
    get().updateVisibleData();
  },

  // 添加节点
  addNode: (node: CustomNode, parentId?: string) => {
    console.log('Store: Adding node', node.id, 'with parent', parentId);
    const { rawNodes, rawEdges, collapsedNodes } = get();
    
    // 如果父节点是折叠状态，自动展开它
    const newCollapsedNodes = new Set(collapsedNodes);
    if (parentId && newCollapsedNodes.has(parentId)) {
      newCollapsedNodes.delete(parentId);
    }
    
    const updatedNodes = [...rawNodes, node];
    let updatedEdges = [...rawEdges];
    
    // 如果有父节点，创建连接边
    if (parentId) {
      const newEdge: Edge = {
        id: `edge-${parentId}-${node.id}`,
        source: parentId,
        target: node.id,
        type: 'smoothstep',
      };
      updatedEdges = [...updatedEdges, newEdge];
    }
    
    set({
      rawNodes: updatedNodes,
      rawEdges: updatedEdges,
      collapsedNodes: newCollapsedNodes,
      hasUnsavedChanges: true,
    });
    get().updateVisibleData();
  },

  // 更新节点
  updateNode: (nodeId: string, data: Partial<NodeData>) => {
    console.log('Store: Updating node', nodeId);
    const { rawNodes } = get();
    const updatedNodes = rawNodes.map(node => 
      node.id === nodeId 
        ? { ...node, data: { ...node.data, ...data } }
        : node
    );
    
    set({
      rawNodes: updatedNodes,
      hasUnsavedChanges: true,
    });
    get().updateVisibleData();
  },

  // 删除节点（级联删除子节点）
  deleteNode: (nodeId: string) => {
    console.log('Store: Deleting node', nodeId);
    const { rawNodes, rawEdges, collapsedNodes } = get();
    
    // 递归获取所有需要删除的节点（包括子节点）
    const getNodesToDelete = (targetNodeId: string): string[] => {
      const nodesToDelete = [targetNodeId];
      const children = rawNodes.filter(node => node.data?.parent_id === targetNodeId);
      
      for (const child of children) {
        nodesToDelete.push(...getNodesToDelete(child.id));
      }
      
      return nodesToDelete;
    };
    
    const allNodesToDelete = getNodesToDelete(nodeId);
    console.log('Store: Deleting nodes (including children):', allNodesToDelete);
    
    // 删除所有相关节点
    const updatedNodes = rawNodes.filter(node => !allNodesToDelete.includes(node.id));
    
    // 删除所有相关边
    const updatedEdges = rawEdges.filter(edge => 
      !allNodesToDelete.includes(edge.source) && !allNodesToDelete.includes(edge.target)
    );
    
    // 清理折叠状态中的已删除节点
    const newCollapsedNodes = new Set(collapsedNodes);
    allNodesToDelete.forEach(deletedNodeId => {
      newCollapsedNodes.delete(deletedNodeId);
    });
    
    set({
      rawNodes: updatedNodes,
      rawEdges: updatedEdges,
      collapsedNodes: newCollapsedNodes,
      selectedNode: null,
      hasUnsavedChanges: true,
    });
    get().updateVisibleData();
  },

  // 移动节点
  moveNode: (nodeId: string, newParentId: string) => {
    console.log('Store: Moving node', nodeId, 'to parent', newParentId);
    const { rawNodes, rawEdges } = get();
    const targetNode = rawNodes.find(n => n.id === newParentId);
    
    if (!targetNode) return;
    
    const updatedNodes = rawNodes.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            parent_id: newParentId,
            level: (targetNode.data.level || 0) + 1,
            isRoot: false,
          },
        };
      }
      return node;
    });
    
    // 更新边
    const filteredEdges = rawEdges.filter(edge => edge.target !== nodeId);
    const newEdge: Edge = {
      id: `edge-${newParentId}-${nodeId}`,
      source: newParentId,
      target: nodeId,
      type: 'smoothstep',
    };
    const updatedEdges = [...filteredEdges, newEdge];
    
    set({
      rawNodes: updatedNodes,
      rawEdges: updatedEdges,
      hasUnsavedChanges: true,
    });
    get().updateVisibleData();
  },

  // 重新排序节点
  reorderNodes: (nodeId: string, siblings: CustomNode[]) => {
    console.log('Store: Reordering nodes for', nodeId);
    const { rawNodes } = get();
    const updatedNodes = rawNodes.map(node => {
      const siblingIndex = siblings.findIndex(s => s.id === node.id);
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
    
    set({
      rawNodes: updatedNodes,
      hasUnsavedChanges: true,
    });
    get().updateVisibleData();
  },

  // 设置选中节点
  setSelectedNode: (node: CustomNode | null) => {
    set({ selectedNode: node });
  },

  // 设置未保存更改状态
  setHasUnsavedChanges: (hasChanges: boolean) => {
    set({ hasUnsavedChanges: hasChanges });
  },

  // 处理节点布局和折叠状态
  processNodesWithLayout: (rawNodes: CustomNode[]) => {
    const { collapsedNodes } = get();
    const nodeMap = new Map(rawNodes.map(node => [node.id, node]));
    const processedNodes: CustomNode[] = [];
    
    // 计算每个节点的子节点
    const getChildren = (nodeId: string) => {
      return rawNodes.filter(node => node.data?.parent_id === nodeId);
    };
    
    // 检查节点是否应该被隐藏
    const isNodeHidden = (node: CustomNode): boolean => {
      if (!node.data?.parent_id) return false; // 根节点永远不隐藏
      
      let currentParentId = node.data.parent_id;
      while (currentParentId) {
        if (get().collapsedNodes.has(currentParentId)) {
          return true;
        }
        const parentNode = nodeMap.get(currentParentId);
        const nextParentId = parentNode?.data?.parent_id || null;
        if (nextParentId === null) break;
        currentParentId = nextParentId;
      }
      return false;
    };
    
    console.log('Store: Processing nodes with layout, collapsed nodes:', Array.from(collapsedNodes));
    
    for (const node of rawNodes) {
      const children = getChildren(node.id);
      const isCollapsed = collapsedNodes.has(node.id);
      const isHidden = isNodeHidden(node);
      
      console.log(`Store: Processing node ${node.id} (${node.data?.label}):`);
      console.log(`  - Has ${children.length} children`);
      console.log(`  - Is collapsed: ${isCollapsed}`);
      console.log(`  - Is hidden: ${isHidden}`);
      
      if (!isHidden) {
        const hasChildren = children.length > 0;
        
        console.log(`  - Adding to processed nodes (hasChildren: ${hasChildren})`);
        
        processedNodes.push({
          ...node,
          data: {
            ...node.data,
            hasChildren,
            collapsed: isCollapsed,
          },
        });
      } else {
        console.log(`  - Skipping hidden node`);
      }
    }
    
    console.log('Store: Final processed nodes count:', processedNodes.length);
    return applyImprovedLayout(processedNodes);
  },

  // 更新可见数据
  updateVisibleData: () => {
    console.log('Store: Updating visible data');
    const { rawNodes, rawEdges } = get();
    
    if (rawNodes.length === 0) {
      console.log('Store: No raw nodes, setting empty visible data');
      set({ visibleNodes: [], visibleEdges: [] });
      return;
    }
    
    const processedNodes = get().processNodesWithLayout(rawNodes);
    const visibleNodeIds = new Set(processedNodes.map(node => node.id));
    
    const visibleEdges = rawEdges.filter(edge => {
      const isVisible = visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target);
      console.log(`Store: Edge ${edge.source} -> ${edge.target}: ${isVisible ? 'VISIBLE' : 'HIDDEN'}`);
      return isVisible;
    });
    
    console.log('Store: Setting visible nodes:', processedNodes.length, 'visible edges:', visibleEdges.length);
    set({
      visibleNodes: processedNodes,
      visibleEdges: visibleEdges,
    });
  },
}));

export type { CustomNode, NodeData };