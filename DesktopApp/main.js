/**
 * Activity Logger - Electron Main Process
 *
 * This application runs in the background to track user activity:
 * 1. Takes screenshots at random intervals (configurable)
 * 2. Logs keyboard activity (key presses and releases)
 * 3. Tracks mouse movements
 * 4. Stores all collected data in MongoDB
 *
 * The application provides a minimal UI and system tray integration
 * for user interaction, with a web dashboard for data visualization.
 *
 * The app continues running in the background when the main window is closed,
 * and can only be fully exited through the tray icon or application menu.
 */

//-----------------------------------------------------------------------------
// Module Imports
//-----------------------------------------------------------------------------
// Electron modules
const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  ipcMain,
  screen,
  Notification,
  dialog
} = require('electron');

// Node.js modules
const path = require('path');
const fs = require('fs');

// Set up logging to file
const logFile = path.join(__dirname, 'app.log');
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Override console.log to also write to file
console.log = function() {
  const args = Array.from(arguments);
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
  fs.appendFileSync(logFile, `[LOG] ${new Date().toISOString()} - ${message}\n`);
  originalConsoleLog.apply(console, arguments);
};

// Override console.error to also write to file
console.error = function() {
  const args = Array.from(arguments);
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
  fs.appendFileSync(logFile, `[ERROR] ${new Date().toISOString()} - ${message}\n`);
  originalConsoleError.apply(console, arguments);
};

// Override console.warn to also write to file
console.warn = function() {
  const args = Array.from(arguments);
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
  fs.appendFileSync(logFile, `[WARN] ${new Date().toISOString()} - ${message}\n`);
  originalConsoleWarn.apply(console, arguments);
};

// Third-party modules
const { MongoClient } = require('mongodb');
const moment = require('moment');
const screenshot = require('screenshot-desktop');
const { GlobalKeyboardListener } = require('node-global-key-listener');

//-----------------------------------------------------------------------------
// Application Settings
//-----------------------------------------------------------------------------
/**
 * Application configuration settings
 * These can be modified through the settings UI
 */
const settings = {
  // Screenshot capture interval in minutes
  screenshotInterval: {
    min: 5,  // Minimum interval between screenshots
    max: 10  // Maximum interval between screenshots
  },

  // MongoDB connection settings
  mongoUri: 'mongodb://localhost:27017',
  dbName: 'activity_logger'
};

//-----------------------------------------------------------------------------
// Global Variables
//-----------------------------------------------------------------------------
/**
 * UI Elements
 */
let mainWindow = null; // Main application window
let tray = null;       // System tray icon

/**
 * Application State
 */
let isQuitting = false;    // Flag to indicate if app is quitting
let screenshotTimer = null; // Timer for screenshot capture
let isLoggedIn = false;    // Flag to indicate if user is logged in

/**
 * Database Connection
 */
let mongoClient = null; // MongoDB client connection
let db = null;          // Database reference

/**
 * Input Tracking
 */
let keyboardListener = null;     // Keyboard event listener
let mousePositions = [];         // Buffer for mouse positions
let mouseTrackingInterval = null; // Interval for mouse tracking
let lastMousePosition = { x: 0, y: 0 }; // Last recorded mouse position
let lastMouseCheckTime = Date.now();    // Timestamp of last mouse check

//-----------------------------------------------------------------------------
// Database Functions
//-----------------------------------------------------------------------------
/**
 * Connects to MongoDB using the configured connection settings
 *
 * Creates a new MongoDB client, establishes a connection, and
 * gets a reference to the specified database.
 *
 * @returns {Promise<boolean>} True if connection successful, false otherwise
 */
async function connectToMongoDB() {
  try {
    const uri = settings.mongoUri;
    const dbName = settings.dbName;

    // Create a new MongoDB client and connect
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
    console.log('Connected to MongoDB');

    // Get reference to the database
    db = mongoClient.db(dbName);
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return false;
  }
}

