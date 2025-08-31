import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Card,
  CardContent,

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
  AccountTree as NodesIcon,
  Schedule as DateIcon,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { RootState, AppDispatch } from '../../store/store';
import { fetchMindmaps, deleteMindmap, createMindmap, clearCompletedMindmapId } from '../../store/slices/mindmapSlice';
import { addNotification } from '../../store/slices/uiSlice';


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
  // 思维导图特有属性
  is_public?: boolean;
  nodes?: any[];
}

const MindMapList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { mindmaps, isLoading, completedMindmapId } = useSelector((state: RootState) => state.mindmap);
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
      // 创建只有根节点的思维导图
      const rootNode = {
        id: 'root',
        type: 'custom',
        position: { x: 400, y: 200 },
        data: {
          label: data.topic,
          level: 0,
          isRoot: true,
          description: data.description || ''
        },
        style: {
          background: '#ff6b6b',
          color: 'white',
          border: '2px solid #ff5252',
          borderRadius: '10px',
          fontSize: '16px',
          fontWeight: 'bold'
        }
      };

      const result = await dispatch(createMindmap({
        title: data.topic,
        description: data.description,
        nodes: [rootNode],
        edges: [],
        layout: 'hierarchical',
        theme: 'default',
        is_public: false
      })).unwrap();
      
      if (result) {
        dispatch(addNotification({
          type: 'success',
          message: '思维导图创建成功！',
        }));
        setCreateDialogOpen(false);
        reset();
        // 刷新思维导图列表
        dispatch(fetchMindmaps());
      }
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        message: '创建思维导图失败，请重试',
      }));
    }
  };



  const handleShare = () => {
    // TODO: 实现分享功能
    dispatch(addNotification({
      type: 'info',
      message: '分享功能即将推出',
    }));
    handleMenuClose();
  };

  // 创建思维导图列表
  const unifiedItems = useMemo((): UnifiedItem[] => {
    const items: UnifiedItem[] = [];
    
    // 添加思维导图
    mindmaps.forEach(mindmap => {
      items.push({
        id: mindmap.id,
        type: 'mindmap',
        title: mindmap.title,
        description: mindmap.description || '暂无描述',
        created_at: mindmap.created_at,
        is_public: mindmap.is_public,
        nodes: mindmap.nodes
      });
    });
    
    // 按创建时间排序，最新的在前面
    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [mindmaps]);

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
              <Card 
                onClick={() => navigate(`/mindmaps/${item.id}`)}
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  borderRadius: 3,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  transition: 'all 0.3s ease-in-out',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                  }
                }}>
                <CardContent sx={{ flexGrow: 1, p: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Typography 
                      variant="h6" 
                      component="h3" 
                      sx={{
                        fontWeight: 600,
                        color: 'text.primary',
                        lineHeight: 1.3,
                        mb: 0
                      }}
                    >
                      {item.title}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMenuOpen(e, item.id);
                      }}
                      sx={{
                        color: 'text.secondary',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                          color: 'primary.main'
                        }
                      }}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                  
                  <Box>
                       <Box display="flex" alignItems="center" justifyContent="space-between">
                         <Box display="flex" alignItems="center" gap={1.5}>
                           {/* 公开/私有状态图标 */}
                           {item.is_public ? (
                             <Chip
                               icon={<PublicIcon />}
                               label="公开"
                               size="small"
                               sx={{
                                 backgroundColor: 'rgba(33, 150, 243, 0.1)',
                                 color: 'primary.main',
                                 border: '1px solid rgba(33, 150, 243, 0.2)',
                                 fontWeight: 500
                               }}
                             />
                           ) : (
                             <Box 
                               sx={{
                                 display: 'flex',
                                 alignItems: 'center',
                                 justifyContent: 'center',
                                 width: 32,
                                 height: 32,
                                 borderRadius: '50%',
                                 backgroundColor: 'rgba(158, 158, 158, 0.1)',
                                 border: '1px solid rgba(158, 158, 158, 0.2)'
                               }}
                             >
                               <PrivateIcon 
                                 sx={{ 
                                   fontSize: 16, 
                                   color: 'text.secondary' 
                                 }} 
                               />
                             </Box>
                           )}
                           
                           {/* 节点数量 */}
                           <Box 
                             sx={{
                               display: 'flex',
                               alignItems: 'center',
                               gap: 0.5,
                               backgroundColor: 'rgba(76, 175, 80, 0.1)',
                               px: 1,
                               py: 0.5,
                               borderRadius: 1,
                               border: '1px solid rgba(76, 175, 80, 0.2)'
                             }}
                           >
                             <NodesIcon 
                               sx={{ 
                                 fontSize: 14, 
                                 color: 'success.main' 
                               }} 
                             />
                             <Typography 
                               variant="caption" 
                               sx={{
                                 color: 'success.main',
                                 fontWeight: 500
                               }}
                             >
                               {item.nodes?.length || 0}
                             </Typography>
                           </Box>
                         </Box>
                         
                         {/* 创建时间 */}
                         <Box 
                           sx={{
                             display: 'flex',
                             alignItems: 'center',
                             gap: 0.5
                           }}
                         >
                           <DateIcon 
                             sx={{ 
                               fontSize: 14, 
                               color: 'text.secondary' 
                             }} 
                           />
                           <Typography 
                             variant="caption" 
                             color="text.secondary" 
                             sx={{
                               fontWeight: 400
                             }}
                           >
                             {new Date(item.created_at).toLocaleDateString('zh-CN', {
                               month: 'short',
                               day: 'numeric'
                             })}
                           </Typography>
                         </Box>
                       </Box>
                     </Box>
                </CardContent>
                

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
            >
              创建
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
};

export default MindMapList;