import type { ErrorRequestHandler, Response } from 'express';

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function sendApiError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown,
) {
  const body: ApiErrorBody = {
    error: {
      code,
      message,
    },
  };

  if (details !== undefined) {
    body.error.details = details;
  }

  return res.status(statusCode).json(body);
}

export const apiErrorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ApiError) {
    sendApiError(res, error.statusCode, error.code, error.message, error.details);
    return;
  }

  console.error(error);
  sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', 'Something went wrong.');
};
