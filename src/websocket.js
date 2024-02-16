
const socketUrl = `ws://localhost:${WebSocketPort}`;

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