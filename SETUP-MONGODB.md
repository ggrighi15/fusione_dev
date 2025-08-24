# MongoDB Setup Guide

## Windows Installation

### Option 1: Using Docker (Recommended)

1. Install Docker Desktop for Windows
2. Run MongoDB container:
   ```bash
   docker run -d --name fusione-mongodb -p 27017:27017 mongo:latest
   ```

### Option 2: MongoDB Community Server

1. Download MongoDB Community Server from: https://www.mongodb.com/try/download/community
2. Install using the MSI installer
3. Start MongoDB service:
   ```bash
   net start MongoDB
   ```

### Option 3: MongoDB Atlas (Cloud)

1. Create account at https://www.mongodb.com/atlas
2. Create a free cluster
3. Get connection string and update `.env`

## Configuration

Update your `.env` file with MongoDB settings:

```env
# Local MongoDB
MONGODB_URI=mongodb://localhost:27017/fusione-core
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_DATABASE=fusione-core
MONGODB_USERNAME=
MONGODB_PASSWORD=

# For MongoDB Atlas
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/fusione-core
```

## Verification

Test MongoDB connection:
```bash
# Using MongoDB Compass (GUI)
# Connect to: mongodb://localhost:27017

# Using mongo shell
mongo
show dbs
```

## Database Structure

The system will automatically create these collections:

- `users` - User accounts and profiles
- `refreshtokens` - JWT refresh tokens
- `modules` - Module configurations and state
- `logs` - System and application logs (if enabled)

## Features Available with MongoDB

- User authentication and authorization
- Persistent user sessions
- Module configuration storage
- Application data persistence
- Audit logging

## Troubleshooting

- **Connection timeout**: Check if MongoDB service is running
- **Authentication failed**: Verify username/password in .env
- **Database not found**: MongoDB will create it automatically on first use
- **Permission denied**: Check MongoDB user permissions

## Security Notes

- Change default JWT secrets in production
- Use strong passwords for MongoDB users
- Enable MongoDB authentication in production
- Use SSL/TLS for remote connections

The system will continue to work without MongoDB, but authentication and data persistence will be disabled.