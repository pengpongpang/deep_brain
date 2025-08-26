import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Psychology as PsychologyIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';

interface CustomNodeData {
  label: string;
  content?: string;
  level: number;
  collapsed?: boolean;
  hasChildren?: boolean;
  onEdit?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
  onAddChild?: (nodeId: string) => void;
  onExpand?: (nodeId: string) => void;
  onToggleCollapse?: (nodeId: string) => void;
}

const CustomNode: React.FC<NodeProps<CustomNodeData>> = ({ id, data, selected }) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    data.onEdit?.(id);
    handleMenuClose();
  };

  const handleDelete = () => {
    data.onDelete?.(id);
    handleMenuClose();
  };

  const handleAddChild = () => {
    data.onAddChild?.(id);
    handleMenuClose();
  };

  const handleExpand = () => {
    data.onExpand?.(id);
    handleMenuClose();
  };

  const handleToggleCollapse = (event: React.MouseEvent) => {
    event.stopPropagation();
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
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: getNodeColor(data.level),
          width: '8px',
          height: '8px',
        }}
      />
      
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        {data.hasChildren && (
          <IconButton
            size="small"
            onClick={handleToggleCollapse}
            sx={{
              width: '16px',
              height: '16px',
              padding: 0,
              minWidth: 'auto',
            }}
          >
            {data.collapsed ? (
              <ChevronRightIcon fontSize="small" />
            ) : (
              <ExpandMoreIcon fontSize="small" />
            )}
          </IconButton>
        )}
        
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: data.level === 0 ? 'bold' : 'normal',
              fontSize: data.level === 0 ? '14px' : '12px',
              color: '#333',
              wordBreak: 'break-word',
              lineHeight: 1.3,
              mb: data.content ? 0.5 : 0,
            }}
          >
            {data.label}
          </Typography>
          
          {data.content && (
            <Typography
              variant="caption"
              sx={{
                fontSize: '10px',
                color: '#666',
                wordBreak: 'break-word',
                lineHeight: 1.2,
                display: 'block',
              }}
            >
              {data.content}
            </Typography>
          )}
        </Box>
      </Box>

      <IconButton
        size="small"
        onClick={handleMenuClick}
        sx={{
          position: 'absolute',
          top: '4px',
          right: '4px',
          width: '20px',
          height: '20px',
          opacity: 0.7,
          '&:hover': {
            opacity: 1,
          },
        }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleEdit}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          编辑
        </MenuItem>
        <MenuItem onClick={handleAddChild}>
          <AddIcon fontSize="small" sx={{ mr: 1 }} />
          添加子节点
        </MenuItem>
        <MenuItem onClick={handleExpand}>
          <PsychologyIcon fontSize="small" sx={{ mr: 1 }} />
          AI扩展
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          删除
        </MenuItem>
      </Menu>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: getNodeColor(data.level),
          width: '8px',
          height: '8px',
        }}
      />
    </Box>
  );
};

export default memo(CustomNode);