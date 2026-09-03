import { createServer } from 'node:http';
import app from './app.js';
import { env } from 'node:process';
import { initSocketServer } from './lib/socket/index.js';

const httpServer = createServer(app);

initSocketServer(httpServer);

httpServer.listen(env.port, () => {
  console.log(`Server running on port: ${env.port}`);
});
