import { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation, useNavigate, UNSAFE_NavigationContext, To, NavigateOptions } from 'react-router-dom';
import { useContext } from 'react';

interface UseUnsavedChangesWarningProps {
  hasUnsavedChanges: boolean | (() => boolean);
  onSave: () => Promise<void> | void;
  message?: string;
}

interface UseUnsavedChangesWarningReturn {
  showDialog: boolean;
  dialogProps: {
    onSave: () => void;
    onDiscard: () => void;
    onClose: () => void;
    message: string;
  };
}

export const useUnsavedChangesWarning = ({
  hasUnsavedChanges,
  onSave,
  message = '您有未保存的更改，是否要保存？',
}: UseUnsavedChangesWarningProps): UseUnsavedChangesWarningReturn => {
  const [showDialog, setShowDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const navigator = useContext(UNSAFE_NavigationContext).navigator;
  const blockedRef = useRef(false);

  // 辅助函数：检查是否有未保存的更改
  const checkHasUnsavedChanges = useCallback(() => {
    return typeof hasUnsavedChanges === 'function' ? hasUnsavedChanges() : hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  // 处理路由变化的阻塞
  useEffect(() => {
    if (!navigator) return;

    const originalPush = navigator.push;
    const originalReplace = navigator.replace;
    const originalGo = navigator.go;

    navigator.push = (to: To, state?: any, opts?: NavigateOptions) => {
        if (!blockedRef.current && checkHasUnsavedChanges()) {
          setShowDialog(true);
          setPendingNavigation(() => () => {
            blockedRef.current = true;
            originalPush(to, state, opts);
            blockedRef.current = false;
          });
        } else {
          originalPush(to, state, opts);
        }
      };

    navigator.replace = (to: To, state?: any, opts?: NavigateOptions) => {
        if (!blockedRef.current && checkHasUnsavedChanges()) {
          setShowDialog(true);
          setPendingNavigation(() => () => {
            blockedRef.current = true;
            originalReplace(to, state, opts);
            blockedRef.current = false;
          });
        } else {
          originalReplace(to, state, opts);
        }
      };

      navigator.go = (delta: number) => {
        if (!blockedRef.current && checkHasUnsavedChanges()) {
          setShowDialog(true);
          setPendingNavigation(() => () => {
            blockedRef.current = true;
            originalGo(delta);
            blockedRef.current = false;
          });
        } else {
          originalGo(delta);
        }
      };

    return () => {
      navigator.push = originalPush;
      navigator.replace = originalReplace;
      navigator.go = originalGo;
    };
  }, [navigator, checkHasUnsavedChanges]);

  // 处理页面退出的警告
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (checkHasUnsavedChanges()) {
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [checkHasUnsavedChanges, message]);

  // 保存并继续导航
  const handleSave = useCallback(async () => {
    try {
      await onSave();
      setShowDialog(false);
      if (pendingNavigation) {
        pendingNavigation();
        setPendingNavigation(null);
      }
    } catch (error) {
      console.error('保存失败:', error);
      // 保存失败时不继续导航
    }
  }, [onSave, pendingNavigation]);

  // 不保存直接离开
  const handleDiscard = useCallback(() => {
    setShowDialog(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  }, [pendingNavigation]);

  // 取消导航
  const handleClose = useCallback(() => {
    setShowDialog(false);
    setPendingNavigation(null);
  }, []);

  return {
    showDialog,
    dialogProps: {
      onSave: handleSave,
      onDiscard: handleDiscard,
      onClose: handleClose,
      message,
    },
  };
};