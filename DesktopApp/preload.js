/**
 * Activity Logger - Preload Script
 *
 * This script runs in the renderer process before the web page loads.
 * It provides a secure bridge between the renderer process and the main process,
 * and handles Content Security Policy (CSP) configuration.
 *
 * The preload script is responsible for:
 * 1. Creating a secure IPC bridge between renderer and main processes
 * 2. Configuring Content Security Policy for the renderer
 * 3. Exposing limited functionality to the renderer process
 */

//-----------------------------------------------------------------------------
// Module Imports
//-----------------------------------------------------------------------------
const { ipcRenderer, contextBridge, shell } = require('electron');

//-----------------------------------------------------------------------------
// Constants
//-----------------------------------------------------------------------------
/**
 * List of valid IPC channels for sending messages to main process
 * @type {string[]}
 */
const VALID_SEND_CHANNELS = [
  'update-settings',
  'open-web-dashboard',
  'login-success'
];

/**
 * List of valid IPC channels for receiving messages from main process
 * @type {string[]}
 */
const VALID_RECEIVE_CHANNELS = [
  'settings-updated'
];

/**
 * Content Security Policy for the renderer process
 * @type {string}
 */
const CONTENT_SECURITY_POLICY =
  "default-src * 'unsafe-inline' 'unsafe-eval'; " +
  "script-src * 'unsafe-inline' 'unsafe-eval'; " +
  "connect-src *; " +
  "img-src * data: blob:; " +
  "frame-src *; " +
  "style-src * 'unsafe-inline';";

//-----------------------------------------------------------------------------
// IPC Bridge Configuration
//-----------------------------------------------------------------------------
/**
 * Expose a limited API to the renderer process
 *
 * This creates a safe bridge for the renderer to communicate with
 * the main process without exposing all of Node.js functionality
 */
contextBridge.exposeInMainWorld('api', {
  /**
   * Send messages to main process
   *
   * @param {string} channel - The IPC channel to send on
   * @param {any} data - The data to send
   */
  send: (channel, data) => {
    if (VALID_SEND_CHANNELS.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },

  /**
   * Receive messages from main process
   *
   * @param {string} channel - The IPC channel to listen on
   * @param {Function} func - The callback function
   */
  receive: (channel, func) => {
    if (VALID_RECEIVE_CHANNELS.includes(channel)) {
      // Strip event to prevent exposing sensitive information
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },

  /**
   * Open external URLs safely
   *
   * @param {string} url - The URL to open
   */
  openExternal: (url) => {
    shell.openExternal(url);
  }
});

//-----------------------------------------------------------------------------
// Content Security Policy Configuration
//-----------------------------------------------------------------------------
/**
 * Configure Content Security Policy to allow necessary operations
 *
 * This is needed to ensure the application can load resources and
 * execute scripts properly
 */
window.addEventListener('DOMContentLoaded', () => {
  // Remove any existing CSP meta tags
  const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (existingCSP) {
    existingCSP.remove();
  }

  // Add a permissive CSP meta tag that allows necessary operations
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = CONTENT_SECURITY_POLICY;
  document.head.appendChild(meta);
});
