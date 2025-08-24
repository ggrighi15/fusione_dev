import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Badge,
  Divider,
  Button,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  Close as CloseIcon,
  MoreVert as MoreVertIcon,
  MarkAsUnread as MarkAsUnreadIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

const NotificationPanel = ({ open, onClose }) => {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'success',
      title: 'Data Analysis Complete',
      message: 'Your data analysis has been completed successfully.',
      timestamp: '2024-01-15 14:30',
      read: false,
    },
    {
      id: 2,
      type: 'warning',
      title: 'System Maintenance',
      message: 'Scheduled maintenance will occur tonight at 2:00 AM.',
      timestamp: '2024-01-15 12:15',
      read: false,
    },
    {
      id: 3,
      type: 'error',
      title: 'Algorithm Error',
      message: 'An error occurred in the pattern recognition algorithm.',
      timestamp: '2024-01-15 10:45',
      read: true,
    },
    {
      id: 4,
      type: 'info',
      title: 'New Feature Available',
      message: 'Check out the new data visualization features.',
      timestamp: '2024-01-14 16:20',
      read: true,
    },
  ]);

  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);

  const getNotificationIcon = (type) => {
    const icons = {
      success: <SuccessIcon color="success" />,
      warning: <WarningIcon color="warning" />,
      error: <ErrorIcon color="error" />,
      info: <InfoIcon color="info" />,
    };
    return icons[type] || <InfoIcon />;
  };

  const getNotificationColor = (type) => {
    const colors = {
      success: 'success',
      warning: 'warning',
      error: 'error',
      info: 'info',
    };
    return colors[type] || 'default';
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMenuOpen = (event, notification) => {
    setAnchorEl(event.currentTarget);
    setSelectedNotification(notification);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedNotification(null);
  };

  const handleMarkAsRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    handleMenuClose();
  };

  const handleMarkAsUnread = (notificationId) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: false } : n
      )
    );
    handleMenuClose();
  };

  const handleDelete = (notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    handleMenuClose();
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  if (!open) return null;

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        top: 64,
        right: 16,
        width: 400,
        maxHeight: 600,
        zIndex: 1300,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon />
          </Badge>
          <Typography variant="h6">Notifications</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Actions */}
      {notifications.length > 0 && (
        <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
            >
              Mark All Read
            </Button>
            <Button
              size="small"
              color="error"
              onClick={handleClearAll}
            >
              Clear All
            </Button>
          </Box>
        </Box>
      )}

      {/* Notifications List */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <NotificationsIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No notifications
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {notifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <ListItem
                  sx={{
                    backgroundColor: notification.read ? 'transparent' : 'action.hover',
                    '&:hover': {
                      backgroundColor: 'action.selected',
                    },
                  }}
                >
                  <ListItemIcon>
                    {getNotificationIcon(notification.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2">
                          {notification.title}
                        </Typography>
                        {!notification.read && (
                          <Chip
                            label="New"
                            size="small"
                            color={getNotificationColor(notification.type)}
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {notification.timestamp}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={(e) => handleMenuOpen(e, notification)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < notifications.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedNotification && (
          [
            selectedNotification.read ? (
              <MenuItem
                key="unread"
                onClick={() => handleMarkAsUnread(selectedNotification.id)}
              >
                <ListItemIcon>
                  <MarkAsUnreadIcon fontSize="small" />
                </ListItemIcon>
                Mark as Unread
              </MenuItem>
            ) : (
              <MenuItem
                key="read"
                onClick={() => handleMarkAsRead(selectedNotification.id)}
              >
                <ListItemIcon>
                  <CheckCircle fontSize="small" />
                </ListItemIcon>
                Mark as Read
              </MenuItem>
            ),
            <MenuItem
              key="delete"
              onClick={() => handleDelete(selectedNotification.id)}
            >
              <ListItemIcon>
                <DeleteIcon fontSize="small" />
              </ListItemIcon>
              Delete
            </MenuItem>
          ]
        )}
      </Menu>
    </Paper>
  );
};

export default NotificationPanel;