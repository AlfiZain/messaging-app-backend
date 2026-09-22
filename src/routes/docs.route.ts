import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';

import { generateOpenApiDocument } from '../docs/openapi.js';

export const docsRouter = Router();

const openApiDocument = generateOpenApiDocument();

docsRouter.get('/openapi.json', (_req, res) => {
  res.json(openApiDocument);
});
docsRouter.use('/', swaggerUi.serve, swaggerUi.setup(openApiDocument));
