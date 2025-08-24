import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Error as ErrorIcon, Refresh as RefreshIcon } from '@mui/icons-material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log do erro para monitoramento
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            p: 3,
            bgcolor: 'background.default'
          }}
        >
          <Paper
            sx={{
              p: 4,
              textAlign: 'center',
              maxWidth: 600,
              width: '100%'
            }}
          >
            <ErrorIcon 
              sx={{ 
                fontSize: 64, 
                color: 'error.main', 
                mb: 2 
              }} 
            />
            
            <Typography variant="h4" gutterBottom color="error">
              Oops! Algo deu errado
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Ocorreu um erro inesperado na aplicação. Nossa equipe foi notificada.
            </Typography>
            
            {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
              <Box sx={{ mb: 3, textAlign: 'left' }}>
                <Typography variant="h6" color="error" gutterBottom>
                  Detalhes do erro (desenvolvimento):
                </Typography>
                <Typography 
                  variant="body2" 
                  component="pre" 
                  sx={{ 
                    bgcolor: 'grey.100', 
                    p: 2, 
                    borderRadius: 1,
                    overflow: 'auto',
                    fontSize: '0.8rem'
                  }}
                >
                  {this.state.error && this.state.error.toString()}
                  {this.state.errorInfo.componentStack}
                </Typography>
              </Box>
            )}
            
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={() => window.location.reload()}
              size="large"
            >
              Recarregar Página
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;