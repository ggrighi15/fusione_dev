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
  Login as LoginIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Unauthorized = () => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  const handleGoLogin = () => {
    navigate('/login');
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
          <LockIcon
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
            401
          </Typography>
          
          <Typography
            variant="h4"
            component="h2"
            gutterBottom
            sx={{ mb: 2 }}
          >
            Unauthorized Access
          </Typography>
          
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 4 }}
          >
            You don't have permission to access this resource. Please log in with appropriate credentials or contact your administrator.
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<LoginIcon />}
              onClick={handleGoLogin}
              size="large"
            >
              Login
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

export default Unauthorized;