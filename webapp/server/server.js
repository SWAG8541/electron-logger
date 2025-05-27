/**
 * Activity Logger - Web Server
 *
 * This Express server provides an API for accessing activity data stored in MongoDB.
 * It serves endpoints for retrieving screenshots, keyboard logs, and mouse activity.
 */

const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const moment = require('moment');
const path = require('path');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Configure middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));  // Large limit for screenshots
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection settings
let db;
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'activity_logger';

/**
 * Connects to MongoDB database
 * @returns {Promise<boolean>} True if connection successful, false otherwise
 */
async function connectToMongoDB() {
  try {
    const client = new MongoClient(mongoUri);
    await client.connect();
    console.log('Connected to MongoDB');

    db = client.db(dbName);
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return false;
  }
}



/**
 * API Routes
 */

/**
 * GET /api/dates
 * Returns a list of all dates that have activity data
 */
app.get('/api/dates', async (_, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    // Get unique dates from each collection
    const screenshotDates = await db.collection('screenshots').distinct('date');
    const keylogDates = await db.collection('keylogs').distinct('date');
    const mouseDates = await db.collection('mouse_activity').distinct('date');

    // Combine and deduplicate dates
    const allDates = [...new Set([...screenshotDates, ...keylogDates, ...mouseDates])];

    // Sort dates in descending order (newest first)
    allDates.sort((a, b) => moment(b, 'YYYY-MM-DD').valueOf() - moment(a, 'YYYY-MM-DD').valueOf());

    res.json(allDates);
  } catch (error) {
    console.error('Error fetching dates:', error);
    res.status(500).json({ error: 'Failed to fetch dates' });
  }
});

/**
 * GET /api/screenshots/:date
 * Returns screenshots for a specific date with pagination
 * Optimized to limit the number of screenshots and exclude image data in the initial response
 */
app.get('/api/screenshots/:date', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const { date } = req.params;
    const limit = parseInt(req.query.limit) || 10; // Default to 10 screenshots
    const skip = parseInt(req.query.skip) || 0; // Default to no skip
    const includeImages = req.query.includeImages === 'true';
    const includeCount = req.query.count === 'true';

    // Get total count if requested
    let total = 0;
    if (includeCount) {
      total = await db.collection('screenshots').countDocuments({ date });
    }

    // Get screenshots for the specified date, sorted by timestamp
    const query = db.collection('screenshots')
      .find({ date })
      .sort({ timestamp: 1 });

    // Apply skip if specified
    if (skip > 0) {
      query.skip(skip);
    }

    // Apply limit if specified
    if (limit > 0) {
      query.limit(limit);
    }

    const screenshots = await query.toArray();

    // Format the response to include formatted time
    const formattedScreenshots = screenshots.map(screenshot => {
      const result = {
        id: screenshot._id,
        timestamp: screenshot.timestamp,
        time: moment(screenshot.timestamp).format('HH:mm:ss')
      };

      // Only include image data if requested
      if (includeImages) {
        result.image = screenshot.image;
      }

      return result;
    });

    // Return with pagination metadata if count was requested
    if (includeCount) {
      res.json({
        total,
        page: Math.floor(skip / limit) + 1,
        pageSize: limit,
        data: formattedScreenshots
      });
    } else {
      res.json(formattedScreenshots);
    }
  } catch (error) {
    console.error('Error fetching screenshots:', error);
    res.status(500).json({ error: 'Failed to fetch screenshots' });
  }
});

/**
 * GET /api/screenshots/:date/:id
 * Returns a specific screenshot by ID
 */
app.get('/api/screenshots/:date/:id', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const { id } = req.params;

    // Get the specific screenshot by ID
    const screenshot = await db.collection('screenshots')
      .findOne({ _id: new ObjectId(id) });

    if (!screenshot) {
      return res.status(404).json({ error: 'Screenshot not found' });
    }

    res.json({
      id: screenshot._id,
      timestamp: screenshot.timestamp,
      time: moment(screenshot.timestamp).format('HH:mm:ss'),
      image: screenshot.image
    });
  } catch (error) {
    console.error('Error fetching screenshot:', error);
    res.status(500).json({ error: 'Failed to fetch screenshot' });
  }
});

/**
 * GET /api/keylogs/:date
 * Returns keyboard activity for a specific date with pagination
 */
