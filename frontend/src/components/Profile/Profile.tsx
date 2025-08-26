import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Avatar,
  Grid,
  Card,
  CardContent,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Person as PersonIcon, Save as SaveIcon } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { RootState, AppDispatch } from '../../store/store';
import { updateUser } from '../../store/slices/authSlice';
import { addNotification } from '../../store/slices/uiSlice';

interface ProfileFormData {
  username: string;
  email: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

const Profile: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, isLoading, error } = useSelector((state: RootState) => state.auth);
  const { mindmaps } = useSelector((state: RootState) => state.mindmap);
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    defaultValues: {
      username: user?.username || '',
      email: user?.email || '',
    },
  });

  const newPassword = watch('newPassword');

  const onSubmit = async (data: ProfileFormData) => {
    try {
      const updateData: any = {
        username: data.username,
        email: data.email,
      };

      // 如果要更改密码
      if (data.newPassword && data.currentPassword) {
        updateData.current_password = data.currentPassword;
        updateData.new_password = data.newPassword;
      }

      await dispatch(updateUser(updateData)).unwrap();
      
      dispatch(addNotification({
        type: 'success',
        message: '个人资料更新成功',
      }));
      
      setIsEditing(false);
      setShowPasswordFields(false);
      reset({
        username: data.username,
        email: data.email,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        message: '更新失败，请检查输入信息',
      }));
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setShowPasswordFields(false);
    reset({
      username: user?.username || '',
      email: user?.email || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  const userStats = {
    totalMindmaps: mindmaps.length,
    publicMindmaps: mindmaps.filter(m => m.is_public).length,
    privateMindmaps: mindmaps.filter(m => !m.is_public).length,
    joinDate: user?.created_at ? new Date(user.created_at).toLocaleDateString() : '未知',
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          个人资料
        </Typography>
        <Typography variant="body1" color="textSecondary">
          管理您的账户信息和设置
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* 基本信息 */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" mb={3}>
              <Avatar sx={{ width: 64, height: 64, mr: 2, bgcolor: 'primary.main' }}>
                <PersonIcon sx={{ fontSize: 32 }} />
              </Avatar>
              <Box>
                <Typography variant="h5">{user?.username}</Typography>
                <Typography variant="body2" color="textSecondary">
                  {user?.email}
                </Typography>
              </Box>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="用户名"
                    disabled={!isEditing}
                    error={!!errors.username}
                    helperText={errors.username?.message}
                    {...register('username', {
                      required: '用户名不能为空',
                      minLength: {
                        value: 3,
                        message: '用户名至少需要3个字符',
                      },
                    })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="邮箱地址"
                    type="email"
                    disabled={!isEditing}
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    {...register('email', {
                      required: '邮箱地址不能为空',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: '请输入有效的邮箱地址',
                      },
                    })}
                  />
                </Grid>

                {/* 密码修改字段 */}
                {showPasswordFields && (
                  <>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="h6" gutterBottom>
                        修改密码
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="当前密码"
                        type="password"
                        error={!!errors.currentPassword}
                        helperText={errors.currentPassword?.message}
                        {...register('currentPassword', {
                          required: showPasswordFields ? '请输入当前密码' : false,
                        })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="新密码"
                        type="password"
                        error={!!errors.newPassword}
                        helperText={errors.newPassword?.message}
                        {...register('newPassword', {
                          required: showPasswordFields ? '请输入新密码' : false,
                          minLength: {
                            value: 6,
                            message: '密码至少需要6个字符',
                          },
                        })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="确认新密码"
                        type="password"
                        error={!!errors.confirmPassword}
                        helperText={errors.confirmPassword?.message}
                        {...register('confirmPassword', {
                          required: showPasswordFields ? '请确认新密码' : false,
                          validate: (value) => {
                            if (showPasswordFields && value !== newPassword) {
                              return '两次输入的密码不一致';
                            }
                            return true;
                          },
                        })}
                      />
                    </Grid>
                  </>
                )}
              </Grid>

              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                {!isEditing ? (
                  <>
                    <Button
                      variant="contained"
                      onClick={() => setIsEditing(true)}
                    >
                      编辑资料
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setIsEditing(true);
                        setShowPasswordFields(true);
                      }}
                    >
                      修改密码
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={<SaveIcon />}
                      disabled={isLoading || (!isDirty && !showPasswordFields)}
                    >
                      {isLoading ? (
                        <>
                          <CircularProgress size={20} sx={{ mr: 1 }} />
                          保存中...
                        </>
                      ) : (
                        '保存更改'
                      )}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleCancel}
                      disabled={isLoading}
                    >
                      取消
                    </Button>
                  </>
                )}
              </Box>
            </form>
          </Paper>
        </Grid>

        {/* 统计信息 */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              账户统计
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h4" color="primary">
                    {userStats.totalMindmaps}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    思维导图总数
                  </Typography>
                </CardContent>
              </Card>
              
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h4" color="secondary">
                    {userStats.publicMindmaps}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    公开思维导图
                  </Typography>
                </CardContent>
              </Card>
              
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h4">
                    {userStats.privateMindmaps}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    私有思维导图
                  </Typography>
                </CardContent>
              </Card>
              
              <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                加入时间：{userStats.joinDate}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Profile;