# Activity Logger

A background application that captures screenshots at random intervals and logs keyboard/mouse activity, storing the data in MongoDB. Includes a web application to view the collected data.

## Project Structure

- **Electron App**: Background application that captures screenshots and logs keyboard/mouse activity
- **Web App**: MERN stack application to view the collected data

## Prerequisites

- Node.js (v22.14.0 or later)
- MongoDB (running locally or accessible via URI)

## Installation

### Electron App

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the application:
   ```
   npm start
   ```

### Web App

1. Navigate to the webapp directory:
   ```
   cd webapp
   ```
2. Install server dependencies:
   ```
   npm install
   ```
3. Navigate to the client directory:
   ```
   cd client
   ```
4. Install client dependencies:
   ```
   npm install
   ```
5. Return to the webapp directory:
   ```
   cd ..
   ```
6. Start both the server and client:
   ```
   npm run dev
   ```

## Configuration

### Electron App

The Electron app can be configured through the settings UI. You can set:

- MongoDB connection URI
- Database name
- Screenshot interval (min and max minutes)

### Web App

The web app connects to the same MongoDB database as the Electron app. By default, it connects to `mongodb://localhost:27017/activity_logger`.

## Usage

1. Start the Electron app, which will run in the background and appear in the system tray
2. The app will automatically start taking screenshots and logging keyboard/mouse activity
3. Start the web app to view the collected data
4. Use the date selector in the web app to choose which day's data to view

## License

ISC