app.get('/api/keylogs/:date', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const { date } = req.params;
    const limit = parseInt(req.query.limit) || 100; // Default to 100 entries
    const skip = parseInt(req.query.skip) || 0;

    // Get total count for pagination
    const total = await db.collection('keylogs')
      .countDocuments({ date });

    // Get keylogs for the specified date with pagination, sorted by timestamp
    const keylogs = await db.collection('keylogs')
      .find({ date })
      .sort({ timestamp: 1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Format the response to include formatted time
    const formattedKeylogs = keylogs.map(keylog => ({
      id: keylog._id,
      timestamp: keylog.timestamp,
      time: moment(keylog.timestamp).format('HH:mm:ss'),
      key: keylog.key,
      state: keylog.state
    }));

    // Return with pagination metadata
    res.json({
      total,
      page: Math.floor(skip / limit) + 1,
      pageSize: limit,
      data: formattedKeylogs
    });
  } catch (error) {
    console.error('Error fetching keylogs:', error);
    res.status(500).json({ error: 'Failed to fetch keylogs' });
  }
});

/**
 * GET /api/mouse/:date
 * Returns mouse activity for a specific date with sampling to reduce data size
 */
app.get('/api/mouse/:date', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const { date } = req.params;
    const sampleSize = parseInt(req.query.sample) || 100; // Default sample size

    // Get total count
    const total = await db.collection('mouse_activity').countDocuments({ date });

    // Get mouse activity data with appropriate sampling
    let mouseActivity;
    let samplingInterval = 1;

    if (total <= sampleSize) {
      // If we have fewer documents than the sample size, just return all of them
      mouseActivity = await db.collection('mouse_activity')
        .find({ date })
        .sort({ timestamp: 1 })
        .toArray();
    } else {
      // For larger datasets, use sampling
      samplingInterval = Math.max(1, Math.floor(total / sampleSize));

      // Get all documents and sample manually
      const allMouseActivity = await db.collection('mouse_activity')
        .find({ date })
        .sort({ timestamp: 1 })
        .toArray();

      // Sample every Nth document
      mouseActivity = [];
      for (let i = 0; i < allMouseActivity.length; i += samplingInterval) {
        mouseActivity.push(allMouseActivity[i]);
        if (mouseActivity.length >= sampleSize) break;
      }
    }

    // Format the response to include formatted time
    const formattedMouseActivity = mouseActivity.map(activity => ({
      id: activity._id,
      timestamp: activity.timestamp,
      time: moment(activity.timestamp).format('HH:mm:ss'),
      x: activity.x,
      y: activity.y
    }));

    // Return with metadata
    res.json({
      total,
      sampled: formattedMouseActivity.length,
      samplingInterval,
      data: formattedMouseActivity
    });
  } catch (error) {
    console.error('Error fetching mouse activity:', error);
    res.status(500).json({ error: 'Failed to fetch mouse activity' });
  }
});

/**
 * GET /api/summary/:date
 * Returns a summary of activity for a specific date
 */
app.get('/api/summary/:date', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const { date } = req.params;

    // Count items in each collection for the specified date
    const screenshotCount = await db.collection('screenshots').countDocuments({ date });
    const keystrokeCount = await db.collection('keylogs').countDocuments({ date });
    const mouseMovementCount = await db.collection('mouse_activity').countDocuments({ date });

    // Get first and last activity timestamps to calculate duration
    const firstActivity = await db.collection('keylogs')
      .find({ date })
      .sort({ timestamp: 1 })
      .limit(1)
      .toArray();

    const lastActivity = await db.collection('keylogs')
      .find({ date })
      .sort({ timestamp: -1 })
      .limit(1)
      .toArray();

    // Extract timestamps or set to null if no activity
    const startTime = firstActivity.length > 0 ? firstActivity[0].timestamp : null;
    const endTime = lastActivity.length > 0 ? lastActivity[0].timestamp : null;

    // Calculate active duration if both start and end times exist
    let activeDuration = null;
    if (startTime && endTime) {
      activeDuration = moment.duration(moment(endTime).diff(moment(startTime))).asHours();
    }

    // Return the summary
    res.json({
      date,
      screenshotCount,
      keystrokeCount,
      mouseMovementCount,
      startTime,
      endTime,
      activeDuration
    });
  } catch (error) {
    console.error('Error fetching activity summary:', error);
    res.status(500).json({ error: 'Failed to fetch activity summary' });
  }
});

/**
 * Catch-all route to serve the main HTML file
 * This ensures that all routes not handled by the API are directed to the frontend
 */
app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * Start the server and connect to MongoDB
 */
app.listen(PORT, async () => {
  // Try to connect to MongoDB
  const connected = await connectToMongoDB();

  if (connected) {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`✅ Connected to MongoDB at ${mongoUri}/${dbName}`);
    console.log(`✅ Web dashboard available at http://localhost:${PORT}`);
  } else {
    console.error('⚠️ Server running but failed to connect to MongoDB');
    console.error('⚠️ Check your MongoDB connection settings');
    console.log(`✅ Server running on port ${PORT} (limited functionality)`);
  }
});
