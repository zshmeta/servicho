/**
 * @file site/client-websocket.js
 */
(() => {
	const socketUrl = 'ws://localhost:13001';
	let socket = new WebSocket(socketUrl);

	const interAttemptTimeoutMilliseconds = 100;
	const maxDisconnectedTimeMilliseconds = 3000;
	const maxAttempts = Math.round(
		maxDisconnectedTimeMilliseconds / interAttemptTimeoutMilliseconds,
	);

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
			location.reload();
		});
	};

	socket.addEventListener('close', () => {
		// Then the server has been turned off,
		// either due to file-change-triggered reboot,
		// or to truly being turned off.

		// Attempt to re-establish a connection until it works,
		// failing after a few seconds of trying.
		reloadIfCanConnect(0);
	});

	socket.addEventListener('error', (error) => {
		console.error('WebSocket error:', error);
	});
})();
