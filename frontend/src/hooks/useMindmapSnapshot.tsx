import { useCallback, useRef } from 'react';
import { Node, Edge } from 'reactflow';

// 快照中只保存我们关心的节点数据
interface SnapshotNodeData {
  id: string;
  label: string;
  content: string;
  level: number;
  parent_id: string | null;
  order: number;
}

// 快照中只保存我们关心的边数据
interface SnapshotEdgeData {
  id: string;
  source: string;
  target: string;
}

interface MindmapSnapshot {
  nodes: SnapshotNodeData[];
  edges: SnapshotEdgeData[];
  timestamp: number;
}

interface UseMindmapSnapshotReturn {
  createSnapshot: (nodes: Node[], edges: Edge[]) => void;
  updateSnapshot: (nodes: Node[], edges: Edge[]) => void;
  clearSnapshot: () => void;
  compareWithSnapshot: (nodes: Node[], edges: Edge[]) => boolean;
}

/**
 * 思维导图快照管理Hook
 * 用于跟踪思维导图的变更状态，通过对比快照来判断是否有未保存的更改
 */
export const useMindmapSnapshot = (): UseMindmapSnapshotReturn => {
  const snapshotRef = useRef<MindmapSnapshot | null>(null);

  /**
   * 将Node对象转换为快照数据
   * @param node ReactFlow节点对象
   * @returns 快照节点数据
   */
  const nodeToSnapshotData = (node: Node): SnapshotNodeData => {
    return {
      id: node.id,
      label: node.data.label || '',
      content: node.data.content || '',
      level: node.data.level || 0,
      parent_id: node.data.parent_id || null,
      order: node.data.order || 0,
    };
  };

  /**
   * 将Edge对象转换为快照数据
   * @param edge ReactFlow边对象
   * @returns 快照边数据
   */
  const edgeToSnapshotData = (edge: Edge): SnapshotEdgeData => {
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
    };
  };

  /**
   * 创建快照
   * @param nodes 当前节点数组
   * @param edges 当前边数组
   */
  const createSnapshot = useCallback((nodes: Node[], edges: Edge[]) => {
    snapshotRef.current = {
      nodes: nodes.map(nodeToSnapshotData),
      edges: edges.map(edgeToSnapshotData),
      timestamp: Date.now(),
    };
  }, []);

  /**
   * 更新快照（通常在保存成功后调用）
   * @param nodes 当前节点数组
   * @param edges 当前边数组
   */
  const updateSnapshot = useCallback((nodes: Node[], edges: Edge[]) => {
    createSnapshot(nodes, edges);
  }, [createSnapshot]);

  /**
   * 清除快照
   */
  const clearSnapshot = useCallback(() => {
    snapshotRef.current = null;
  }, []);

  // 移除了复杂的比较函数，直接在compareWithSnapshot中进行简单比较

  /**
   * 构建快照节点映射表
   * @param nodes 快照节点数组
   * @returns 节点ID到快照节点的映射
   */
  const buildSnapshotNodeMap = useCallback((nodes: SnapshotNodeData[]): Map<string, SnapshotNodeData> => {
    const nodeMap = new Map<string, SnapshotNodeData>();
    nodes.forEach(node => {
      nodeMap.set(node.id, node);
    });
    return nodeMap;
  }, []);

  // 移除了复杂的树结构比较函数，简化快照逻辑

  /**
   * 比较两个快照节点数据是否相等
   * @param current 当前快照节点数据
   * @param snapshot 快照中的节点数据
   * @returns 是否相等
   */
  const compareSnapshotNodes = (current: SnapshotNodeData, snapshot: SnapshotNodeData): boolean => {
    return current.id === snapshot.id &&
           current.label === snapshot.label &&
           current.content === snapshot.content &&
           current.level === snapshot.level &&
           current.parent_id === snapshot.parent_id &&
           current.order === snapshot.order;
  };

  /**
   * 比较两个快照边数据是否相等
   * @param current 当前快照边数据
   * @param snapshot 快照中的边数据
   * @returns 是否相等
   */
  const compareSnapshotEdges = (current: SnapshotEdgeData, snapshot: SnapshotEdgeData): boolean => {
    return current.id === snapshot.id &&
           current.source === snapshot.source &&
           current.target === snapshot.target;
  };

  /**
   * 对比当前状态与快照，判断是否有变更
   * 使用自定义快照对象进行比较，确保数据解耦
   * @param currentNodes 当前节点数组
   * @param currentEdges 当前边数组
   * @returns 是否有变更
   */
  const compareWithSnapshot = useCallback((currentNodes: Node[], currentEdges: Edge[]): boolean => {
    if (!snapshotRef.current) {
      return true; // 没有快照时认为有变更，需要保存
    }

    const { nodes: snapshotNodes, edges: snapshotEdges } = snapshotRef.current;

    // 1. 将当前数据转换为快照格式
    const currentSnapshotNodes = currentNodes.map(nodeToSnapshotData);
    const currentSnapshotEdges = currentEdges.map(edgeToSnapshotData);

    // 2. 快速检查：比较节点和边的数量
    if (currentSnapshotNodes.length !== snapshotNodes.length || 
        currentSnapshotEdges.length !== snapshotEdges.length) {
      return true;
    }

    // 3. 构建快照节点映射表进行高效查找
    const snapshotNodeMap = buildSnapshotNodeMap(snapshotNodes);

    // 4. 比较节点内容
    for (const currentSnapshotNode of currentSnapshotNodes) {
      const snapshotNode = snapshotNodeMap.get(currentSnapshotNode.id);
      
      if (!snapshotNode) {
        return true; // 节点不存在（新增或删除）
      }
      
      if (!compareSnapshotNodes(currentSnapshotNode, snapshotNode)) {
        return true; // 节点内容变更
      }
    }

    // 5. 构建边映射表并比较
    const snapshotEdgeMap = new Map<string, SnapshotEdgeData>();
    snapshotEdges.forEach(edge => {
      snapshotEdgeMap.set(edge.id, edge);
    });

    for (const currentSnapshotEdge of currentSnapshotEdges) {
      const snapshotEdge = snapshotEdgeMap.get(currentSnapshotEdge.id);
      
      if (!snapshotEdge) {
        return true; // 边不存在（新增或删除）
      }
      
      if (!compareSnapshotEdges(currentSnapshotEdge, snapshotEdge)) {
        return true; // 边内容变更
      }
    }

    return false; // 没有变更
  }, [buildSnapshotNodeMap]);

  return {
    createSnapshot,
    updateSnapshot,
    clearSnapshot,
    compareWithSnapshot,
  };
};