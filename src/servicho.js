#! /usr/bin/env node

// Import required modules
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const chokidar = require('chokidar');

// Set the HTTP and WebSocket ports
const HTTP_PORT = 13000;
const WEBSOCKET_PORT = 13001;
const config = require('./config.json');

module.exports = function servicho() {

// Read the client-side WebSocket code from file
const CLIENT_WEBSOCKET_CODE = fs.readFileSync(
  path.join(__dirname, 'websocket-client.js'),
  'utf8',
);

// Websocket server (for allowing browser and dev server to have 2-way communication)
// We don't even need to do anything except create the instance!
// Create the WebSocket server
const wss = new WebSocket.Server({ port: WEBSOCKET_PORT });

// Watch for file changes in the 'public' folder
const watcher = require('./file-watcher.js')(config.watchDirectory, wss);

// Create the request handler
const requestHandler = async function (req, res) {
  const method = req.method.toLowerCase();
  if (method === 'get') {
    const route = req.url;
    if (isReactComponent(route)) {
      // Serve React component preview
      serveReactComponentPreview(route, res);
      return;
    }
    try {
      // Serve static files (including HTML files)
      if (await serveStaticPageIfExists(route, res, process.cwd())) {
        return;
      }
    } catch (err) {
      console.error(err);
      res.writeHead(500);
      res.end();
      return;
    }
  }
  // If no matching route is found, send a 404 response.
  res.writeHead(404);
  res.end();
};

/** Use classic server-logic to serve a static file (e.g. default to 'index.html' etc)
 * @param {string} route
 * @param {http.ServerResponse} res
 * @param {string} folderPath
 * @returns {Promise<boolean>} Whether or not the page exists and was served
 */
async function serveStaticPageIfExists(route, res, folderPath) {
  try {
    // Get the full path for the file or directory at the specified route.
    const fullPath = path.join(folderPath, '.' + route);
    // Check if the file exists.
    const fileExists = await fs.promises
      .access(fullPath, fs.constants.F_OK)
      .then(() => true)
      .catch(() => false);
    if (fileExists) {
      // Get the stats for the file or directory.
      const stats = await fs.promises.stat(fullPath);
      if (stats.isDirectory()) {
        // If the route is a directory, serve up the 'index.html' file.
        return await serveStaticPageIfExists(
          path.join(route, 'index.html'),
          res,
          folderPath
        );
      } else if (stats.isFile()) {
        // If the route is a file, read the file and serve it up.
        res.writeHead(200);
        let file = await fs.promises.readFile(fullPath);
        if (route.endsWith('.html')) {
          // If the file is an HTML file, inject the client-side WebSocket code.
          file = `${file.toString()}\n\n<script>${CLIENT_WEBSOCKET_CODE}</script>`;
        }
        res.end(file);
        return true;
      }
    }
  } catch (err) {
    console.error(err);
  }
  // If the file doesn't exist or any other error occurs, return false.
  return false;
}

/** Determine if the route is for a React component
 * @param {string} route
 * @returns {boolean}
 */
function isReactComponent(route) {
  return route.endsWith('.js') || route.endsWith('.jsx');
}

/** Serve React component preview
 * @param {string} componentPath
 * @param {http.ServerResponse} res
 */
function serveReactComponentPreview(componentPath, res) {
  const previewHtmlPath = './app';
  let previewHtml = fs.readFileSync(previewHtmlPath, 'utf8');
  previewHtml = previewHtml.replace('/*REACT_COMPONENT_PATH*/', JSON.stringify(componentPath));
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(previewHtml);
}

// Create an HTTP server instance and start listening on the HTTP port
const server = http.createServer(requestHandler);
server.listen(HTTP_PORT, () => {
  console.log(`Server running on http://localhost:${HTTP_PORT}`);
});

// Handle server errors
server.on('error', (err) => {
  console.error(err);
  console.log('Error occurred');
});

watcher.on('change', (filePath) => {
  console.log(`File '${filePath}' modified. Refreshing page...`);
  wss.clients.forEach((client) => {
    client.send('refresh');
  });
});

watcher.on('error', (error) => {
  console.error('Error occurred while watching files:', error);
});
}