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
} from '@mui/material';
import {
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  Public as PublicIcon,
  Lock as PrivateIcon,
} from '@mui/icons-material';
import { RootState, AppDispatch } from '../../store/store';
import { fetchMindmaps, deleteMindmap } from '../../store/slices/mindmapSlice';
import { addNotification } from '../../store/slices/uiSlice';

const MindMapList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { mindmaps, isLoading } = useSelector((state: RootState) => state.mindmap);
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMindmapId, setSelectedMindmapId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mindmapToDelete, setMindmapToDelete] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchMindmaps());
  }, [dispatch]);

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
          我的思维导图
        </Typography>
        <Typography variant="body1" color="textSecondary" gutterBottom>
          管理和编辑您的所有思维导图
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
                  onClick={() => navigate('/dashboard')}
                >
                  创建第一个思维导图
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

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
    </Container>
  );
};

export default MindMapList;