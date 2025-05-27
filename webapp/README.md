# Activity Logger - Web Dashboard

This is the web dashboard component of the Activity Logger application. It provides a web interface for viewing activity data collected by the Electron app.

## Features

- **Date Selection**: Choose which day's data to view
- **Screenshots**: View screenshots taken at random intervals
- **Keyboard Logs**: View keyboard activity with timestamps
- **Mouse Activity**: Visualize mouse movement with a heatmap
- **Activity Summary**: See a summary of activity for the selected date

## Architecture

The web dashboard consists of:

1. **Express.js Backend**:
   - Provides API endpoints for accessing activity data
   - Connects to the same MongoDB database as the Electron app
   - Implements data pagination and sampling for performance

2. **Frontend**:
   - Pure HTML/CSS/JavaScript implementation
   - Responsive design for different screen sizes
   - Tabbed interface for different data types

## API Endpoints

The following API endpoints are available:

- `GET /api/dates`: Returns a list of dates with activity data
- `GET /api/screenshots/:date`: Returns screenshots for a specific date
- `GET /api/screenshots/:date/:id`: Returns a specific screenshot
- `GET /api/keylogs/:date`: Returns keyboard logs for a specific date
- `GET /api/mouse/:date`: Returns mouse activity for a specific date
- `GET /api/summary/:date`: Returns a summary of activity for a specific date

## Data Optimization

The dashboard implements several optimizations for performance:

1. **Pagination**: Large datasets are paginated to reduce load times
2. **Image Separation**: Screenshot metadata is loaded separately from image data
3. **Data Sampling**: Mouse activity is sampled for visualization
4. **Lazy Loading**: Images are loaded only when needed

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Start the server:
   ```
   node server.js
   ```

3. Access the dashboard:
   ```
   http://localhost:3000
   ```

## Configuration

The server connects to MongoDB using the following default settings:

```javascript
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'activity_logger';
```

You can override these settings using environment variables.

## Development

For development with automatic restart on file changes:

```
npm install -g nodemon
nodemon server.js
```

## Customization

The dashboard can be customized by modifying the following files:

- `public/index.html`: Main dashboard UI
- `public/css/styles.css`: CSS styles
- `public/js/main.js`: JavaScript functionality

## License

MIT
