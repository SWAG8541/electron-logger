# Activity Logger - Developer Guide

This guide provides detailed information for developers who want to understand, modify, or extend the Activity Logger application.

## Project Overview

Activity Logger is a comprehensive activity tracking system consisting of:

1. **Desktop Application**: An Electron-based app that runs in the background, capturing:
   - Screenshots at random intervals (5-10 minutes)
   - Keyboard activity (key presses and releases)
   - Mouse movements and clicks

2. **Web Application**: A MERN stack web application for viewing the collected data:
   - Express.js backend API
   - React frontend dashboard
   - MongoDB database integration

## Project Structure

```
electron-logger/
├── DesktopApp/                # Electron desktop application
│   ├── assets/                # Application assets (icons, etc.)
│   ├── main.js                # Main process - core application logic
│   ├── preload.js             # Preload script for renderer security
│   ├── index.html             # Renderer process UI
│   └── package.json           # Desktop app dependencies
├── WebApp/                    # Web application
│   ├── client/                # React frontend
│   │   ├── public/            # Static assets
│   │   ├── src/               # React source code
│   │   └── package.json       # Client dependencies
│   ├── server/                # Express backend
│   │   ├── public/            # Server static files
│   │   ├── server.js          # Express server
│   │   └── package.json       # Server dependencies
│   └── package.json           # Web app configuration
└── package.json               # Root project configuration
```

## Setup and Installation

### Prerequisites

- Node.js (v22.14.0 or later)
- MongoDB (running locally or accessible via URI)
- Git (for version control)

### Installation Steps

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd electron-logger
   ```

2. Install all dependencies:
   ```bash
   npm run install-all
   ```

3. Configure MongoDB:
   - Ensure MongoDB is running on localhost:27017 (default)
   - Or update connection settings in the respective configuration files

## Running the Application

### Desktop Application

```bash
cd DesktopApp
npm start
```

The desktop app will:
- Prompt for login (default: user@example.com / user@123)
- Run in the background, even when closed
- Appear in the system tray for easy access

### Web Server

```bash
cd WebApp/server
npm start
```

The server runs on port 3000 by default.

### Web Client

```bash
cd WebApp/client
npm start
```

The client runs on port 3001 by default and proxies API requests to the server.

## Core Components

### Desktop Application (Electron)

#### Main Process (main.js)

The main process is responsible for:
- Managing the application lifecycle
- Creating windows and tray icons
- Connecting to MongoDB
- Capturing screenshots
- Processing keyboard and mouse events
- Storing data in MongoDB

Key functions:
- `takeScreenshot()`: Captures and saves screenshots
- `startKeyboardLogging()`: Initializes keyboard event tracking
- `trackMousePosition()`: Records mouse movements
- `connectToMongoDB()`: Establishes database connection

#### Renderer Process (index.html)

The renderer process provides:
- User authentication interface
- Simple status display
- Communication with the main process via IPC

#### Preload Script (preload.js)

The preload script:
- Creates a secure bridge between renderer and main processes
- Exposes limited API to the renderer
- Configures Content Security Policy

### Web Application

#### Server (server.js)

The Express server provides:
- RESTful API endpoints for accessing activity data
- Data pagination and optimization
- MongoDB connection and queries

Key endpoints:
- `GET /api/dates`: List of dates with activity data
- `GET /api/screenshots/:date`: Screenshots for a specific date
- `GET /api/keylogs/:date`: Keyboard logs for a specific date
- `GET /api/mouse/:date`: Mouse activity for a specific date
- `GET /api/summary/:date`: Activity summary for a specific date

#### Client (React)

The React client provides:
- Dashboard for viewing activity data
- Date selection
- Screenshots gallery
- Keyboard activity logs
- Mouse movement visualization

## Authentication

The application implements basic authentication:

1. **Desktop Application**: 
   - Login form with hardcoded credentials (user@example.com / user@123)
   - Authentication state stored in memory

2. **Web Application**:
   - Currently uses basic authentication
   - Can be extended to use database-driven authentication with role-based access

## Data Storage

All data is stored in MongoDB with the following collections:

1. **screenshots**: 
   - `timestamp`: Date and time of capture
   - `date`: Formatted date (YYYY-MM-DD)
   - `image`: Base64-encoded screenshot

2. **keylogs**:
   - `timestamp`: Date and time of key event
   - `date`: Formatted date (YYYY-MM-DD)
   - `key`: Key name
   - `state`: Key state (UP or DOWN)

3. **mouse_activity**:
   - `timestamp`: Date and time of mouse event
   - `date`: Formatted date (YYYY-MM-DD)
   - `x`: X-coordinate
   - `y`: Y-coordinate

## Extension Points

### Adding New Features to Desktop App

1. **New Tracking Capabilities**:
   - Add new tracking modules in main.js
   - Create new MongoDB collections for the data

2. **Enhanced UI**:
   - Modify index.html for additional UI elements
   - Update preload.js to expose new IPC channels

### Enhancing Web Dashboard

1. **New Visualizations**:
   - Add new React components in WebApp/client/src/components
   - Update routes in App.js

2. **Additional API Endpoints**:
   - Add new routes in server.js
   - Implement new MongoDB queries

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failures**:
   - Check if MongoDB is running
   - Verify connection string in settings

2. **Desktop App Not Capturing**:
   - Ensure successful login
   - Check app.log for errors
   - Verify MongoDB connection

3. **Web Dashboard Not Showing Data**:
   - Check server console for API errors
   - Verify client proxy configuration
   - Ensure data exists for selected date

## Best Practices for Development

1. **Code Organization**:
   - Keep the folder structure clean
   - Follow the established patterns for new features

2. **Security Considerations**:
   - Use proper authentication for all components
   - Implement secure IPC in Electron
   - Validate all API inputs

3. **Performance Optimization**:
   - Use pagination for large datasets
   - Optimize image storage and retrieval
   - Batch database operations when possible

## Future Enhancements

1. **Security Improvements**:
   - Database-driven authentication
   - Role-based access control
   - Encrypted data storage

2. **Feature Additions**:
   - Application usage statistics
   - Activity categorization
   - Reporting capabilities

3. **Technical Improvements**:
   - Automated testing
   - Continuous integration
   - Cross-platform packaging
