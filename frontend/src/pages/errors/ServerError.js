import React from 'react';
import {
  Box,
  Typography,
  Button,
  Container,
  Paper,
} from '@mui/material';
import {
  Home as HomeIcon,
  Refresh as RefreshIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const ServerError = () => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 6,
            textAlign: 'center',
            maxWidth: 500,
            width: '100%',
          }}
        >
          <ErrorIcon
            sx={{
              fontSize: 120,
              color: 'error.main',
              mb: 3,
            }}
          />
          
          <Typography
            variant="h1"
            component="h1"
            sx={{
              fontSize: '6rem',
              fontWeight: 'bold',
              color: 'error.main',
              mb: 2,
            }}
          >
            500
          </Typography>
          
          <Typography
            variant="h4"
            component="h2"
            gutterBottom
            sx={{ mb: 2 }}
          >
            Internal Server Error
          </Typography>
          
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 4 }}
          >
            Something went wrong on our end. We're working to fix the issue. Please try again later or contact support if the problem persists.
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              size="large"
            >
              Try Again
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<HomeIcon />}
              onClick={handleGoHome}
              size="large"
            >
              Go to Dashboard
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default ServerError;