import React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Backdrop,
} from '@mui/material';

const LoadingScreen = ({ open = true, message = 'Loading...' }) => {
  return (
    <Backdrop
      sx={{
        color: '#fff',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
      }}
      open={open}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <CircularProgress
          size={60}
          thickness={4}
          sx={{
            color: 'primary.main',
          }}
        />
        <Typography
          variant="h6"
          component="div"
          sx={{
            color: 'white',
            textAlign: 'center',
          }}
        >
          {message}
        </Typography>
      </Box>
    </Backdrop>
  );
};

export default LoadingScreen;