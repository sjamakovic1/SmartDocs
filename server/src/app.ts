import cors from 'cors';
import express from 'express';

import documentRouter from './routes/documentRoutes';

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
  res.status(501).json({
    message: 'Document upload endpoint is not implemented yet',
  });
});

app.use('/api/documents', documentRouter);

export default app;
