import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.util';
import { ErrorWithStatus } from '../utils/error.util';

export const errorHandler = (
  error: ErrorWithStatus,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = error.statusCode || 500;
  const message = error.message;

  logger.error('[ERROR] Request failed', {
    error: message,
    path: req.path,
    method: req.method,
    statusCode,
  });

  res.status(statusCode).json({
    error: {
      message,
      timestamp: new Date().toISOString(),
    },
  });
};
