import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Psychology as PsychologyIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  Autorenew as AutorenewIcon,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';

interface CustomNodeData {
  label: string;
  content?: string;
  level: number;
  collapsed?: boolean;
  hasChildren?: boolean;
  isExpanding?: boolean;
  isDisabled?: boolean;
  onEdit?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
  onAddChild?: (nodeId: string) => void;
  onExpand?: (nodeId: string) => void;
  onToggleCollapse?: (nodeId: string) => void;
}

const CustomNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleContextMenu = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    // 不阻止事件传播，让ReactFlow处理选择
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    if (data.isDisabled) return;
    data.onEdit?.(id);
    handleMenuClose();
  };

  const handleAddChild = () => {
    if (data.isDisabled) return;
    data.onAddChild?.(id);
    handleMenuClose();
  };

  const handleExpand = () => {
    if (data.isDisabled) return;
    data.onExpand?.(id);
    handleMenuClose();
  };

  const handleDelete = () => {
    if (data.isDisabled) return;
    data.onDelete?.(id);
    handleMenuClose();
  };

  const handleToggleCollapse = () => {
    if (data.isDisabled) return;
    data.onToggleCollapse?.(id);
  };

  const handleToggleCollapseClick = (event: React.MouseEvent) => {
    // 只阻止这个特定按钮的事件传播，避免触发节点选择
    event.stopPropagation();
    if (data.isDisabled) return;
    data.onToggleCollapse?.(id);
  };

  const getNodeColor = (level: number) => {
    const colors = [
      '#1976d2', // 蓝色 - 根节点
      '#388e3c', // 绿色 - 一级节点
      '#f57c00', // 橙色 - 二级节点
      '#7b1fa2', // 紫色 - 三级节点
      '#c2185b', // 粉色 - 四级节点
    ];
    return colors[Math.min(level, colors.length - 1)];
  };

  return (
    <Box
      onContextMenu={handleContextMenu}
      sx={{
        padding: '12px 16px',
        borderRadius: '8px',
        backgroundColor: 'white',
        border: `2px solid ${selected ? '#1976d2' : getNodeColor(data.level)}`,
        boxShadow: selected ? '0 4px 12px rgba(25, 118, 210, 0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
        minWidth: '120px',
        maxWidth: '200px',
        position: 'relative',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        },
      }}
    >
      {data.level > 0 && (
        <Handle
          type="target"
          position={Position.Left}
          style={{
            background: getNodeColor(data.level),
            width: '8px',
            height: '8px',
          }}
        />
      )}
      
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ flex: 1 }}>
          <Box
            sx={{
              fontWeight: data.level === 0 ? 'bold' : 'normal',
              fontSize: data.level === 0 ? '14px' : '12px',
              color: '#333',
              wordBreak: 'break-word',
              lineHeight: 1.3,
              mb: data.content ? 0.5 : 0,
              '& p': {
                margin: 0,
                fontSize: 'inherit',
                fontWeight: 'inherit',
                color: 'inherit',
              },
              '& strong': {
                fontWeight: 'bold',
              },
              '& em': {
                fontStyle: 'italic',
              },
              '& code': {
                backgroundColor: 'rgba(0,0,0,0.1)',
                padding: '2px 4px',
                borderRadius: '3px',
                fontSize: '0.9em',
              },
            }}
          >
            <ReactMarkdown>{data.label}</ReactMarkdown>
          </Box>
          
          {data.content && (
            <Box
              sx={{
                fontSize: '10px',
                color: '#666',
                wordBreak: 'break-word',
                lineHeight: 1.2,
                display: 'block',
                '& p': {
                  margin: 0,
                  fontSize: 'inherit',
                  color: 'inherit',
                },
                '& strong': {
                  fontWeight: 'bold',
                },
                '& em': {
                  fontStyle: 'italic',
                },
                '& code': {
                  backgroundColor: 'rgba(0,0,0,0.1)',
                  padding: '1px 3px',
                  borderRadius: '2px',
                  fontSize: '0.9em',
                },
              }}
            >
              <ReactMarkdown>{data.content}</ReactMarkdown>
            </Box>
          )}
        </Box>
        
        {/* 扩展状态显示 */}
        {data.isExpanding && (
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
            <AutorenewIcon 
              fontSize="small" 
              sx={{ 
                animation: 'spin 1s linear infinite',
                color: '#1976d2',
                '@keyframes spin': {
                  '0%': {
                    transform: 'rotate(0deg)',
                  },
                  '100%': {
                    transform: 'rotate(360deg)',
                  },
                },
              }} 
            />
            <Typography 
              variant="caption" 
              sx={{ 
                fontSize: '10px', 
                color: '#1976d2', 
                ml: 0.5 
              }}
            >
              扩展中
            </Typography>
          </Box>
        )}
        
        {data.hasChildren && (
          <IconButton
            size="small"
            onClick={handleToggleCollapseClick}
            disabled={data.isDisabled}
            sx={{
              width: '20px',
              height: '20px',
              padding: 0,
              minWidth: 'auto',
              ml: 1,
              opacity: data.isDisabled ? 0.5 : 1,
            }}
          >
            {data.collapsed ? (
              <ChevronRightIcon fontSize="small" />
            ) : (
              <ExpandMoreIcon fontSize="small" />
            )}
          </IconButton>
        )}
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={open && !data.isDisabled}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <MenuItem onClick={handleEdit} disabled={data.isDisabled}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          编辑
        </MenuItem>
        <MenuItem onClick={handleAddChild} disabled={data.isDisabled}>
          <AddIcon fontSize="small" sx={{ mr: 1 }} />
          添加子节点
        </MenuItem>
        <MenuItem onClick={handleExpand} disabled={data.isDisabled || data.isExpanding}>
          <PsychologyIcon fontSize="small" sx={{ mr: 1 }} />
          {data.isExpanding ? 'AI扩展中...' : 'AI扩展'}
        </MenuItem>
        <MenuItem onClick={handleDelete} disabled={data.isDisabled} sx={{ color: data.isDisabled ? 'text.disabled' : 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          删除
        </MenuItem>
      </Menu>

      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: getNodeColor(data.level),
          width: '8px',
          height: '8px',
        }}
      />
    </Box>
  );
};

export default memo(CustomNode, (prevProps, nextProps) => {
  // 自定义比较函数，只比较影响渲染的数据属性，忽略函数引用
  const prevData = prevProps.data;
  const nextData = nextProps.data;
  
  return (
    prevProps.id === nextProps.id &&
    prevProps.selected === nextProps.selected &&
    prevData.label === nextData.label &&
    prevData.content === nextData.content &&
    prevData.hasChildren === nextData.hasChildren &&
    prevData.collapsed === nextData.collapsed &&
    prevData.level === nextData.level &&
    prevData.isExpanding === nextData.isExpanding &&
    prevData.isDisabled === nextData.isDisabled
    // 不比较函数引用 (onEdit, onDelete, etc.) 因为它们不影响视觉渲染
  );
});