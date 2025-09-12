import React, { useState, useEffect } from 'react';
import {
  Menu,
  MenuItem,
  Typography,
  Box,
  Chip,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert,
  Badge,
} from '@mui/material';
import {
  Stop,
  Refresh,
} from '@mui/icons-material';
import { taskApi } from '../../services/api';
import { getStatusColor, getStatusText, formatDate } from '../../utils/taskUtils';

interface Task {
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

interface TaskNotificationMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
}



const TaskNotificationMenu: React.FC<TaskNotificationMenuProps> = ({
  anchorEl,
  open,
  onClose,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await taskApi.getUserTasks(10); // 获取最近10个任务
      setTasks(response.data);
    } catch (err: any) {
      setError('获取任务列表失败');
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchTasks();
    }
  }, [open]);

  const handleStopTask = async (taskId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await taskApi.stopTask(taskId);
      await fetchTasks(); // 刷新任务列表
    } catch (err: any) {
      console.error('Failed to stop task:', err);
    }
  };

  const handleRestartTask = async (taskId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await taskApi.restartTask(taskId);
      await fetchTasks(); // 刷新任务列表
    } catch (err: any) {
      console.error('Failed to restart task:', err);
    }
  };

  const getTaskTypeText = (taskType: string) => {
    switch (taskType) {
      case 'generate_mindmap':
        return '生成思维导图';
      case 'expand_node':
        return '扩展节点';
      case 'enhance_description':
        return '增强描述';
      default:
        return taskType;
    }
  };

  const runningTasksCount = tasks.filter(task => 
    task.status === 'running' || task.status === 'pending'
  ).length;

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 400,
          maxHeight: 500,
        },
      }}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
    >
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" component="div">
          任务通知
          {runningTasksCount > 0 && (
            <Badge 
              badgeContent={runningTasksCount} 
              color="primary" 
              sx={{ ml: 1 }}
            />
          )}
        </Typography>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress size={24} />
        </Box>
      ) : error ? (
        <Box sx={{ p: 2 }}>
          <Alert severity="error">
            {error}
          </Alert>
        </Box>
      ) : tasks.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            暂无任务
          </Typography>
        </Box>
      ) : (
        <List sx={{ p: 0, maxHeight: 350, overflow: 'auto' }}>
          {tasks.map((task, index) => (
            <React.Fragment key={task.id}>
              <ListItem
                sx={{
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  py: 1.5,
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: 1 }}>
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight="medium">
                        {task.title || getTaskTypeText(task.task_type)}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(task.created_at)}
                      </Typography>
                    }
                    sx={{ flex: 1 }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={getStatusText(task.status)}
                      color={getStatusColor(task.status) as any}
                      size="small"
                    />
                    {task.is_stoppable && (task.status === 'pending' || task.status === 'running') && (
                      <IconButton
                        size="small"
                        onClick={(e) => handleStopTask(task.id, e)}
                        title="停止任务"
                      >
                        <Stop fontSize="small" />
                      </IconButton>
                    )}
                    {task.is_restartable && task.status === 'stopped' && (
                      <IconButton
                        size="small"
                        onClick={(e) => handleRestartTask(task.id, e)}
                        title="重启任务"
                      >
                        <Refresh fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </Box>
                
                {task.status === 'running' && (
                  <Box sx={{ width: '100%', mt: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        进度: {task.progress}%
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: '100%',
                        height: 4,
                        backgroundColor: 'action.hover',
                        borderRadius: 2,
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          width: `${task.progress}%`,
                          height: '100%',
                          backgroundColor: 'primary.main',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </Box>
                  </Box>
                )}
                
                {task.error_message && (
                  <Typography
                    variant="caption"
                    color="error"
                    sx={{ mt: 1, fontStyle: 'italic' }}
                  >
                    错误: {task.error_message}
                  </Typography>
                )}
              </ListItem>
              {index < tasks.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      )}
    </Menu>
  );
};

export default TaskNotificationMenu;