//-----------------------------------------------------------------------------
// UI Functions
//-----------------------------------------------------------------------------
/**
 * Creates the main application window
 *
 * Sets up the window properties, loads the HTML file,
 * and configures the close behavior to hide instead of quit
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load the main UI
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Hide instead of close when the X button is clicked
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();

      // Show notification that app is still running in the background
      if (tray) {
        new Notification({
          title: 'Activity Logger',
          body: 'Application is still running in the background. Use the tray icon to quit.'
        }).show();
      }
      return false;
    }
  });
}

/**
 * Creates the application menu
 *
 * Sets up the menu with options to show the window,
 * open the dashboard, and quit the application
 */
function createAppMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Show', click: () => mainWindow.show() },
        { type: 'separator' },
        { label: 'Open Dashboard', click: () => openWebDashboard() },
        { type: 'separator' },
        {
          label: 'Exit Application',
          click: () => showExitConfirmation(mainWindow)
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Activity Logger',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Activity Logger',
              message: 'Activity Logger v1.0.0',
              detail: 'This application tracks your activity by taking screenshots and logging keyboard/mouse activity.\n\nThe application will continue to run in the background when closed. To exit completely, use the "Exit" option from the tray menu or File menu.'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Shows exit confirmation dialog
 *
 * @param {BrowserWindow} [parentWindow] - Optional parent window for the dialog
 */
function showExitConfirmation(parentWindow) {
  const dialogOptions = {
    type: 'question',
    buttons: ['Yes', 'No'],
    defaultId: 1,
    title: 'Confirm Exit',
    message: 'Are you sure you want to exit the application?',
    detail: 'The application will stop tracking activity when closed.'
  };

  const dialogPromise = parentWindow
    ? dialog.showMessageBox(parentWindow, dialogOptions)
    : dialog.showMessageBox(dialogOptions);

  dialogPromise.then(result => {
    if (result.response === 0) { // Yes
      isQuitting = true;
      app.quit();
    }
  });
}

/**
 * Creates the system tray icon and context menu
 *
 * Loads the icon from the assets directory and sets up
 * the context menu with options to show the window,
 * open the dashboard, and quit the application
 */
function createTrayIcon() {
  try {
    // Path to the icon file
    const iconPath = path.join(__dirname, 'assets', 'icon.ico');

    // Check if the icon file exists
    if (!fs.existsSync(iconPath)) {
      console.error('Icon file not found:', iconPath);
      return;
    }

    // Create the tray with the icon
    tray = new Tray(iconPath);

    // Create context menu
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show App', click: () => mainWindow.show() },
      { label: 'Open Dashboard', click: () => openWebDashboard() },
      { type: 'separator' },
      {
        label: 'Exit Application',
        click: () => showExitConfirmation()
      }
    ]);

    // Set tray properties
    tray.setToolTip('Activity Logger - Running in background');
    tray.setContextMenu(contextMenu);

    // Show window on tray icon click
    tray.on('click', () => mainWindow.show());

    // Show balloon notification on first creation to inform user
    if (process.platform === 'win32') {
      tray.displayBalloon({
        title: 'Activity Logger',
        content: 'Application is running in the background. Click the tray icon to access options.',
        iconType: 'info'
      });
    }

    console.log('Tray icon created successfully');
  } catch (error) {
    console.error('Error creating tray icon:', error);
  }
}

/**
 * Opens the web dashboard in a new window
 *
 * Creates a new browser window and loads the dashboard URL
 */
function openWebDashboard() {
  const dashboardWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    title: 'Activity Logger Dashboard',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load the dashboard URL
  dashboardWindow.loadURL('http://localhost:3000');
  dashboardWindow.show();
}

//-----------------------------------------------------------------------------
// Activity Tracking Functions
//-----------------------------------------------------------------------------
/**
 * Takes a screenshot and saves it to MongoDB
 *
 * After saving, schedules the next screenshot at a random interval
 * between the configured min and max minutes
 */
