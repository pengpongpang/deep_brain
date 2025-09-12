import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Typography,
  CircularProgress,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { RootState, AppDispatch } from '../../store/store';
import { fetchMindmaps, createMindmap, MindMap } from '../../store/slices/mindmapSlice';

// 本地存储键名
const LAST_EDITED_MINDMAP_KEY = 'lastEditedMindmap';

const DefaultMindMapLoader: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { mindmaps, isLoading } = useSelector((state: RootState) => state.mindmap);
  
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  console.log('组件重新渲染:', { 
    mindmapsLength: mindmaps.length, 
    isLoading, 
    listDialogOpen, 
    initialLoadComplete 
  });

  // 获取思维导图列表
  useEffect(() => {
    dispatch(fetchMindmaps());
  }, [dispatch]);

  // 获取最近编辑的思维导图ID
  const getLastEditedMindmapId = (): string | null => {
    const id = localStorage.getItem(LAST_EDITED_MINDMAP_KEY);
    console.log('获取最近编辑的思维导图ID:', id);
    return id;
  };

  // 保存最近编辑的思维导图ID
  const saveLastEditedMindmapId = (id: string): void => {
    localStorage.setItem(LAST_EDITED_MINDMAP_KEY, id);
  };

  // 检查思维导图ID是否在列表中
  const isMindmapInList = (id: string, list: MindMap[]): boolean => {
    console.log('检查ID是否在列表中:', { id, listIds: list.map(m => m.id) });
    const result = list.some(mindmap => mindmap.id === id);
    console.log('检查结果:', result);
    return result;
  };

  // 创建新的思维导图
  const handleCreateNewMindmap = async () => {
    try {
      const result = await dispatch(createMindmap({
        title: '新思维导图',
        nodes: [
          {
            id: 'root',
            type: 'custom',
            position: { x: 0, y: 0 },
            data: {
              label: '中心主题',
              isRoot: true,
              level: 0,
            },
          },
        ],
        edges: [],
      })).unwrap();
      
      // 保存为最近编辑的思维导图
      saveLastEditedMindmapId(result.id);
      
      // 导航到新创建的思维导图
      navigate(`/mindmap/${result.id}`);
    } catch (error) {
      console.error('创建思维导图失败:', error);
    }
  };

  // 处理选择思维导图
  const handleSelectMindmap = (id: string) => {
    console.log('选择思维导图:', id);
    
    // 保存最近编辑的思维导图ID
    saveLastEditedMindmapId(id);
    console.log('保存最近编辑的思维导图ID完成');
    
    // 关闭对话框
    setListDialogOpen(false);
    console.log('关闭对话框完成');
    
    // 导航到选择的思维导图
    console.log('准备导航到:', `/mindmap/${id}`);
    
    // 使用直接跳转方式，强制浏览器导航
    const baseUrl = window.location.origin;
    const fullUrl = `${baseUrl}/mindmap/${id}`;
    console.log('完整URL:', fullUrl);
    
    // 使用replace方法替换当前历史记录，避免返回循环
    window.location.replace(fullUrl);
    console.log('导航指令已发出');
  };

  // 处理默认加载逻辑
  useEffect(() => {
    // 确保思维导图列表已加载且未处于加载状态
    if (!isLoading && !initialLoadComplete) {
      setInitialLoadComplete(true);
      
      if (mindmaps.length === 0) {
        // 思维导图列表为空，显示创建新思维导图按钮
        // 不做任何导航，让用户手动创建
        console.log('思维导图列表为空');
      } else {
        // 思维导图列表不为空
        const lastEditedId = getLastEditedMindmapId();
        console.log('默认加载逻辑:', { 
          lastEditedId, 
          mindmapsLength: mindmaps.length,
          inList: lastEditedId ? isMindmapInList(lastEditedId, mindmaps) : false 
        });
        
        if (lastEditedId && isMindmapInList(lastEditedId, mindmaps)) {
          // 最近编辑的思维导图存在于列表中，导航到该思维导图
          console.log('导航到最近编辑的思维导图:', lastEditedId);
          // 直接调用handleSelectMindmap函数处理导航
          console.log('直接调用handleSelectMindmap函数');
          handleSelectMindmap(lastEditedId);
          console.log('handleSelectMindmap函数调用完成');
        
        } else {
          // 用户没有最近修改的思维导图，或者最近修改的思维导图不在列表中，直接打开思维导图选择弹窗
          console.log('打开思维导图选择弹窗');
          setListDialogOpen(true);
        }
      }
    }
  }, [mindmaps, isLoading, navigate, initialLoadComplete]);

  // 确保在初始加载完成后，如果没有最近编辑的思维导图或者最近编辑的思维导图不在列表中，则打开列表对话框
  useEffect(() => {
    if (initialLoadComplete && mindmaps.length > 0) {
      const lastEditedId = getLastEditedMindmapId();
      console.log('初始加载完成后检查:', { 
        lastEditedId, 
        mindmapsLength: mindmaps.length,
        inList: lastEditedId ? isMindmapInList(lastEditedId, mindmaps) : false,
        listDialogOpen
      });
      if (!lastEditedId || !isMindmapInList(lastEditedId, mindmaps)) {
        console.log('设置对话框打开');
        // 强制设置对话框打开
        setTimeout(() => {
          setListDialogOpen(true);
        }, 0);
      }
      if (lastEditedId && isMindmapInList(lastEditedId, mindmaps)) {
        console.log('导航到最近编辑的思维导图:', lastEditedId);
        handleSelectMindmap(lastEditedId);
      }
    }
  }, [initialLoadComplete, mindmaps]);

  // 渲染思维导图列表对话框
  const renderMindmapListDialog = () => {
    console.log('渲染对话框，对话框状态:', listDialogOpen);
    return (
      <Dialog 
        open={listDialogOpen} 
        // 不允许通过点击背景或按ESC键关闭对话框
        onClose={(event, reason) => {
          // 阻止背景点击和ESC键关闭
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
            return;
          }
        }}
        // 不允许按ESC键关闭对话框
        disableEscapeKeyDown
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>选择思维导图</DialogTitle>
        <DialogContent>
          <List>
            {mindmaps.map((mindmap) => (
              <ListItem key={mindmap.id} disablePadding>
                <ListItemButton onClick={() => handleSelectMindmap(mindmap.id)}>
                  <ListItemText 
                    primary={mindmap.title} 
                    secondary={`创建于 ${new Date(mindmap.created_at).toLocaleString()}`} 
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    );
  };

  // 渲染加载状态
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  // 渲染空状态（无思维导图）
  if (mindmaps.length === 0) {
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="80vh"
        gap={2}
      >
        <Typography variant="h5" gutterBottom>
          您还没有创建任何思维导图
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreateNewMindmap}
        >
          创建新思维导图
        </Button>
      </Box>
    );
  }



  // 渲染思维导图列表对话框
  return (
    <>
      {renderMindmapListDialog()}
      {/* 只有在初始加载未完成时才显示加载状态 */}
      {!initialLoadComplete && (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
          <CircularProgress />
        </Box>
      )}
      {/* 初始加载完成后显示空白页面，对话框会覆盖在上面 */}
      {initialLoadComplete && (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
          <Typography variant="body1" color="textSecondary">
            请选择或创建思维导图
          </Typography>
        </Box>
      )}
    </>
  );
};

export default DefaultMindMapLoader;