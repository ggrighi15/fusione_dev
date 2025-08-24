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
  ListItemSecondaryAction,
  Divider,
  Tab,
  Tabs,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Storage as StorageIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  CloudUpload as CloudUploadIcon,
  DataUsage as DataUsageIcon,
  Security as SecurityIcon,
  Backup as BackupIcon,
} from '@mui/icons-material';

const DataManagement = () => {
  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState('upload'); // 'upload', 'folder', 'edit'
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'file',
    category: 'general',
  });

  const [dataItems, setDataItems] = useState([
    {
      id: 1,
      name: 'Customer Database',
      type: 'database',
      size: '2.5 GB',
      lastModified: '2024-01-15 14:30',
      category: 'customer',
      status: 'active',
      description: 'Main customer database with all customer information',
    },
    {
      id: 2,
      name: 'Sales Reports 2024',
      type: 'folder',
      size: '156 MB',
      lastModified: '2024-01-14 09:15',
      category: 'reports',
      status: 'active',
      description: 'Collection of sales reports for 2024',
    },
    {
      id: 3,
      name: 'Product Catalog.xlsx',
      type: 'file',
      size: '45 MB',
      lastModified: '2024-01-13 16:45',
      category: 'product',
      status: 'processing',
      description: 'Complete product catalog with pricing',
    },
    {
      id: 4,
      name: 'Analytics Data',
      type: 'dataset',
      size: '1.2 GB',
      lastModified: '2024-01-12 11:20',
      category: 'analytics',
      status: 'archived',
      description: 'Historical analytics data for machine learning',
    },
  ]);

  const getTypeIcon = (type) => {
    const icons = {
      file: <FileIcon />,
      folder: <FolderIcon />,
      database: <StorageIcon />,
      dataset: <DataUsageIcon />,
    };
    return icons[type] || <FileIcon />;
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'success',
      processing: 'warning',
      archived: 'default',
      error: 'error',
    };
    return colors[status] || 'default';
  };

  const getCategoryColor = (category) => {
    const colors = {
      customer: 'primary',
      reports: 'secondary',
      product: 'info',
      analytics: 'warning',
      general: 'default',
    };
    return colors[category] || 'default';
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleOpenDialog = (type, item = null) => {
    setDialogType(type);
    setSelectedItem(item);
    if (item) {
      setFormData({
        name: item.name,
        description: item.description,
        type: item.type,
        category: item.category,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        type: 'file',
        category: 'general',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedItem(null);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = () => {
    if (dialogType === 'edit' && selectedItem) {
      setDataItems(prev => prev.map(item => 
        item.id === selectedItem.id 
          ? { ...item, ...formData, lastModified: new Date().toLocaleString() }
          : item
      ));
    } else {
      const newItem = {
        id: Date.now(),
        ...formData,
        size: '0 MB',
        lastModified: new Date().toLocaleString(),
        status: 'active',
      };
      setDataItems(prev => [...prev, newItem]);
    }
    handleCloseDialog();
  };

  const handleDelete = (itemId) => {
    setDataItems(prev => prev.filter(item => item.id !== itemId));
  };

  const filteredItems = dataItems.filter(item => {
    if (tabValue === 0) return true; // All
    if (tabValue === 1) return item.type === 'file';
    if (tabValue === 2) return item.type === 'folder';
    if (tabValue === 3) return item.type === 'database';
    if (tabValue === 4) return item.type === 'dataset';
    return true;
  });

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Data Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your data files, databases, and datasets
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<FolderIcon />}
            onClick={() => handleOpenDialog('folder')}
          >
            New Folder
          </Button>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => handleOpenDialog('upload')}
          >
            Upload Data
          </Button>
        </Box>
      </Box>

      {/* Statistics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <StorageIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
            <Typography variant="h4" color="primary">
              {dataItems.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Items
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <CloudUploadIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
            <Typography variant="h4" color="success.main">
              4.1 GB
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Size
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <SecurityIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
            <Typography variant="h4" color="info.main">
              {dataItems.filter(item => item.status === 'active').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Active
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <BackupIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
            <Typography variant="h4" color="warning.main">
              {dataItems.filter(item => item.status === 'archived').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Archived
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Filter Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="data filter tabs">
          <Tab label="All" />
          <Tab label="Files" />
          <Tab label="Folders" />
          <Tab label="Databases" />
          <Tab label="Datasets" />
        </Tabs>
      </Paper>

      {/* Data Items List */}
      <Paper>
        <List>
          {filteredItems.map((item, index) => (
            <React.Fragment key={item.id}>
              <ListItem>
                <ListItemIcon>
                  {getTypeIcon(item.type)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1">
                        {item.name}
                      </Typography>
                      <Chip
                        label={item.status}
                        color={getStatusColor(item.status)}
                        size="small"
                      />
                      <Chip
                        label={item.category}
                        color={getCategoryColor(item.category)}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {item.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Size: {item.size} • Last modified: {item.lastModified}
                      </Typography>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Download">
                      <IconButton size="small">
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => handleOpenDialog('edit', item)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => handleDelete(item.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
              {index < filteredItems.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      </Paper>

      {/* Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogType === 'upload' && 'Upload Data'}
          {dialogType === 'folder' && 'Create Folder'}
          {dialogType === 'edit' && 'Edit Item'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            name="name"
            value={formData.name}
            onChange={handleFormChange}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleFormChange}
            margin="normal"
            multiline
            rows={3}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Type</InputLabel>
            <Select
              name="type"
              value={formData.type}
              onChange={handleFormChange}
              label="Type"
            >
              <MenuItem value="file">File</MenuItem>
              <MenuItem value="folder">Folder</MenuItem>
              <MenuItem value="database">Database</MenuItem>
              <MenuItem value="dataset">Dataset</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Category</InputLabel>
            <Select
              name="category"
              value={formData.category}
              onChange={handleFormChange}
              label="Category"
            >
              <MenuItem value="general">General</MenuItem>
              <MenuItem value="customer">Customer</MenuItem>
              <MenuItem value="reports">Reports</MenuItem>
              <MenuItem value="product">Product</MenuItem>
              <MenuItem value="analytics">Analytics</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {dialogType === 'edit' ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataManagement;