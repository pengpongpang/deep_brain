import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  InputAdornment,
  Button,
  Typography,
  Paper,
  Card,
  CardContent,
} from '@mui/material';
import {
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  FileDownload as ExportIcon,
  List as ListIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Public as PublicIcon,
  Lock as PrivateIcon,
  AccountTree as NodesIcon,
  Schedule as DateIcon,
} from '@mui/icons-material';
import { RootState, AppDispatch } from '../../store/store';
import { setTheme } from '../../store/slices/uiSlice';
import { logout } from '../../store/slices/authSlice';
import { addNotification } from '../../store/slices/uiSlice';
import TaskNotificationMenu from '../Notifications/TaskNotificationMenu';
import { mindmapAPI } from '../../services/api';

interface FloatingSidebarProps {
  onSave?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  onExport?: () => void;
  isEditorPage?: boolean;
}

const FloatingSidebar: React.FC<FloatingSidebarProps> = ({
  onSave,
  onDelete,
  onShare,
  onExport,
  isEditorPage = false,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { theme } = useSelector((state: RootState) => state.ui);
  const { user } = useSelector((state: RootState) => state.auth);
  const { mindmaps, isLoading } = useSelector((state: RootState) => state.mindmap);
  
  // 状态管理
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState<null | HTMLElement>(null);
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMindmapId, setSelectedMindmapId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mindmapToDelete, setMindmapToDelete] = useState<string | null>(null);

  // 处理主题切换
  const handleThemeToggle = () => {
    dispatch(setTheme(theme === 'light' ? 'dark' : 'light'));
  };

  // 处理用户菜单
  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
    handleProfileMenuClose();
  };

  const handleProfileClick = () => {
    navigate('/profile');
    handleProfileMenuClose();
  };

  // 处理通知菜单
  const handleNotificationMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchorEl(event.currentTarget);
  };

  const handleNotificationMenuClose = () => {
    setNotificationAnchorEl(null);
  };

  // 本地状态存储思维导图列表数据
  const [localMindmaps, setLocalMindmaps] = useState<any[]>([]);
  const [isLocalLoading, setIsLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  
  // 处理思维导图列表
  const handleListOpen = async () => {
    console.log('打开思维导图列表弹窗');
    // 先设置弹窗状态为打开
    setListDialogOpen(true);
    
    try {
      // 直接使用API获取数据，不通过Redux
      setIsLocalLoading(true);
      setLocalError(null);
      const response = await mindmapAPI.getMindmaps();
      console.log('直接获取思维导图列表数据成功:', response.data);
      setLocalMindmaps(response.data);
    } catch (error) {
      console.error('获取思维导图列表失败:', error);
      setLocalError('获取思维导图列表失败，请稍后重试');
    } finally {
      setIsLocalLoading(false);
    }
  };

  const handleListClose = () => {
    setListDialogOpen(false);
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  // 处理思维导图操作菜单
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, mindmapId: string) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setSelectedMindmapId(mindmapId);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedMindmapId(null);
  };

  const handleEdit = () => {
    if (selectedMindmapId) {
      navigate(`/mindmap/${selectedMindmapId}`);
      setListDialogOpen(false);
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
        // 直接使用API删除思维导图
        await mindmapAPI.deleteMindmap(mindmapToDelete);
        // 更新本地数据
        setLocalMindmaps(prevMindmaps => prevMindmaps.filter(m => m.id !== mindmapToDelete));
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

  // 过滤思维导图列表，使用本地数据而非Redux数据
  const filteredMindmaps = localMindmaps.filter(mindmap =>
    mindmap.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (mindmap.description && mindmap.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <>
      {/* 左侧悬浮侧边栏 */}
      <Box
        sx={{
          position: 'fixed',
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 1100,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: theme === 'dark' ? 'rgba(30, 30, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)',
          borderRadius: '0 12px 12px 0',
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.15)',
          backdropFilter: 'blur(8px)',
          padding: '12px 8px',
        }}
      >
        {/* 编辑器页面特有按钮 */}
        {isEditorPage && (
          <>
            <IconButton onClick={onSave} color="primary" size="large" title="保存">
              <SaveIcon />
            </IconButton>
            <IconButton onClick={onDelete} color="error" size="large" title="删除">
              <DeleteIcon />
            </IconButton>
            <Divider sx={{ my: 1 }} />
          </>
        )}

        {/* 思维导图列表按钮 */}
        <IconButton onClick={handleListOpen} color="primary" size="large" title="思维导图列表">
          <ListIcon />
        </IconButton>

        {/* 通用按钮 */}
        <IconButton onClick={handleThemeToggle} color="primary" size="large" title="切换主题">
          {theme === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
        </IconButton>
        <IconButton onClick={handleNotificationMenuOpen} color="primary" size="large" title="通知">
          <NotificationsIcon />
        </IconButton>
        <IconButton onClick={handleProfileMenuOpen} color="primary" size="large" title="用户">
          <Avatar sx={{ width: 32, height: 32 }}>
            {user?.username?.charAt(0).toUpperCase()}
          </Avatar>
        </IconButton>
      </Box>

      {/* 用户菜单 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        onClick={handleProfileMenuClose}
      >
        <MenuItem onClick={handleProfileClick}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          个人资料
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          退出登录
        </MenuItem>
      </Menu>

      {/* 通知菜单 */}
      <TaskNotificationMenu
        anchorEl={notificationAnchorEl}
        open={Boolean(notificationAnchorEl)}
        onClose={handleNotificationMenuClose}
      />

      {/* 思维导图列表弹窗 */}
      <Dialog
        open={listDialogOpen}
        onClose={handleListClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          思维导图列表
          <IconButton
            aria-label="close"
            onClick={handleListClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            &times;
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              placeholder="搜索思维导图..."
              variant="outlined"
              value={searchTerm}
              onChange={handleSearch}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {isLocalLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <Typography>加载中...</Typography>
            </Box>
          ) : localError ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <Typography color="error">{localError}</Typography>
            </Box>
          ) : filteredMindmaps.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <Typography>没有找到思维导图</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
              {filteredMindmaps.map((mindmap) => (
                <Card 
                  key={mindmap.id} 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { boxShadow: 6 }
                  }}
                  onClick={() => {
                    navigate(`/mindmap/${mindmap.id}`);
                    setListDialogOpen(false);
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Typography variant="h6" noWrap sx={{ maxWidth: '80%' }}>
                        {mindmap.title}
                      </Typography>
                      <IconButton 
                        size="small" 
                        onClick={(e) => handleMenuOpen(e, mindmap.id)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Box>
                    
                    {mindmap.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ 
                        mt: 1, 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}>
                        {mindmap.description}
                      </Typography>
                    )}
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <NodesIcon fontSize="small" color="action" />
                        <Typography variant="caption" sx={{ ml: 0.5 }}>
                          {mindmap.nodes?.length || 1} 节点
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                        <DateIcon fontSize="small" color="action" />
                        <Typography variant="caption" sx={{ ml: 0.5 }}>
                          {new Date(mindmap.created_at).toLocaleDateString()}
                        </Typography>
                      </Box>
                      
                      {mindmap.is_public !== undefined && (
                        <Box sx={{ ml: 'auto' }}>
                          {mindmap.is_public ? (
                            <PublicIcon fontSize="small" color="primary" />
                          ) : (
                            <PrivateIcon fontSize="small" color="action" />
                          )}
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* 思维导图操作菜单 */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          编辑
        </MenuItem>
        <MenuItem onClick={handleDeleteClick}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          删除
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <ShareIcon fontSize="small" />
          </ListItemIcon>
          分享
        </MenuItem>
      </Menu>

      {/* 删除确认对话框 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>确定要删除这个思维导图吗？此操作不可撤销。</Typography>
        </DialogContent>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ mr: 1 }}>
            取消
          </Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error">
            删除
          </Button>
        </Box>
      </Dialog>
    </>
  );
};

export default FloatingSidebar;