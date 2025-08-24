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
  ArrowBack as ArrowBackIcon,
  SearchOff as SearchOffIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  const handleGoBack = () => {
    navigate(-1);
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
          <SearchOffIcon
            sx={{
              fontSize: 120,
              color: 'text.secondary',
              mb: 3,
            }}
          />
          
          <Typography
            variant="h1"
            component="h1"
            sx={{
              fontSize: '6rem',
              fontWeight: 'bold',
              color: 'primary.main',
              mb: 2,
            }}
          >
            404
          </Typography>
          
          <Typography
            variant="h4"
            component="h2"
            gutterBottom
            sx={{ mb: 2 }}
          >
            Page Not Found
          </Typography>
          
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 4 }}
          >
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<HomeIcon />}
              onClick={handleGoHome}
              size="large"
            >
              Go to Dashboard
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={handleGoBack}
              size="large"
            >
              Go Back
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default NotFound;