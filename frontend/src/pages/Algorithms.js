import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Tab,
  Tabs,
} from '@mui/material';
import {
  Code as CodeIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Settings as SettingsIcon,
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';

const Algorithms = () => {
  const [tabValue, setTabValue] = useState(0);
  const [algorithms, setAlgorithms] = useState([
    {
      id: 1,
      name: 'Data Comparison Algorithm',
      description: 'Advanced algorithm for comparing large datasets',
      status: 'running',
      performance: 85,
      lastRun: '2024-01-15 14:30',
      category: 'comparison',
      complexity: 'O(n log n)',
    },
    {
      id: 2,
      name: 'Pattern Recognition',
      description: 'Machine learning algorithm for pattern detection',
      status: 'idle',
      performance: 92,
      lastRun: '2024-01-14 09:15',
      category: 'ml',
      complexity: 'O(n²)',
    },
    {
      id: 3,
      name: 'Data Normalization',
      description: 'Normalizes data for consistent processing',
      status: 'running',
      performance: 78,
      lastRun: '2024-01-15 16:45',
      category: 'preprocessing',
      complexity: 'O(n)',
    },
    {
      id: 4,
      name: 'Anomaly Detection',
      description: 'Detects anomalies in data streams',
      status: 'error',
      performance: 0,
      lastRun: '2024-01-15 12:00',
      category: 'analysis',
      complexity: 'O(n log n)',
    },
  ]);

  const getStatusColor = (status) => {
    const colors = {
      running: 'success',
      idle: 'default',
      error: 'error',
      stopped: 'warning',
    };
    return colors[status] || 'default';
  };

  const getCategoryColor = (category) => {
    const colors = {
      comparison: 'primary',
      ml: 'secondary',
      preprocessing: 'info',
      analysis: 'warning',
    };
    return colors[category] || 'default';
  };

  const getPerformanceColor = (performance) => {
    if (performance >= 80) return 'success';
    if (performance >= 60) return 'warning';
    return 'error';
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const filteredAlgorithms = algorithms.filter(algorithm => {
    if (tabValue === 0) return true; // All
    if (tabValue === 1) return algorithm.status === 'running';
    if (tabValue === 2) return algorithm.status === 'idle';
    if (tabValue === 3) return algorithm.status === 'error';
    return true;
  });

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Algorithms
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage and monitor algorithm performance
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          size="large"
        >
          New Algorithm
        </Button>
      </Box>

      {/* Statistics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <SpeedIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
            <Typography variant="h4" color="primary">
              {algorithms.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Algorithms
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <PlayIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
            <Typography variant="h4" color="success.main">
              {algorithms.filter(a => a.status === 'running').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Running
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <MemoryIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
            <Typography variant="h4" color="info.main">
              {Math.round(algorithms.reduce((acc, a) => acc + a.performance, 0) / algorithms.length)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Avg Performance
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <TimelineIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
            <Typography variant="h4" color="warning.main">
              {algorithms.filter(a => a.status === 'error').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Errors
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Filter Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="algorithm filter tabs">
          <Tab label="All" />
          <Tab label="Running" />
          <Tab label="Idle" />
          <Tab label="Errors" />
        </Tabs>
      </Paper>

      {/* Algorithms List */}
      <Grid container spacing={3}>
        {filteredAlgorithms.map((algorithm) => (
          <Grid item xs={12} md={6} lg={4} key={algorithm.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" component="h2">
                    {algorithm.name}
                  </Typography>
                  <Chip
                    label={algorithm.status}
                    color={getStatusColor(algorithm.status)}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {algorithm.description}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Chip
                    label={algorithm.category}
                    color={getCategoryColor(algorithm.category)}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={algorithm.complexity}
                    size="small"
                    variant="outlined"
                  />
                </Box>
                {algorithm.status !== 'error' && (
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="caption">Performance</Typography>
                      <Typography variant="caption">{algorithm.performance}%</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={algorithm.performance}
                      color={getPerformanceColor(algorithm.performance)}
                    />
                  </Box>
                )}
                <Typography variant="caption" color="text.secondary">
                  Last run: {algorithm.lastRun}
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: 'space-between' }}>
                <Box>
                  <Tooltip title="Edit">
                    <IconButton size="small">
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Settings">
                    <IconButton size="small">
                      <SettingsIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error">
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Box>
                  {algorithm.status === 'running' ? (
                    <Tooltip title="Stop">
                      <IconButton size="small" color="warning">
                        <StopIcon />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title="Start">
                      <IconButton size="small" color="success">
                        <PlayIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Algorithms;