import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Stop,
  Refresh,
  Info,
  Delete
} from '@mui/icons-material';
import { taskApi } from '../../services/api';
import { getStatusColor, getStatusText, formatDate } from '../../utils/taskUtils';

interface TaskListItem {
  id: string;
  title?: string;
  description?: string;
  task_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'stopped' | 'restarting';
  progress: number;
  created_at: string;
  updated_at: string;
  error_message?: string;
  result?: any;
  is_stoppable: boolean;
  is_restartable: boolean;
}

const TaskList: React.FC = () => {
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<TaskListItem | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      setError(null);
      const response = await taskApi.getUserTasks(20);
      setTasks(response.data);
    } catch (err: any) {
      setError('获取任务列表失败');
      console.error('Failed to fetch tasks:', err);
    }
  };

  useEffect(() => {
    const loadTasks = async () => {
      setLoading(true);
      await fetchTasks();
      setLoading(false);
    };
    
    loadTasks();
    // 每5秒刷新一次任务列表
    const interval = setInterval(() => fetchTasks(), 5000);
    return () => clearInterval(interval);
  }, []);



  const handleStopTask = async (taskId: string) => {
    try {
      setActionLoading(taskId);
      await taskApi.stopTask(taskId);
      await fetchTasks();
    } catch (err: any) {
      setError('停止任务失败');
      console.error('Failed to stop task:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestartTask = async (taskId: string) => {
    try {
      setActionLoading(taskId);
      await taskApi.restartTask(taskId);
      await fetchTasks();
    } catch (err: any) {
      setError('重启任务失败');
      console.error('Failed to restart task:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setTaskToDelete(taskId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    
    try {
      setActionLoading(taskToDelete);
      await taskApi.deleteTask(taskToDelete);
      await fetchTasks();
    } catch (err: any) {
      setError('删除任务失败');
      console.error('Failed to delete task:', err);
    } finally {
      setActionLoading(null);
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
    }
  };

  const cancelDeleteTask = () => {
    setDeleteDialogOpen(false);
    setTaskToDelete(null);
  };

  const handleShowDetail = (task: TaskListItem) => {
    setSelectedTask(task);
    setDetailDialogOpen(true);
  };



  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        任务管理
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {tasks.length === 0 ? (
        <Typography variant="body1" color="text.secondary">
          暂无任务
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {tasks.map((task) => (
            <Grid item xs={12} md={6} lg={4} key={task.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Typography variant="h6" component="div" noWrap>
                      {task.title || '未命名任务'}
                    </Typography>
                    <Chip 
                      label={getStatusText(task.status)} 
                      color={getStatusColor(task.status) as any}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    {task.description || '无描述'}
                  </Typography>
                  
                  <Typography variant="caption" display="block" mb={1}>
                    类型: {task.task_type}
                  </Typography>
                  
                  <Typography variant="caption" display="block" mb={2}>
                    创建时间: {formatDate(task.created_at)}
                  </Typography>
                  
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      {task.is_stoppable && (task.status === 'pending' || task.status === 'running') && (
                        <IconButton 
                          size="small" 
                          color="warning"
                          onClick={() => handleStopTask(task.id)}
                          disabled={actionLoading === task.id}
                        >
                          {actionLoading === task.id ? <CircularProgress size={20} /> : <Stop />}
                        </IconButton>
                      )}
                      
                      {task.is_restartable && task.status === 'stopped' && (
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => handleRestartTask(task.id)}
                          disabled={actionLoading === task.id}
                        >
                          {actionLoading === task.id ? <CircularProgress size={20} /> : <Refresh />}
                        </IconButton>
                      )}
                      
                      {(task.status === 'completed' || task.status === 'failed' || task.status === 'stopped' || task.status === 'restarting') && (
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleDeleteTask(task.id)}
                          disabled={actionLoading === task.id}
                        >
                          {actionLoading === task.id ? <CircularProgress size={20} /> : <Delete />}
                        </IconButton>
                      )}
                    </Box>
                    
                    <IconButton 
                      size="small" 
                      onClick={() => handleShowDetail(task)}
                    >
                      <Info />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* 任务详情对话框 */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          任务详情
        </DialogTitle>
        <DialogContent>
          {selectedTask && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedTask.title || '未命名任务'}
              </Typography>
              
              <Typography variant="body2" paragraph>
                <strong>描述:</strong> {selectedTask.description || '无描述'}
              </Typography>
              
              <Typography variant="body2" paragraph>
                <strong>类型:</strong> {selectedTask.task_type}
              </Typography>
              
              <Typography variant="body2" paragraph>
                <strong>状态:</strong> 
                <Chip 
                  label={getStatusText(selectedTask.status)} 
                  color={getStatusColor(selectedTask.status) as any}
                  size="small"
                  sx={{ ml: 1 }}
                />
              </Typography>
              
              <Typography variant="body2" paragraph>
                <strong>创建时间:</strong> {formatDate(selectedTask.created_at)}
              </Typography>
              
              <Typography variant="body2" paragraph>
                <strong>更新时间:</strong> {formatDate(selectedTask.updated_at)}
              </Typography>
              
              {selectedTask.error_message && (
                <Typography variant="body2" paragraph color="error">
                  <strong>错误信息:</strong> {selectedTask.error_message}
                </Typography>
              )}
              
              {selectedTask.result && (
                <Box>
                  <Typography variant="body2" gutterBottom>
                    <strong>结果:</strong>
                  </Typography>
                  <Box 
                    component="pre" 
                    sx={{ 
                      backgroundColor: 'grey.100', 
                      p: 1, 
                      borderRadius: 1, 
                      fontSize: '0.75rem',
                      overflow: 'auto',
                      maxHeight: '200px'
                    }}
                  >
                    {JSON.stringify(selectedTask.result, null, 2)}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>
            关闭
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={cancelDeleteTask}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          确认删除
        </DialogTitle>
        <DialogContent>
          <Typography>
            确定要删除这个任务吗？此操作不可撤销。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDeleteTask}>
            取消
          </Button>
          <Button onClick={confirmDeleteTask} color="error" variant="contained">
            删除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TaskList;