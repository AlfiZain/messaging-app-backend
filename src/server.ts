import { createServer } from 'node:http';
import app from './app.js';

import { initSocketServer } from './lib/socket/index.js';
import { env } from './configs/env.js';

const httpServer = createServer(app);

initSocketServer(httpServer);

httpServer.listen(env.port, () => {
  console.log(`Server running on port: ${env.port}`);
});
