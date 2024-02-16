#!/usr/bin/env node

import http from 'http';
import fs from 'fs';
import path from 'path';
import { WebSocketServer } from 'ws';
import chokidar from 'chokidar';
import chalk from 'chalk';
import { findAvailablePorts } from './config.js';
import setupFileWatcher from './setupFileWatcher.js';



async function servicho() {
  const { HTTP_PORT, WEBSOCKET_PORT } = await findAvailablePorts();
  const watchDirectory = process.argv[2] || process.cwd();


const CLIENT_WEBSOCKET_CODE = `
  (function() {
    const socket = new WebSocket('ws://localhost:${WEBSOCKET_PORT}');
    socket.onmessage = function(event) {
      if (event.data === 'refresh') {
        window.location.reload();
      }
    };
  })();
`;

   // Setup WebSocket server
    const wss = new WebSocketServer({ port: WEBSOCKET_PORT });

    // Setup file watcher
    setupFileWatcher(watchDirectory, wss);


const requestHandler = async function (req, res) {
    const route = req.url;
    const fullPath = path.join(process.cwd(), route);

    try {
        // Attempt to serve HTML file if it exists.
        if (route.endsWith('.html') && await serveStaticPageIfExists(route, res, process.cwd())) {
            return;
        } else if (isReactComponent(route)) {
            // Serve React component preview if the request is for a JSX/JS file
            serveReactComponentPreview(fullPath, res, WEBSOCKET_PORT);
            return;
        }
    } catch (err) {
        console.error(err);
        res.writeHead(500).end('Internal Server Error');
        return;
    }

    // If no matching route is found, send a 404 response.
    res.writeHead(404).end('Not Found');
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
  // Convert server file path to web-accessible path
  const webPath = componentPath.replace(process.cwd(), '').replace(/\\/g, '/');
  const scriptSrc = `${webPath.startsWith('/') ? '' : '/'}${webPath}`;

  const previewHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Component Preview</title>
</head>
<body>
    <div id="root"></div>
    <script type="module">
      import React from 'react';
      import ReactDOM from 'react-dom';
      import Component from '${scriptSrc}';
      ReactDOM.render(React.createElement(Component, null), document.getElementById('root'));
    </script>
</body>
</html>
  `;

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(previewHtml);
}


// Create an HTTP server instance and start listening on the HTTP port
const server = http.createServer(requestHandler);
server.listen(HTTP_PORT, () => {
  console.log(chalk.green(`Server is listening on http://localhost:${HTTP_PORT}`));
  console.log(chalk.green(`WebSocket server is listening on ws://localhost:${WEBSOCKET_PORT}`));
  console.log(chalk.green(`Watching directory: ${watchDirectory}`));
  console.log(chalk.green('Press Ctrl+C to stop the server'));
});

// Handle server errors
server.on('error', (err) => {
  console.error(err);
  process.exit(1);
  console.log(chalk.red('Server error:', err)); 
});

setupFileWatcher('change', (filePath) => {
  console.log(chalk.green(`File ${filePath} has been changed`));
  wss.clients.forEach((client) => {
    client.send('refresh');
  });
});

setupFileWatcher('error', (error) => {
  console.log(chalk.red('Watcher error:', error));
  process.exit(1);
});
}


export default servicho;