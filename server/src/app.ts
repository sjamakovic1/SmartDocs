import cors from 'cors';
import express from 'express';
import path from 'node:path';

import documentRouter from './routes/documentRoutes';
import { apiErrorHandler, sendApiError } from './utils/apiError';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    message: 'SmartDocs API is running',
    status: 'ok',
  });
});

app.post('/api/upload', (_req, res) => {
  sendApiError(
    res,
    501,
    'UPLOAD_ENDPOINT_NOT_IMPLEMENTED',
    'Document upload endpoint is not implemented yet.',
  );
});

app.use('/api/documents', documentRouter);

if (process.env.NODE_ENV === 'production') {
  const clientDistPath = process.env.CLIENT_DIST_PATH
    ? path.resolve(process.env.CLIENT_DIST_PATH)
    : path.resolve(__dirname, '../../client/dist');

  app.use(express.static(clientDistPath));

  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      next();
      return;
    }

    res.sendFile(path.join(clientDistPath, 'index.html'), (error) => {
      if (error) {
        next(error);
      }
    });
  });
}

app.use((_req, res) => {
  sendApiError(res, 404, 'ROUTE_NOT_FOUND', 'Route not found.');
});

app.use(apiErrorHandler);

export default app;
