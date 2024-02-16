import  WebSocketPort  from './config.js';
import { WebSocket } from 'ws';
import os from 'os';

// Get the hostname

const hostname = os.hostname();

const socketUrl = `ws://${hostname}:${WebSocketPort}`;

(function() {
    let socket = new WebSocket(socketUrl);

    const interAttemptTimeoutMilliseconds = 100;
    const maxDisconnectedTimeMilliseconds = 3000;
    const maxAttempts = Math.round(maxDisconnectedTimeMilliseconds / interAttemptTimeoutMilliseconds);

    const reloadIfCanConnect = (attempts) => {
        if (attempts > maxAttempts) {
            console.error('Could not reconnect to dev server.');
            return;
        }

        socket = new WebSocket(socketUrl);
        socket.addEventListener('error', () => {
            setTimeout(() => reloadIfCanConnect(attempts + 1), interAttemptTimeoutMilliseconds);
        });
        socket.addEventListener('open', () => {
            window.location.reload();
        });
    };

    socket.addEventListener('close', () => {
        reloadIfCanConnect(0);
    });

    socket.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
    });
})();