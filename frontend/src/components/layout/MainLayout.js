import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Tooltip,
  useTheme,
  useMediaQuery,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  Dashboard as DashboardIcon,
  Analytics as AnalyticsIcon,
  Assessment as ReportsIcon,
  NotificationsActive as NotificationActiveIcon,
  Storage as DataIcon,
  Compare as DataAnalysisIcon,
  Business as BusinessIcon,
  Code as AlgorithmsIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useSettings } from '../../contexts/SettingsContext';
import NavigationItem from './NavigationItem';
import NotificationPanel from '../NotificationPanel';

const drawerWidth = 280;

// Navigation items
const navigationItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: DashboardIcon,
    path: '/dashboard',
    description: 'System overview',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: AnalyticsIcon,
    path: '/analytics',
    description: 'Analysis and metrics',
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: ReportsIcon,
    path: '/reports',
    description: 'Report generation',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: NotificationActiveIcon,
    path: '/notifications',
    description: 'Notification center',
  },
  {
    id: 'data',
    label: 'Data Management',
    icon: DataIcon,
    path: '/data',
    description: 'Data management',
  },
  {
    id: 'data-analysis',
    label: 'Data Analysis',
    icon: DataAnalysisIcon,
    path: '/data-analysis',
    description: 'Data comparison and analysis',
  },
  {
    id: 'business',
    label: 'Business Logic',
    icon: BusinessIcon,
    path: '/business',
    description: 'Business rules',
  },
  {
    id: 'algorithms',
    label: 'Algorithms',
    icon: AlgorithmsIcon,
    path: '/algorithms',
    description: 'Algorithm management',
  },
];

const MainLayout = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotification();
  const { darkMode, toggleDarkMode } = useSettings();

  // Close drawer on mobile when route changes
  useEffect(() => {
    if (isMobile) {
      setDrawerOpen(false);
    }
  }, [location.pathname, isMobile]);

  // Adjust drawer based on screen size
  useEffect(() => {
    setDrawerOpen(!isMobile);
  }, [isMobile]);

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = async () => {
    handleUserMenuClose();
    await logout();
    navigate('/login');
  };

  const handleProfileClick = () => {
    handleUserMenuClose();
    navigate('/profile');
  };

  const handleSettingsClick = () => {
    handleUserMenuClose();
    navigate('/settings');
  };

  const handleNotificationClick = () => {
    setNotificationPanelOpen(true);
  };

  // Get current page title
  const getCurrentPageTitle = () => {
    const currentItem = navigationItems.find(item => item.path === location.pathname);
    return currentItem ? currentItem.label : 'Fusione Core';
  };

  // Drawer content
  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header do Drawer */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 64,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 70,
              height: 70,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img 
              src="/fusione-logo-transparente.png" 
              alt="Fusione Logo" 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </Box>
          <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
            Fusione Core System
          </Typography>
        </Box>
        {!isMobile && (
          <IconButton onClick={handleDrawerToggle} size="small">
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Box>

      {/* User information */}
      <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            src={user?.avatar}
            sx={{
              width: 48,
              height: 48,
              bgcolor: theme.palette.primary.main,
            }}
          >
            {user?.name?.charAt(0) || user?.email?.charAt(0)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap sx={{ fontWeight: 500 }}>
              {user?.name || 'User'}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {user?.email}
            </Typography>
            {user?.role && (
              <Chip
                label={user.role}
                size="small"
                color="primary"
                sx={{ mt: 0.5, height: 20, fontSize: '0.7rem' }}
              />
            )}
          </Box>
        </Box>
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <List sx={{ pt: 1 }}>
          {navigationItems.map((item) => (
            <NavigationItem
              key={item.id}
              item={item}
              isActive={location.pathname === item.path}
              onClick={() => navigate(item.path)}
              collapsed={false}
            />
          ))}
        </List>
      </Box>

      {/* Footer do Drawer */}
      <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Typography variant="caption" color="text.secondary" align="center" display="block">
          © 2024 All rights reserved
        </Typography>
        <Typography variant="caption" color="text.secondary" align="center" display="block">
          Version 1.0.0
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          ...(drawerOpen &&
            !isMobile && {
              marginLeft: drawerWidth,
              width: `calc(100% - ${drawerWidth}px)`,
              transition: theme.transitions.create(['width', 'margin'], {
                easing: theme.transitions.easing.easeOut,
                duration: theme.transitions.duration.enteringScreen,
              }),
            }),
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerToggle}
            edge="start"
            sx={{
              mr: 2,
              ...(drawerOpen && !isMobile && { display: 'none' }),
            }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {getCurrentPageTitle()}
          </Typography>

          {/* AppBar actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Toggle Dark Mode */}
            <Tooltip title={darkMode ? 'Light mode' : 'Dark mode'}>
              <IconButton color="inherit" onClick={toggleDarkMode}>
                {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>

            {/* Notifications */}
            <Tooltip title="Notifications">
              <IconButton color="inherit" onClick={handleNotificationClick}>
                <Badge badgeContent={unreadCount} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* User menu */}
            <Tooltip title="User menu">
              <IconButton
                color="inherit"
                onClick={handleUserMenuOpen}
                sx={{ ml: 1 }}
              >
                <Avatar
                  src={user?.avatar}
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: theme.palette.secondary.main,
                  }}
                >
                  {user?.name?.charAt(0) || user?.email?.charAt(0)}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* User menu */}
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={handleUserMenuClose}
        onClick={handleUserMenuClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleProfileClick}>
          <AccountCircleIcon sx={{ mr: 2 }} />
          Profile
        </MenuItem>
        <MenuItem onClick={handleSettingsClick}>
          <SettingsIcon sx={{ mr: 2 }} />
          Settings
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <LogoutIcon sx={{ mr: 2 }} />
          Logout
        </MenuItem>
      </Menu>

      {/* Drawer */}
      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        open={drawerOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          marginLeft: isMobile ? 0 : drawerOpen ? 0 : `-${drawerWidth}px`,
        }}
      >
        <Toolbar /> {/* Spacer for AppBar */}
        <Box sx={{ p: 3, minHeight: 'calc(100vh - 64px)' }}>
          {children}
        </Box>
      </Box>

      {/* Notification panel */}
      <NotificationPanel
        open={notificationPanelOpen}
        onClose={() => setNotificationPanelOpen(false)}
      />
    </Box>
  );
};

export default MainLayout;