async function takeScreenshot() {
  try {
    if (!db) {
      console.warn('Cannot take screenshot: No database connection');
      return;
    }

    if (!isLoggedIn) {
      console.warn('Cannot take screenshot: User not logged in');
      return;
    }

    // Capture screenshot and convert to base64 for storage
    const screenshotBuffer = await screenshot();
    const base64Image = screenshotBuffer.toString('base64');

    // Save to MongoDB with timestamp and date
    const collection = db.collection('screenshots');
    await collection.insertOne({
      timestamp: new Date(),
      date: moment().format('YYYY-MM-DD'),
      image: base64Image
    });

    console.log('Screenshot saved to MongoDB');

    // Schedule next screenshot at random interval
    scheduleNextScreenshot();
  } catch (error) {
    console.error('Error taking screenshot:', error);
    // Retry after 1 minute on error
    screenshotTimer = setTimeout(takeScreenshot, 60 * 1000);
  }
}

/**
 * Schedules the next screenshot at a random interval
 */
function scheduleNextScreenshot() {
  const { min, max } = settings.screenshotInterval;
  const randomMinutes = Math.floor(Math.random() * (max - min + 1)) + min;
  console.log(`Next screenshot in ${randomMinutes} minutes`);

  screenshotTimer = setTimeout(takeScreenshot, randomMinutes * 60 * 1000);
}

/**
 * Starts keyboard activity logging
 *
 * Initializes the keyboard listener and starts tracking
 * mouse position as well
 */
function startKeyboardLogging() {
  if (keyboardListener) {
    console.log('Keyboard logging already active');
    return; // Prevent multiple listeners
  }

  if (!isLoggedIn) {
    console.warn('Cannot start keyboard logging: User not logged in');
    return;
  }

  console.log('Starting keyboard logging');

  // Initialize keyboard listener
  keyboardListener = new GlobalKeyboardListener();

  // Add event handler for key presses
  keyboardListener.addListener(function(e) {
    if (!db) return;
    if (!isLoggedIn) return;

    // Create key event document
    const keyEvent = {
      timestamp: new Date(),
      date: moment().format('YYYY-MM-DD'),
      key: e.name,
      state: e.state // DOWN or UP
    };

    // Save to MongoDB
    db.collection('keylogs').insertOne(keyEvent)
      .catch(err => console.error('Error logging key event:', err));
  });

  // Also start mouse position tracking
  trackMousePosition();
}

/**
 * Tracks mouse position using Electron's screen module
 *
 * Polls the cursor position every 100ms and records changes
 * Batches mouse positions and saves them to MongoDB
 */
function trackMousePosition() {
  // Prevent multiple intervals from being created
  if (mouseTrackingInterval !== null) {
    console.log('Mouse tracking already active');
    return;
  }

  if (!isLoggedIn) {
    console.warn('Cannot start mouse tracking: User not logged in');
    return;
  }

  console.log('Starting mouse position tracking');

  mouseTrackingInterval = setInterval(() => {
    // Skip tracking if not logged in
    if (!isLoggedIn) return;

    // Get cursor position from the screen module
    const cursorPoint = screen.getCursorScreenPoint();
    const mousePos = { x: cursorPoint.x, y: cursorPoint.y };
    const currentTime = Date.now();

    // Only log if position changed and at least 100ms passed
    // This prevents excessive logging of tiny movements
    if (hasMouseMoved(mousePos, currentTime)) {
      // Update last position and time
      lastMousePosition = { x: mousePos.x, y: mousePos.y };
      lastMouseCheckTime = currentTime;

      // Add to positions array
      mousePositions.push({
        timestamp: new Date(),
        x: mousePos.x,
        y: mousePos.y
      });

      // Save batch of mouse positions every 50 positions
      // This reduces database writes
      if (mousePositions.length >= 50) {
        saveMousePositions();
      }
    }
  }, 100); // Check every 100ms
}

