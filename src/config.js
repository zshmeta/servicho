import net from 'net';

async function findAvailablePorts() {
    let ports = [13001, 13002, 13003, 13004, 13005, 13006, 13007, 13008, 13009, 13010];

    async function isPortAvailable(port) {
        return new Promise((resolve) => {
            const server = net.createServer().listen(port);

            server.on('listening', () => {
                server.close();
                resolve(true);
            });

            server.on('error', () => {
                resolve(false);
            });
        });
    }

    let HTTP_PORT = ports.shift();
    while (!(await isPortAvailable(HTTP_PORT))) {
        HTTP_PORT = ports.shift();
    }

    let WEBSOCKET_PORT = ports.shift();
    while (!(await isPortAvailable(WEBSOCKET_PORT))) {
        WEBSOCKET_PORT = ports.shift();
    }

    return {
        HTTP_PORT,
        WEBSOCKET_PORT
    };
}


export default findAvailablePorts;


