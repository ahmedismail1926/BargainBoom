
const app = require('./app');
const http = require('http');
const socketIo = require('socket.io');
const socketSetup = require('./sockets');
const logger = require('./utils/logger');
const { PORT } = require('./config/env');

const server = http.createServer(app);
const io = socketIo(server);
socketSetup(io);
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
