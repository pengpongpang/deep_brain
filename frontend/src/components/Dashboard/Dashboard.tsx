import React, { useEffect } from 'react';
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
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
} from '@mui/material';
import { Add as AddIcon, AccountTree as MindMapIcon } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { RootState, AppDispatch } from '../../store/store';
import { fetchMindmaps, generateMindmap } from '../../store/slices/mindmapSlice';
import { addNotification } from '../../store/slices/uiSlice';

interface CreateMindMapFormData {
  topic: string;
  description?: string;
}

const Dashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { mindmaps, isLoading } = useSelector((state: RootState) => state.mindmap);
  const { user } = useSelector((state: RootState) => state.auth);
  const { isGenerating } = useSelector((state: RootState) => state.ui);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateMindMapFormData>();

  useEffect(() => {
    dispatch(fetchMindmaps());
  }, [dispatch]);



  const handleCreateMindMap = async (data: CreateMindMapFormData) => {
    try {
      const result = await dispatch(generateMindmap({
        topic: data.topic,
        description: data.description,
        depth: 3,
        style: 'default',
      })).unwrap();
      
      if (result && (result as any).mindmap) {
        dispatch(addNotification({
          type: 'success',
          message: '思维导图创建成功！',
        }));
        setCreateDialogOpen(false);
        reset();
        navigate(`/mindmaps/${(result as any).mindmap.id}`);
      }
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        message: '创建思维导图失败，请重试',
      }));
    }
  };

  const handleOpenMindMap = (id: string) => {
    navigate(`/mindmaps/${id}`);
  };

  const recentMindmaps = mindmaps.slice(0, 6);

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          欢迎回来，{user?.username}！
        </Typography>
        <Typography variant="body1" color="textSecondary">
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

      {/* 最近的思维导图 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          最近的思维导图
        </Typography>
        {isLoading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : recentMindmaps.length > 0 ? (
          <Grid container spacing={3}>
            {recentMindmaps.map((mindmap) => (
              <Grid item xs={12} sm={6} md={4} key={mindmap.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" component="h3" gutterBottom>
                      {mindmap.title}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      {mindmap.description || '暂无描述'}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      创建于 {new Date(mindmap.created_at).toLocaleDateString()}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      color="primary"
                      onClick={() => handleOpenMindMap(mindmap.id)}
                    >
                      打开
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
                您还没有创建任何思维导图。点击右下角的按钮开始创建！
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>

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
            >
              创建思维导图
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              onClick={() => navigate('/mindmaps')}
            >
              查看所有思维导图
            </Button>
          </Grid>
        </Grid>
      </Box>

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

      {/* 创建思维导图对话框 */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>创建新的思维导图</DialogTitle>
        <form onSubmit={handleSubmit(handleCreateMindMap)}>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="主题"
              fullWidth
              variant="outlined"
              error={!!errors.topic}
              helperText={errors.topic?.message}
              {...register('topic', {
                required: '主题不能为空',
                minLength: {
                  value: 2,
                  message: '主题至少需要2个字符',
                },
              })}
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
              {isGenerating ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  生成中...
                </>
              ) : (
                '创建'
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
};

export default Dashboard;