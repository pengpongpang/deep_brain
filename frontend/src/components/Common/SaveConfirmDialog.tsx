import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
} from '@mui/material';
import {
  Save as SaveIcon,
  Close as CloseIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

interface SaveConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  onDiscard: () => void;
  title?: string;
  message?: string;
}

const SaveConfirmDialog: React.FC<SaveConfirmDialogProps> = ({
  open,
  onClose,
  onSave,
  onDiscard,
  title = '保存更改',
  message = '您有未保存的更改，是否要保存？',
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          <Typography variant="h6" component="span">
            {title}
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ color: 'grey.500' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 1 }}>
        <Typography variant="body1" color="text.secondary">
          {message}
        </Typography>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button
          onClick={onDiscard}
          variant="outlined"
          color="inherit"
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            minWidth: 100,
          }}
        >
          不保存
        </Button>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            minWidth: 100,
          }}
        >
          取消
        </Button>
        <Button
          onClick={onSave}
          variant="contained"
          startIcon={<SaveIcon />}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            minWidth: 100,
            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
            '&:hover': {
              background: 'linear-gradient(45deg, #1976D2 30%, #1CB5E0 90%)',
            },
          }}
        >
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SaveConfirmDialog;