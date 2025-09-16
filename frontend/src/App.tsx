import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import components
import Layout from './components/Layout/Layout';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';

import MindMapEditor from './components/MindMap/MindMapEditor';
import DefaultMindMapLoader from './components/MindMap/DefaultMindMapLoader';
import Profile from './components/Profile/Profile';

import ProtectedRoute from './components/Auth/ProtectedRoute';
import PWAInstallPrompt from './components/PWAInstallPrompt';

// Import store types and actions
import { RootState, AppDispatch } from './store/store';
import { getCurrentUser } from './store/slices/authSlice';

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);
  const { theme } = useSelector((state: RootState) => state.ui);

  // 创建主题
  const muiTheme = createTheme({
    palette: {
      mode: theme,
      primary: {
        main: '#1976d2',
        light: '#42a5f5',
        dark: '#1565c0',
      },
      secondary: {
        main: '#dc004e',
        light: '#ff5983',
        dark: '#9a0036',
      },
      background: {
        default: theme === 'dark' ? '#121212' : '#f5f5f5',
        paper: theme === 'dark' ? '#1e1e1e' : '#ffffff',
      },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h4: {
        fontWeight: 600,
      },
      h5: {
        fontWeight: 500,
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 8,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: theme === 'dark' 
              ? '0 4px 6px rgba(0, 0, 0, 0.3)' 
              : '0 4px 6px rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
  });

  // 应用启动时检查用户认证状态
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !isAuthenticated) {
      dispatch(getCurrentUser());
    }
  }, [dispatch, isAuthenticated]);

  // 注册Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('SW registered: ', registration);
            
            // 立即检查更新
            registration.update();
            
            // 检查更新
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // 有新版本可用，自动更新
                    console.log('发现新版本，正在更新...');
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                    
                    // 延迟刷新，让用户看到更新提示
                    setTimeout(() => {
                      window.location.reload();
                    }, 1000);
                  }
                });
              }
            });

            // 监听Service Worker消息
            navigator.serviceWorker.addEventListener('message', (event) => {
              if (event.data && event.data.type === 'CACHE_CLEARED') {
                console.log('缓存已清除，正在重新加载...');
                window.location.reload();
              }
            });

            // 定期检查更新（每5分钟）
            setInterval(() => {
              registration.update();
            }, 5 * 60 * 1000);
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
          });
      });

      // 添加全局强制更新函数
      (window as any).forceUpdate = () => {
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'FORCE_UPDATE' });
        } else {
          window.location.reload();
        }
      };
    }
  }, []);

  if (isLoading) {
    return (
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
        >
          <div className="loading-spinner">加载中...</div>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <Routes>
          {/* 公开路由 */}
          <Route 
            path="/login" 
            element={!isAuthenticated ? <Login /> : <Navigate to="/" />} 
          />
          <Route 
            path="/register" 
            element={!isAuthenticated ? <Register /> : <Navigate to="/" />} 
          />
          
          {/* 受保护的路由 */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DefaultMindMapLoader />} />
            <Route path="mindmap/:id" element={<MindMapEditor />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          
          {/* 默认重定向 */}
          <Route 
            path="*" 
            element={<Navigate to={isAuthenticated ? "/" : "/login"} />} 
          />
      </Routes>
      
      {/* PWA安装提示 */}
      <PWAInstallPrompt />
      
      {/* 全局通知 */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={theme}
      />
    </ThemeProvider>
  );
}

export default App;