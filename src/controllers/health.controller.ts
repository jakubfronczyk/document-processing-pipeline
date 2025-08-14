import { Request, Response } from 'express';
import { prisma } from '../config/database.config';

export const getHealth = async (req: Request, res: Response) => {
  try {
    const documentCount = await prisma.document.count();
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      documentsProcessed: documentCount,
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: 'Database connection failed',
    });
  }
};
