import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress,
  Fab,
} from '@mui/material';
import {
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  Public as PublicIcon,
  Lock as PrivateIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { RootState, AppDispatch } from '../../store/store';
import { fetchMindmaps, deleteMindmap, generateMindmap, clearCompletedMindmapId } from '../../store/slices/mindmapSlice';
import { addNotification } from '../../store/slices/uiSlice';
import { getStatusColor, getStatusText } from '../../utils/taskUtils';

interface CreateMindMapFormData {
  topic: string;
  description?: string;
}

interface UnifiedItem {
  id: string;
  type: 'task' | 'mindmap';
  title: string;
  description: string;
  created_at: string;
  isGenerating: boolean;
  // 任务特有属性
  status?: string;
  progress?: number;
  task_type?: string;
  // 思维导图特有属性
  is_public?: boolean;
  nodes?: any[];
}

const MindMapList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { mindmaps, isLoading, isGenerating, generatingTasks, completedMindmapId } = useSelector((state: RootState) => state.mindmap);
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMindmapId, setSelectedMindmapId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mindmapToDelete, setMindmapToDelete] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateMindMapFormData>();

  useEffect(() => {
    dispatch(fetchMindmaps());
  }, [dispatch]);

  // 监听任务完成，自动导航到新创建的思维导图
   useEffect(() => {
     if (completedMindmapId) {
       dispatch(addNotification({
         type: 'success',
         message: '思维导图创建成功！',
       }));
       navigate(`/mindmaps/${completedMindmapId}`);
       // 清理完成状态
       dispatch(clearCompletedMindmapId());
     }
   }, [completedMindmapId, dispatch, navigate]);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, mindmapId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedMindmapId(mindmapId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMindmapId(null);
  };

  const handleEdit = () => {
    if (selectedMindmapId) {
      navigate(`/mindmaps/${selectedMindmapId}`);
    }
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    setMindmapToDelete(selectedMindmapId);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (mindmapToDelete) {
      try {
        await dispatch(deleteMindmap(mindmapToDelete)).unwrap();
        dispatch(addNotification({
          type: 'success',
          message: '思维导图删除成功',
        }));
      } catch (error) {
        dispatch(addNotification({
          type: 'error',
          message: '删除失败，请重试',
        }));
      }
    }
    setDeleteDialogOpen(false);
    setMindmapToDelete(null);
  };

  const handleCreateMindMap = async (data: CreateMindMapFormData) => {
    try {
      const result = await dispatch(generateMindmap({
        topic: data.topic,
        description: data.description,
        depth: 3,
        style: 'default',
      })).unwrap();
      
      if (result && (result as any).task_id) {
        dispatch(addNotification({
          type: 'info',
          message: '思维导图生成任务已创建，正在后台处理中...',
        }));
        setCreateDialogOpen(false);
        reset();
      }
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        message: '创建思维导图失败，请重试',
      }));
    }
  };

  // 获取当前正在生成的任务
  const currentGeneratingTasks = Object.values(generatingTasks);
  
  // 使用ref记录之前的任务数量，用于检测任务完成
  const prevTaskCountRef = useRef(currentGeneratingTasks.length);

  // 监听任务数量变化，当任务完成时刷新思维导图列表
  useEffect(() => {
    const currentTaskCount = currentGeneratingTasks.length;
    const prevTaskCount = prevTaskCountRef.current;
    
    // 如果任务数量减少，说明有任务完成了，刷新思维导图列表
    if (prevTaskCount > 0 && currentTaskCount < prevTaskCount) {
      dispatch(fetchMindmaps());
    }
    
    // 更新记录的任务数量
    prevTaskCountRef.current = currentTaskCount;
  }, [currentGeneratingTasks.length, dispatch]);

  const handleShare = () => {
    // TODO: 实现分享功能
    dispatch(addNotification({
      type: 'info',
      message: '分享功能即将推出',
    }));
    handleMenuClose();
  };

  // 创建统一的项目列表，包含正在生成的任务和已完成的思维导图
  const unifiedItems = useMemo((): UnifiedItem[] => {
    const items: UnifiedItem[] = [];
    
    // 添加正在生成的任务
    currentGeneratingTasks.forEach(task => {
      items.push({
        id: `task-${task.id}`,
        type: 'task',
        title: task.title || task.input_data?.topic || '未命名任务',
        description: task.description || task.input_data?.description || '正在使用AI生成思维导图...',
        created_at: task.created_at,
        status: task.status,
        progress: task.progress,
        task_type: task.task_type,
        isGenerating: true
      });
    });
    
    // 添加已完成的思维导图
    mindmaps.forEach(mindmap => {
      items.push({
        id: mindmap.id,
        type: 'mindmap',
        title: mindmap.title,
        description: mindmap.description || '暂无描述',
        created_at: mindmap.created_at,
        is_public: mindmap.is_public,
        nodes: mindmap.nodes,
        isGenerating: false
      });
    });
    
    // 按创建时间排序，最新的在前面
    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [currentGeneratingTasks, mindmaps]);

  const filteredItems = unifiedItems.filter((item: UnifiedItem) =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Container maxWidth="lg">

      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          我的思维导图
        </Typography>
        
        <TextField
          fullWidth
          variant="outlined"
          placeholder="搜索思维导图..."
          value={searchTerm}
          onChange={handleSearch}
          sx={{ mt: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {isLoading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : filteredItems.length > 0 ? (
        <Grid container spacing={3}>
          {filteredItems.map((item: UnifiedItem) => (
            <Grid item xs={12} sm={6} md={4} key={item.id}>
              <Card sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                ...(item.isGenerating && { border: '2px solid', borderColor: 'primary.main' })
              }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Typography variant="h6" component="h3" gutterBottom>
                      {item.title}
                    </Typography>
                    {item.isGenerating ? (
                      <Chip 
                        label={getStatusText(item.status!)} 
                        color={getStatusColor(item.status!) as any}
                        size="small"
                      />
                    ) : (
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, item.id)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    )}
                  </Box>
                  
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    {item.description}
                  </Typography>
                  
                  {item.isGenerating ? (
                     <Box display="flex" alignItems="center" mt={2}>
                       <CircularProgress size={16} sx={{ mr: 1 }} />
                       <Typography variant="caption" color="textSecondary">
                         正在生成中...
                       </Typography>
                     </Box>
                  ) : (
                    <Box display="flex" alignItems="center" gap={1} mt={2}>
                      <Chip
                        icon={item.is_public ? <PublicIcon /> : <PrivateIcon />}
                        label={item.is_public ? '公开' : '私有'}
                        size="small"
                        color={item.is_public ? 'primary' : 'default'}
                      />
                      <Typography variant="caption" color="textSecondary">
                        {item.nodes?.length || 0} 个节点
                      </Typography>
                    </Box>
                  )}
                  
                  <Typography variant="caption" color="textSecondary" display="block" mt={1}>
                    创建于 {new Date(item.created_at).toLocaleDateString()}
                  </Typography>
                </CardContent>
                
                {!item.isGenerating && (
                   <CardActions>
                     <Button
                       size="small"
                       color="primary"
                       onClick={() => navigate(`/mindmaps/${item.id}`)}
                     >
                       打开
                     </Button>
                     <Button
                       size="small"
                       color="secondary"
                       onClick={(e) => handleMenuOpen(e, item.id)}
                     >
                       更多
                     </Button>
                   </CardActions>
                 )}
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Card>
          <CardContent>
            <Typography variant="body1" color="textSecondary" textAlign="center">
              {searchTerm ? '没有找到匹配的思维导图' : '您还没有创建任何思维导图'}
            </Typography>
            {!searchTerm && (
              <Box textAlign="center" mt={2}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  创建第一个思维导图
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* 浮动操作按钮 */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
        onClick={() => setCreateDialogOpen(true)}
      >
        <AddIcon />
      </Fab>

      {/* 操作菜单 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <EditIcon sx={{ mr: 1 }} />
          编辑
        </MenuItem>
        <MenuItem onClick={handleShare}>
          <ShareIcon sx={{ mr: 1 }} />
          分享
        </MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} />
          删除
        </MenuItem>
      </Menu>

      {/* 删除确认对话框 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>
            您确定要删除这个思维导图吗？此操作无法撤销。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>取消</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            删除
          </Button>
        </DialogActions>
      </Dialog>

      {/* 创建思维导图对话框 */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>创建新的思维导图</DialogTitle>
        <form onSubmit={handleSubmit(handleCreateMindMap)}>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="主题"
              fullWidth
              variant="outlined"
              {...register('topic', { required: '请输入主题' })}
              error={!!errors.topic}
              helperText={errors.topic?.message}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="描述（可选）"
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              {...register('description')}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={isGenerating}
            >
              {isGenerating ? '生成中...' : '创建'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
};

export default MindMapList;