import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.config';
import { logger } from '../utils/logger.util';

export const getHealth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    logger.info('[HEALTH] Health check requested');
    const documentCount = await prisma.document.count();
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      documentsProcessed: documentCount,
    });
  } catch (error) {
    next(error);
  }
};
