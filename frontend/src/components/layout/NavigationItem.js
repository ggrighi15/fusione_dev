import React from 'react';
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Box,
  useTheme,
  alpha,
} from '@mui/material';

const NavigationItem = ({ item, isActive, onClick, collapsed = false }) => {
  const theme = useTheme();
  const { icon: Icon, label, description } = item;

  const listItemContent = (
    <ListItemButton
      onClick={onClick}
      sx={{
        borderRadius: 2,
        mx: 1,
        mb: 0.5,
        minHeight: 48,
        transition: theme.transitions.create(
          ['background-color', 'box-shadow', 'border-color'],
          {
            duration: theme.transitions.duration.short,
          }
        ),
        ...(isActive && {
          backgroundColor: alpha(theme.palette.primary.main, 0.12),
          color: theme.palette.primary.main,
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.16),
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 3,
            height: '60%',
            backgroundColor: theme.palette.primary.main,
            borderRadius: '0 2px 2px 0',
          },
        }),
        ...(!isActive && {
          '&:hover': {
            backgroundColor: alpha(theme.palette.action.hover, 0.08),
          },
        }),
        position: 'relative',
      }}
    >
      <ListItemIcon
        sx={{
          minWidth: 40,
          color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
          transition: theme.transitions.create('color', {
            duration: theme.transitions.duration.short,
          }),
        }}
      >
        <Icon fontSize="small" />
      </ListItemIcon>
      
      {!collapsed && (
        <ListItemText
          primary={label}
          secondary={description}
          primaryTypographyProps={{
            variant: 'body2',
            fontWeight: isActive ? 600 : 500,
            color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
            noWrap: true,
          }}
          secondaryTypographyProps={{
            variant: 'caption',
            color: theme.palette.text.secondary,
            noWrap: true,
            sx: {
              fontSize: '0.7rem',
              lineHeight: 1.2,
            },
          }}
          sx={{
            margin: 0,
            '& .MuiListItemText-secondary': {
              marginTop: '2px',
            },
          }}
        />
      )}
    </ListItemButton>
  );

  // Se o drawer estiver colapsado, mostrar tooltip
  if (collapsed) {
    return (
      <Tooltip
        title={
          <Box>
            <Box sx={{ fontWeight: 600, mb: 0.5 }}>{label}</Box>
            <Box sx={{ fontSize: '0.8rem', opacity: 0.8 }}>{description}</Box>
          </Box>
        }
        placement="right"
        arrow
      >
        <ListItem disablePadding>
          {listItemContent}
        </ListItem>
      </Tooltip>
    );
  }

  return (
    <ListItem disablePadding>
      {listItemContent}
    </ListItem>
  );
};

export default NavigationItem;