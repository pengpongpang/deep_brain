import React, { useEffect, useState } from 'react';
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
  AccountTree as MindMapIcon,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { RootState, AppDispatch } from '../../store/store';
import { fetchMindmaps, deleteMindmap, generateMindmap, clearCompletedMindmapId } from '../../store/slices/mindmapSlice';
import { addNotification } from '../../store/slices/uiSlice';

interface CreateMindMapFormData {
  topic: string;
  description?: string;
}

const MindMapList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { mindmaps, isLoading, isGenerating, generatingTasks, completedMindmapId } = useSelector((state: RootState) => state.mindmap);
  const { user } = useSelector((state: RootState) => state.auth);
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
  const hasGeneratingTasks = currentGeneratingTasks.length > 0;

  const handleShare = () => {
    // TODO: 实现分享功能
    dispatch(addNotification({
      type: 'info',
      message: '分享功能即将推出',
    }));
    handleMenuClose();
  };

  const filteredMindmaps = mindmaps.filter(mindmap =>
    mindmap.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (mindmap.description && mindmap.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          欢迎回来，{user?.username}！
        </Typography>
        <Typography variant="body1" color="textSecondary" gutterBottom>
          开始创建您的思维导图，整理和可视化您的想法。
        </Typography>
      </Box>

      {/* 统计卡片 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <MindMapIcon color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    思维导图总数
                  </Typography>
                  <Typography variant="h5">
                    {mindmaps.length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <MindMapIcon color="secondary" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    本周创建
                  </Typography>
                  <Typography variant="h5">
                    {mindmaps.filter(m => {
                      const weekAgo = new Date();
                      weekAgo.setDate(weekAgo.getDate() - 7);
                      return new Date(m.created_at) > weekAgo;
                    }).length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 快速操作 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          快速操作
        </Typography>
        <Grid container spacing={2}>
          <Grid item>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
              disabled={isGenerating}
            >
              {isGenerating ? '生成中...' : '创建思维导图'}
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* 正在生成的任务 */}
      {hasGeneratingTasks && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            正在生成中
          </Typography>
          <Grid container spacing={2}>
            {currentGeneratingTasks.map((task) => (
              <Grid item xs={12} sm={6} md={4} key={task.id}>
                <Card sx={{ border: '2px solid', borderColor: 'primary.main' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <CircularProgress size={24} sx={{ mr: 2 }} />
                      <Typography variant="h6">
                        {task.input_data?.topic || '生成中...'}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      {task.input_data?.description || '正在使用AI生成思维导图...'}
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="textSecondary">
                        进度: {Math.round(task.progress || 0)}%
                      </Typography>
                      <Box sx={{ width: '100%', mt: 1 }}>
                        <div style={{
                          width: '100%',
                          height: '4px',
                          backgroundColor: '#e0e0e0',
                          borderRadius: '2px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${task.progress || 0}%`,
                            height: '100%',
                            backgroundColor: '#1976d2',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                      </Box>
                    </Box>
                    <Typography variant="caption" color="textSecondary" display="block" mt={1}>
                      状态: {task.status === 'pending' ? '等待中' : task.status === 'running' ? '生成中' : task.status}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

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
      ) : filteredMindmaps.length > 0 ? (
        <Grid container spacing={3}>
          {filteredMindmaps.map((mindmap) => (
            <Grid item xs={12} sm={6} md={4} key={mindmap.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Typography variant="h6" component="h3" gutterBottom>
                      {mindmap.title}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, mindmap.id)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                  
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    {mindmap.description || '暂无描述'}
                  </Typography>
                  
                  <Box display="flex" alignItems="center" gap={1} mt={2}>
                    <Chip
                      icon={mindmap.is_public ? <PublicIcon /> : <PrivateIcon />}
                      label={mindmap.is_public ? '公开' : '私有'}
                      size="small"
                      color={mindmap.is_public ? 'primary' : 'default'}
                    />
                    <Typography variant="caption" color="textSecondary">
                      {mindmap.nodes.length} 个节点
                    </Typography>
                  </Box>
                  
                  <Typography variant="caption" color="textSecondary" display="block" mt={1}>
                    创建于 {new Date(mindmap.created_at).toLocaleDateString()}
                  </Typography>
                </CardContent>
                
                <CardActions>
                  <Button
                    size="small"
                    color="primary"
                    onClick={() => navigate(`/mindmaps/${mindmap.id}`)}
                  >
                    打开
                  </Button>
                  <Button
                    size="small"
                    color="secondary"
                    onClick={(e) => handleMenuOpen(e, mindmap.id)}
                  >
                    更多
                  </Button>
                </CardActions>
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