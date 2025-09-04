import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Popover,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  UnfoldLess as UnfoldLessIcon,
  UnfoldMore as UnfoldMoreIcon,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CustomNodeData {
  label: string;
  content?: string;
  description?: string;
  level: number;
  collapsed?: boolean;
  hasChildren?: boolean;
  isExpanding?: boolean;
  isEnhancing?: boolean;
  isDisabled?: boolean;
  onEdit?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
  onAddChild?: (nodeId: string) => void;
  onExpand?: (nodeId: string) => void;
  onToggleCollapse?: (nodeId: string) => void;
  onCollapseAllChildren?: (nodeId: string) => void;
  onExpandAllChildren?: (nodeId: string) => void;
  onEnhanceDescription?: (nodeId: string) => void;
}

const CustomNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [descriptionAnchorEl, setDescriptionAnchorEl] = useState<null | HTMLElement>(null);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const open = Boolean(anchorEl);
  const descriptionOpen = Boolean(descriptionAnchorEl);

  const handleContextMenu = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
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

  const handleToggleCollapse = () => {
    data.onToggleCollapse?.(id);
    handleMenuClose();
  };

  const handleCollapseAllChildren = () => {
    data.onCollapseAllChildren?.(id);
    handleMenuClose();
  };

  const handleExpandAllChildren = () => {
    data.onExpandAllChildren?.(id);
    handleMenuClose();
  };

  const handleEnhanceDescription = () => {
    data.onEnhanceDescription?.(id);
    handleMenuClose();
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
        border: selected ? `2px solid ${getNodeColor(data.level)}` : '1px solid #e0e0e0',
        boxShadow: selected ? 3 : 1,
        minWidth: '120px',
        maxWidth: '300px',
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: 2,
          borderColor: getNodeColor(data.level),
        },
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: getNodeColor(data.level),
          width: '8px',
          height: '8px',
          border: 'none',
        }}
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: getNodeColor(data.level),
              fontSize: '14px',
              lineHeight: 1.3,
              wordBreak: 'break-word',
              flex: 1,
            }}
          >
            {data.label}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1 }}>
             <IconButton
               size="small"
               onClick={handleContextMenu}
               disabled={data.isDisabled}
               sx={{
                 width: 20,
                 height: 20,
                 color: 'text.secondary',
                 '&:hover': {
                   backgroundColor: 'rgba(0, 0, 0, 0.04)',
                 },
               }}
             >
               <MoreVertIcon sx={{ fontSize: 16 }} />
             </IconButton>
           </Box>
        </Box>

        {data.content && (
          <Box
            component="pre"
            sx={{
              fontSize: '10px',
              color: '#666',
              wordBreak: 'break-word',
              lineHeight: 1.2,
              display: 'block',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              margin: 0,
              padding: 0,
            }}
          >
            {data.content}
          </Box>
        )}
      </Box>

      {/* 子节点展开/折叠按钮 - 放在节点右边框居中 */}
      {data.hasChildren && (
        <Box
          sx={{
            position: 'absolute',
            right: -10,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1,
          }}
        >
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleCollapse();
            }}
            disabled={data.isDisabled}
            sx={{
              width: 20,
              height: 20,
              backgroundColor: 'white',
              border: '1px solid',
              borderColor: data.collapsed ? 'divider' : getNodeColor(data.level),
              color: data.collapsed ? 'text.secondary' : getNodeColor(data.level),
              '&:hover': {
                backgroundColor: data.collapsed ? 'grey.100' : 'primary.light',
                color: data.collapsed ? 'text.primary' : 'white',
                borderColor: getNodeColor(data.level),
              },
            }}
          >
            {data.collapsed ? (
              <Box
                sx={{
                  width: 0,
                  height: 0,
                  borderTop: '4px solid transparent',
                  borderBottom: '4px solid transparent',
                  borderLeft: '6px solid currentColor',
                }}
              />
            ) : (
              <Box
                sx={{
                  width: 0,
                  height: 0,
                  borderTop: '4px solid transparent',
                  borderBottom: '4px solid transparent',
                  borderRight: '6px solid currentColor',
                }}
              />
            )}
          </IconButton>
        </Box>
      )}

      {/* Description 展开/折叠按钮 - 放在节点下边框居中 */}
       {data.description && (
         <Box
           sx={{
             position: 'absolute',
             bottom: -10,
             left: '50%',
             transform: 'translateX(-50%)',
             zIndex: 1,
           }}
         >
           <IconButton
             size="small"
             onClick={(event) => {
               event.stopPropagation();
               if (descriptionExpanded) {
                 setDescriptionAnchorEl(null);
                 setDescriptionExpanded(false);
               } else {
                 setDescriptionAnchorEl(event.currentTarget as unknown as HTMLElement);
                 setDescriptionExpanded(true);
               }
             }}
             disabled={data.isDisabled}
             sx={{
               width: 20,
               height: 20,
               backgroundColor: 'white',
               border: '1px solid',
               borderColor: descriptionExpanded ? 'primary.main' : 'divider',
               color: descriptionExpanded ? 'primary.main' : 'text.secondary',
               '&:hover': {
                 backgroundColor: 'primary.light',
                 color: 'white',
                 borderColor: 'primary.main',
               },
             }}
           >
             {descriptionExpanded ? (
               <KeyboardArrowUpIcon sx={{ fontSize: 16 }} />
             ) : (
               <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />
             )}
           </IconButton>
         </Box>
       )}

      {/* Description Popover */}
      {data.description && (
        <Popover
           open={descriptionOpen}
           anchorEl={descriptionAnchorEl}
           onClose={() => {
             setDescriptionAnchorEl(null);
             setDescriptionExpanded(false);
           }}
           anchorOrigin={{
             vertical: 'bottom',
             horizontal: 'center',
           }}
           transformOrigin={{
             vertical: 'top',
             horizontal: 'center',
           }}
          slotProps={{
            paper: {
              style: {
                maxWidth: 400,
                maxHeight: 300,
                overflow: 'auto',
                padding: '0 24px',
                boxShadow: '0px 5px 5px -3px rgba(0,0,0,0.2), 0px 8px 10px 1px rgba(0,0,0,0.14), 0px 3px 14px 2px rgba(0,0,0,0.12)',
                border: '1px solid rgba(0, 0, 0, 0.12)',
                borderRadius: '8px',
                zIndex: 9999,
              },
            },
          }}
        >
          <ReactMarkdown
             components={{
               code: ({ className, children, ...props }: any) => {
                 const match = /language-(\w+)/.exec(className || '');
                 const isInline = !match;
                 return !isInline ? (
                   <SyntaxHighlighter
                     style={tomorrow as any}
                     language={match[1]}
                     PreTag="div"
                     {...props}
                   >
                     {String(children).replace(/\n$/, '')}
                   </SyntaxHighlighter>
                 ) : (
                   <code className={className} {...props}>
                     {children}
                   </code>
                 );
               },
             }}
          >
            {data.description}
          </ReactMarkdown>
        </Popover>
      )}

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
        <MenuItem onClick={handleEdit} disabled={data.isDisabled}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          编辑
        </MenuItem>
        <MenuItem onClick={handleAddChild} disabled={data.isDisabled}>
          <AddIcon fontSize="small" sx={{ mr: 1 }} />
          添加子节点
        </MenuItem>
        {data.hasChildren && !data.collapsed && (
          <MenuItem onClick={handleExpand} disabled={data.isDisabled || data.isExpanding}>
            {data.isExpanding ? (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    border: '2px solid #e0e0e0',
                    borderTop: '2px solid #1976d2',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    mr: 1,
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' },
                    },
                  }}
                />
                扩展中...
              </Box>
            ) : (
              <>
                <AddIcon fontSize="small" sx={{ mr: 1 }} />
                AI扩展
              </>
            )}
          </MenuItem>
        )}

        {data.hasChildren && (
          <MenuItem onClick={handleCollapseAllChildren} disabled={data.isDisabled}>
            <UnfoldLessIcon fontSize="small" sx={{ mr: 1 }} />
            折叠全部
          </MenuItem>
        )}
        {data.hasChildren && (
          <MenuItem onClick={handleExpandAllChildren} disabled={data.isDisabled}>
            <UnfoldMoreIcon fontSize="small" sx={{ mr: 1 }} />
            展开全部
          </MenuItem>
        )}
        {data.description && (
          <MenuItem onClick={handleEnhanceDescription} disabled={data.isDisabled || data.isEnhancing}>
            {data.isEnhancing ? (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    border: '2px solid #e0e0e0',
                    borderTop: '2px solid #1976d2',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    mr: 1,
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' },
                    },
                  }}
                />
                增强中...
              </Box>
            ) : (
              <>
                <EditIcon fontSize="small" sx={{ mr: 1 }} />
                AI增强描述
              </>
            )}
          </MenuItem>
        )}
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
          border: 'none',
        }}
      />
    </Box>
  );
};

export default memo(CustomNode, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.data.label === nextProps.data.label &&
    prevProps.data.content === nextProps.data.content &&
    prevProps.data.description === nextProps.data.description &&
    prevProps.data.level === nextProps.data.level &&
    prevProps.data.collapsed === nextProps.data.collapsed &&
    prevProps.data.hasChildren === nextProps.data.hasChildren &&
    prevProps.data.isExpanding === nextProps.data.isExpanding &&
    prevProps.data.isEnhancing === nextProps.data.isEnhancing &&
    prevProps.data.isDisabled === nextProps.data.isDisabled &&
    prevProps.selected === nextProps.selected
  );
});