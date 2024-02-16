import os from 'os';

// Get the hostname
const hostname = os.hostname();
console.log(`Hostname: ${hostname}`);

// Get the network interfaces
const networkInterfaces = os.networkInterfaces();

// Get the IP address
for (let netInterface of Object.values(networkInterfaces)) {
  for (let networkInterface of netInterface) {
    if (!networkInterface.internal && networkInterface.family === 'IPv4') {
      console.log(`IP Address: ${networkInterface.address}`);
    }
  }
}