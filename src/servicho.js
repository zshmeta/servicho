#!/usr/bin/env node

import http from 'http';
import fs from 'fs';
import path from 'path';
import{ glob } from 'glob';
import { WebSocketServer } from 'ws';
import chokidar from 'chokidar';
import chalk from 'chalk';
import { findAvailablePorts } from './config.js';
import setupFileWatcher from './setupFileWatcher.js';
import os from 'os';



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

    // Setup file watcher and paths
    setupFileWatcher(watchDirectory, wss);
    




const requestHandler = async function (req, res) {
     const servedFile = req.url === '/' ? '/index.html' : req.url;
    const fullPath = path.join(watchDirectory, servedFile);

    try {
        // Attempt to serve HTML file if it exists.
        if (servedFile.endsWith('.html') && await serveStaticPageIfExists(fullPath, res, process.cwd())) {
            return;
        } else if ((servedFile.endsWith('.jsx') || servedFile.endsWith('.js') && await serveReactComponentPreview(fullPath, res, process.cwd))){

            return;
        }
    } catch (err) {
        console.error(err);
        res.writeHead(500).end('Internal Server Error');
        return;
    }

    // If no matching servedFile is found, send a 404 response.
    res.writeHead(404).end('Not Found');
};



/** Use classic server-logic to serve a static file (e.g. default to 'index.html' etc)
 * @param {string} servedFile
 * @param {http.ServerResponse} res
 * @param {string} watchDirectory
 * @returns {Promise<boolean>} Whether or not the page exists and was served
 */


async function serveStaticPageIfExists(fullPath, res, watchDirectory) {
  try {

    // Check if the file exists.
    const fileExists = await fs.promises
      .access(fullPath, fs.constants.F_OK)
      .then(() => true)
      .catch(() => false);
    if (fileExists) {
            const stats = await fs.promises.stat(fullPath);
            if (stats.isDirectory()) {
                // Recursively serve 'index.html' if the servedFile is a directory.
                const indexPath = path.join(fullPath, 'index.html');
                return serveStaticPageIfExists('/index.html', res, fullPath);
            } else if (stats.isFile()) {
                res.writeHead(200, {'Content-Type': 'text/html'}); // Ensure correct content type.
                let fileContent = await fs.promises.readFile(fullPath, 'utf8');
                if (fullPath.endsWith('.html')) {
                    // Inject the WebSocket client code only for HTML files.
                    fileContent += `\n<script>${CLIENT_WEBSOCKET_CODE}</script>`;
                }
                res.end(fileContent);
                return true;
            }
        }
    } catch (err) {
        console.error(err);
        res.writeHead(500).end('Internal Server Error');
    }

    // If the file doesn't exist or any other error occurs, return false.
    return false;
}

/** Serve React component preview
 * @param {string} componentPath
 * @param {http.ServerResponse} res
 */


function serveReactComponentPreview(fullPath, res, watchDirectory) {
  // check if the file can be rendered


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
  const hostname = os.hostname();
  const networkInterfaces = os.networkInterfaces();
  // Get the IP address
  console.log(chalk.green(`Serving files from ${watchDirectory}`));
  for (let netInterface of Object.values(networkInterfaces)) {
    for (let networkInterface of netInterface) {
      if (!networkInterface.internal && networkInterface.family === 'IPv4') {
        console.log(chalk.green(`Served on  ${networkInterface.address}: ${HTTP_PORT}`));        
      }
    }
  }
  console.log(chalk.green(`available on: http://${hostname:HTTP_PORT}`));
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