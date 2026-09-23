import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { openApiRegistry } from './registry.js';

import './paths/auth.path.js';
import './paths/user.path.js';
import './paths/conversation.path.js';
import './paths/message.path.js';
import { env } from '../configs/env.js';

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(openApiRegistry.definitions);

  return generator.generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'Messaging App API',
      version: '1.0.0',
      description: 'REST API for the Messaging App',
    },
    servers: [
      {
        url: 'https://messaging-app-backend-alfi.up.railway.app',
        description: 'Production server',
      },
      {
        url: `http://localhost:${env.port}`,
        description: 'Local development server',
      },
    ],
  });
}