/**
 * Checks if the mouse has moved significantly
 *
 * @param {Object} currentPos - Current mouse position {x, y}
 * @param {number} currentTime - Current timestamp
 * @returns {boolean} True if mouse has moved significantly
 */
function hasMouseMoved(currentPos, currentTime) {
  return (
    (currentPos.x !== lastMousePosition.x ||
     currentPos.y !== lastMousePosition.y) &&
    (currentTime - lastMouseCheckTime > 100)
  );
}

/**
 * Saves collected mouse positions to MongoDB
 *
 * Batches positions together to reduce database writes
 */
async function saveMousePositions() {
  if (!db || mousePositions.length === 0) return;
  if (!isLoggedIn) return;

  try {
    // Make a copy of the current positions and clear the array
    const positions = [...mousePositions];
    mousePositions = [];

    // Save to MongoDB with date added to each position
    const collection = db.collection('mouse_activity');
    await collection.insertMany(positions.map(pos => ({
      ...pos,
      date: moment(pos.timestamp).format('YYYY-MM-DD')
    })));
  } catch (error) {
    console.error('Error saving mouse positions:', error);
  }
}

//-----------------------------------------------------------------------------
// Utility Functions
//-----------------------------------------------------------------------------
/**
 * Creates required directories for the application
 *
 * Ensures the assets directory exists for storing application assets
 */
