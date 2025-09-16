import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  DeleteSweep as ClearIcon,
} from '@mui/icons-material';

const CacheManager: React.FC = () => {
  const [isClearing, setIsClearing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  const handleClearCache = async () => {
    setIsClearing(true);
    setMessage(null);

    try {
      // 清除浏览器缓存
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }

      // 通知Service Worker强制更新
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'FORCE_UPDATE' });
      }

      setMessage('缓存清除成功！页面将在3秒后自动刷新...');
      setMessageType('success');

      // 3秒后刷新页面
      setTimeout(() => {
        window.location.reload();
      }, 3000);

    } catch (error) {
      console.error('清除缓存失败:', error);
      setMessage('清除缓存失败，请尝试手动刷新页面');
      setMessageType('error');
    } finally {
      setIsClearing(false);
    }
  };

  const handleForceRefresh = () => {
    // 强制刷新页面，绕过缓存
    window.location.reload();
  };

  const handleHardRefresh = () => {
    // 硬刷新（Ctrl+F5效果）
    window.location.href = window.location.href;
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        缓存管理
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        如果您无法看到最新的功能更新，可以尝试以下操作来清除缓存：
      </Typography>

      {message && (
        <Alert severity={messageType} sx={{ mb: 2 }}>
          {message}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={isClearing ? <CircularProgress size={20} /> : <ClearIcon />}
          onClick={handleClearCache}
          disabled={isClearing}
          fullWidth
        >
          {isClearing ? '正在清除缓存...' : '清除所有缓存'}
        </Button>

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleForceRefresh}
          fullWidth
        >
          强制刷新页面
        </Button>

        <Button
          variant="outlined"
          color="secondary"
          onClick={handleHardRefresh}
          fullWidth
        >
          硬刷新（清除页面缓存）
        </Button>
      </Box>

      <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary' }}>
        提示：您也可以在浏览器开发者工具中按住刷新按钮选择"硬性重新加载"
      </Typography>
    </Paper>
  );
};

export default CacheManager;