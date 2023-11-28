## Servicho

    dev-server.js:
        This file sets up an HTTP server that serves static files from a local folder.
        It listens on port 8089 and handles GET requests.
        If the requested file exists, it is served with the option to inject client-side WebSocket code if it's an HTML file.
        If the file or directory doesn't exist, a 404 response is sent.

    client-websocket.js:
        This file sets up a WebSocket client connection to ws://localhost:8090.
        If the WebSocket connection is closed, it attempts to reconnect until it succeeds or exceeds the maximum number of attempts.
        Once a reconnection is established, it reloads the webpage using location.reload().

    