function createDirectories() {
  const assetsDir = path.join(__dirname, 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
}

/**
 * Clean up resources before exit
 *
 * This function ensures all resources are properly cleaned up
 * before the application exits
 */
function cleanupResources() {
  console.log('Cleaning up resources before exit...');

  // Clean up timers
  if (screenshotTimer) {
    clearTimeout(screenshotTimer);
    screenshotTimer = null;
  }

  // Clear mouse tracking interval
  if (mouseTrackingInterval) {
    clearInterval(mouseTrackingInterval);
    mouseTrackingInterval = null;
  }

  // Clean up keyboard listener
  if (keyboardListener) {
    try {
      keyboardListener.kill();
      keyboardListener = null;
    } catch (error) {
      console.error('Error cleaning up keyboard listener:', error);
    }
  }

  // Save any remaining mouse positions
  if (mousePositions && mousePositions.length > 0) {
    try {
      saveMousePositions();
    } catch (error) {
      console.error('Error saving mouse positions:', error);
    }
  }

  // Close database connection
  if (mongoClient) {
    try {
      mongoClient.close();
      mongoClient = null;
      db = null;
      console.log('MongoDB connection closed');
    } catch (error) {
      console.error('Error closing MongoDB connection:', error);
    }
  }
}

//-----------------------------------------------------------------------------
// Single Instance Lock
//-----------------------------------------------------------------------------
/**
 * Ensure only one instance of the application is running
 *
 * This prevents multiple instances of the app from running simultaneously,
 * which could cause conflicts with database connections and activity tracking
 */
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('Another instance is already running. Quitting...');
  app.quit();
} else {
  // This is the first instance - continue with normal startup

  // Handle second instance launch attempts
  app.on('second-instance', () => {
    // Someone tried to run a second instance, we should focus our window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  //-----------------------------------------------------------------------------
  // Application Event Handlers
  //-----------------------------------------------------------------------------
  /**
   * App is ready to start
   *
   * Initializes the application, creates the UI, connects to MongoDB,
   * and starts the activity tracking
   */
  app.on('ready', async () => {
    console.log('Application starting...');

    try {
      // Initialize the application
      console.log('Creating directories...');
      createDirectories();

      console.log('Creating main window...');
      createWindow();

      console.log('Creating application menu...');
      createAppMenu();

      console.log('Creating tray icon...');
      createTrayIcon();

      console.log('Showing main window...');
      mainWindow.show();

      // Connect to database (but don't start logging yet)
      console.log('Connecting to MongoDB...');
      const connected = await connectToMongoDB();

      if (!connected) {
        console.error('Failed to connect to MongoDB. Logging will be disabled.');
      }

      console.log('Waiting for user login...');
      console.log('Please enter credentials: user@example.com / user@123');
      // Activity tracking will start after successful login
    } catch (error) {
      console.error('Error during application startup:', error);
    }
  });

  /**
   * All windows have been closed
   *
   * Quits the application on non-macOS platforms
   */
  app.on('window-all-closed', () => {
    // On macOS, applications keep running unless Cmd+Q is pressed
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  /**
   * App is activated (macOS)
   *
   * Recreates the window if needed (macOS behavior)
   */
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  /**
   * App is about to quit
   *
   * Sets the quitting flag to allow window closing
   */
  app.on('before-quit', () => {
    isQuitting = true;
  });

  /**
   * App will quit
   *
   * Cleans up resources before exit
   */
  app.on('will-quit', cleanupResources);
}

//-----------------------------------------------------------------------------
// IPC Event Handlers
//-----------------------------------------------------------------------------
/**
 * Update application settings
 *
 * Handles settings updates from the renderer process,
 * reconnects to MongoDB, and restarts activity tracking
 *
 * @param {Object} newSettings - New settings from the renderer process
 * @param {Object} newSettings.screenshotInterval - Screenshot interval settings
 * @param {string} newSettings.mongoUri - MongoDB connection URI
 * @param {string} newSettings.dbName - MongoDB database name
 */
ipcMain.on('update-settings', async (_, newSettings) => {
  try {
    console.log('Updating application settings...');

    // Update settings object with new values
    settings.screenshotInterval = newSettings.screenshotInterval;
    settings.mongoUri = newSettings.mongoUri;
    settings.dbName = newSettings.dbName;

    // Close existing MongoDB connection if it exists
    if (mongoClient) {
      console.log('Closing existing MongoDB connection...');
      await mongoClient.close();
      mongoClient = null;
      db = null;
    }

    // Reconnect to MongoDB with new connection details
    console.log('Reconnecting to MongoDB with new settings...');
    const connected = await connectToMongoDB();

    // Restart screenshot service with new interval
    if (screenshotTimer) {
      console.log('Restarting screenshot service with new interval...');
      clearTimeout(screenshotTimer);
      if (connected) {
        takeScreenshot();
      }
    }

    // Notify renderer process that settings were updated
    if (mainWindow && !mainWindow.isDestroyed()) {
      console.log('Notifying renderer process of settings update...');
      mainWindow.webContents.send('settings-updated', {
        success: true,
        connected
      });
    }

    console.log('Settings updated successfully');
  } catch (error) {
    console.error('Error updating settings:', error);

    // Notify renderer process of the error
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('settings-updated', {
        success: false,
        error: error.message
      });
    }
  }
});

/**
 * Open web dashboard in a new window
 *
 * Handles request from the renderer process to open the web dashboard
 */
ipcMain.on('open-web-dashboard', () => {
  console.log('Opening web dashboard...');
  openWebDashboard();
});

/**
 * Handle successful login
 *
 * Starts activity tracking after successful login
 */
ipcMain.on('login-success', () => {
  console.log('========================================');
  console.log('LOGIN SUCCESS EVENT RECEIVED');
  console.log('User logged in successfully');
  console.log('========================================');
  isLoggedIn = true;

  // Show success notification
  new Notification({
    title: 'Login Successful',
    body: 'Activity tracking has started. The application will continue to run in the background when closed.'
  }).show();

  // Start activity tracking
  if (db) {
    console.log('Starting activity tracking...');
    takeScreenshot();
    startKeyboardLogging();
    console.log('Activity tracking started');
    console.log('User login successful - Application fully initialized');
  } else {
    console.error('Cannot start tracking: No database connection');
  }
});
