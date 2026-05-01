import cors from 'cors';
import express from 'express';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    message: 'SmartDocs API is running',
    status: 'ok',
  });
});

app.get('/api/documents', (_req, res) => {
  res.json({
    documents: [],
  });
});

app.post('/api/upload', (_req, res) => {
  res.status(501).json({
    message: 'Document upload endpoint is not implemented yet',
  });
});

export default app;
