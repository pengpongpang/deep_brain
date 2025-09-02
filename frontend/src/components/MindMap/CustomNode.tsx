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
  ChevronRight as ChevronRightIcon,
  ChevronLeft as ChevronLeftIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  Autorenew as AutorenewIcon,
  Description as DescriptionIcon,
  UnfoldLess as UnfoldLessIcon,
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
  onEnhanceDescription?: (nodeId: string) => void;
}

const CustomNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
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

  const handleEnhanceDescription = () => {
    if (data.isDisabled) return;
    data.onEnhanceDescription?.(id);
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

  const handleCollapseAllChildren = () => {
    if (data.isDisabled) return;
    data.onCollapseAllChildren?.(id);
    handleMenuClose();
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
        width: 'fit-content',
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
            <ReactMarkdown
              components={{
                code({ className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  const isInline = !match;
                  return !isInline ? (
                    <SyntaxHighlighter
                      style={tomorrow as any}
                      language={match[1]}
                      PreTag="div"
                      customStyle={{
                        fontSize: '10px',
                        margin: '2px 0',
                        padding: '2px',
                        borderRadius: '3px',
                        backgroundColor: '#2d3748',
                      } as any}
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
              {data.label}
            </ReactMarkdown>
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
                backgroundColor: 'transparent',
              }}
            >
              {data.content}
            </Box>
          )}
          
          {/* Description 字段显示 */}
          {data.description && (
            <Box sx={{ mt: 0.5 }}>
              <Box
                onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  cursor: 'pointer',
                  py: 0.25,
                  '&:hover': {
                    backgroundColor: 'rgba(0,0,0,0.05)',
                    borderRadius: '4px',
                  },
                }}
              >
                {descriptionExpanded ? 
                  <KeyboardArrowUpIcon sx={{ fontSize: 14, color: '#666' }} /> : 
                  <KeyboardArrowDownIcon sx={{ fontSize: 14, color: '#666' }} />
                }
              </Box>
              {descriptionExpanded && (
                <Box
                  sx={{
                    fontSize: '9px',
                    color: '#555',
                    wordBreak: 'break-word',
                    lineHeight: 1.3,
                    mt: 0.5,
                    borderLeft: '2px solid #e0e0e0',
                    backgroundColor: 'rgba(0,0,0,0.02)',
                    padding: '4px 6px',
                    borderRadius: '4px',
                    maxWidth: '100%',
                    width: '100%',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    overflowWrap: 'break-word',
                    hyphens: 'auto',
                    '& p': {
                      margin: 0,
                      fontSize: 'inherit',
                      color: 'inherit',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                    },
                    '& strong': {
                      fontWeight: 'bold',
                    },
                    '& em': {
                      fontStyle: 'italic',
                    },
                    '& code': {
                      backgroundColor: 'rgba(0,0,0,0.1)',
                      padding: '1px 2px',
                      borderRadius: '2px',
                      fontSize: '0.9em',
                      wordBreak: 'break-all',
                    },
                  }}
                >
                  <ReactMarkdown
                    components={{
                      code({ className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        const isInline = !match;
                        return !isInline ? (
                          <SyntaxHighlighter
                            style={tomorrow as any}
                            language={match[1]}
                            PreTag="div"
                            customStyle={{
                              fontSize: '8px',
                              margin: '4px 0',
                              padding: '4px',
                              borderRadius: '3px',
                              backgroundColor: '#2d3748',
                            } as any}
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
                </Box>
              )}
            </Box>
          )}
          
          {/* AI补充描述进行中的视觉反馈 */}
          {data.isEnhancing && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                mt: 0.5,
                fontSize: '9px',
                color: '#1976d2',
                animation: 'pulse 1.5s ease-in-out infinite',
                '@keyframes pulse': {
                  '0%': {
                    opacity: 1,
                  },
                  '50%': {
                    opacity: 0.5,
                  },
                  '100%': {
                    opacity: 1,
                  },
                },
              }}
            >
              <AutorenewIcon 
                sx={{ 
                  fontSize: '10px', 
                  mr: 0.5, 
                  animation: 'spin 2s linear infinite',
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
                  fontSize: '9px',
                  color: 'inherit',
                }}
              >
                AI正在补充描述...
              </Typography>
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
              <ChevronLeftIcon fontSize="small" />
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
        <MenuItem onClick={handleEnhanceDescription} disabled={data.isDisabled || data.isEnhancing}>
          <DescriptionIcon fontSize="small" sx={{ mr: 1 }} />
          {data.isEnhancing ? 'AI补充中...' : 'AI补充描述'}
        </MenuItem>
        {data.hasChildren && (
          <MenuItem onClick={handleCollapseAllChildren} disabled={data.isDisabled}>
            <UnfoldLessIcon fontSize="small" sx={{ mr: 1 }} />
            折叠全部
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
    prevData.description === nextData.description &&
    prevData.hasChildren === nextData.hasChildren &&
    prevData.collapsed === nextData.collapsed &&
    prevData.level === nextData.level &&
    prevData.isExpanding === nextData.isExpanding &&
    prevData.isEnhancing === nextData.isEnhancing &&
    prevData.isDisabled === nextData.isDisabled
    // 不比较函数引用 (onEdit, onDelete, etc.) 因为它们不影响视觉渲染
  );
});