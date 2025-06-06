# Activity Logger

A background application that captures screenshots at random intervals and logs keyboard/mouse activity, storing the data in MongoDB. Includes a web application to view the collected data.

## Project Structure

- **DesktopApp**: Electron application that captures screenshots and logs keyboard/mouse activity
- **WebApp**:
  - **client**: React frontend for viewing activity data
  - **server**: Express backend API for accessing MongoDB data

## Prerequisites

- Node.js (v22.14.0 or later)
- MongoDB (running locally or accessible via URI)

## Installation

### Install All Dependencies

```bash
npm run install-all
```

### Desktop App

```bash
npm run start-desktop
```

### Web Server

```bash
npm run start-server
```

### Web Client

```bash
npm run start-client
```

## Development

### Desktop App

```bash
cd DesktopApp
npm run dev
```

### Web Server

```bash
npm run dev-server
```

## Configuration

### Desktop App

The Desktop app can be configured through the settings UI. You can set:

- MongoDB connection URI
- Database name
- Screenshot interval (min and max minutes)

### Web App

The web app connects to the same MongoDB database as the Desktop app. By default, it connects to `mongodb://localhost:27017/activity_logger`.

## Building for Distribution

```bash
npm run dist
```

## Authentication

The application includes database-driven authentication with role-based access control (user and admin roles).

## Usage

1. Start the Desktop app, which will run in the background and appear in the system tray
2. The app will automatically start taking screenshots and logging keyboard/mouse activity
3. Start the web server and client to view the collected data
4. Use the date selector in the web app to choose which day's data to view

## License

MIT
#   e l e c t r o n - l o g g e r  
 #   e l e c t r o n - l o g g e r  
 