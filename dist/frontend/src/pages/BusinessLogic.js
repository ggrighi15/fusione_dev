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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';

const BusinessLogic = () => {
  const [businessRules, setBusinessRules] = useState([
    {
      id: 1,
      name: 'Data Validation Rule',
      description: 'Validates incoming data format and structure',
      status: 'active',
      lastModified: '2024-01-15',
      type: 'validation',
    },
    {
      id: 2,
      name: 'Processing Workflow',
      description: 'Defines the sequence of data processing steps',
      status: 'inactive',
      lastModified: '2024-01-10',
      type: 'workflow',
    },
    {
      id: 3,
      name: 'Quality Control',
      description: 'Ensures data quality standards are met',
      status: 'active',
      lastModified: '2024-01-12',
      type: 'quality',
    },
  ]);

  const getStatusColor = (status) => {
    return status === 'active' ? 'success' : 'default';
  };

  const getTypeColor = (type) => {
    const colors = {
      validation: 'primary',
      workflow: 'secondary',
      quality: 'warning',
    };
    return colors[type] || 'default';
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Business Logic
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage business rules and workflows
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          size="large"
        >
          New Rule
        </Button>
      </Box>

      {/* Statistics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h3" color="primary">
              {businessRules.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Rules
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h3" color="success.main">
              {businessRules.filter(rule => rule.status === 'active').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Active Rules
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h3" color="warning.main">
              {businessRules.filter(rule => rule.type === 'validation').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Validation Rules
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h3" color="info.main">
              {businessRules.filter(rule => rule.type === 'workflow').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Workflows
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Business Rules List */}
      <Grid container spacing={3}>
        {businessRules.map((rule) => (
          <Grid item xs={12} md={6} lg={4} key={rule.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" component="h2">
                    {rule.name}
                  </Typography>
                  <Chip
                    label={rule.status}
                    color={getStatusColor(rule.status)}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {rule.description}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Chip
                    label={rule.type}
                    color={getTypeColor(rule.type)}
                    size="small"
                    variant="outlined"
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Last modified: {rule.lastModified}
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
                  {rule.status === 'active' ? (
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

export default BusinessLogic;