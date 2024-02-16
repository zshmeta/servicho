import chokidar from 'chokidar';
import WebSocket from 'ws';

function setupFileWatcher(watchDirectory, wss) {
    const watcher = chokidar.watch(watchDirectory, {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
    });

    watcher.on('change', (path) => {
        console.log(`File ${path} has been changed`);
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send('refresh');
            }
        });
    }).on('error', (error) => console.log(`Watcher error: ${error}`));

    return watcher;
}


export default setupFileWatcher;