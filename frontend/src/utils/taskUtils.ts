// 任务状态处理工具函数

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'default';
    case 'running':
      return 'primary';
    case 'completed':
      return 'success';
    case 'failed':
      return 'error';
    case 'stopped':
      return 'warning';
    case 'restarting':
      return 'info';
    default:
      return 'default';
  }
};

export const getStatusText = (status: string) => {
  switch (status) {
    case 'pending':
      return '等待中';
    case 'running':
      return '运行中';
    case 'completed':
      return '已完成';
    case 'failed':
      return '失败';
    case 'stopped':
      return '已停止';
    case 'restarting':
      return '重启中';
    default:
      return status;
  }
};

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};