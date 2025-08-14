import { Request, Response, NextFunction } from 'express';
import { DocumentStatus } from '@prisma/client';
import { prisma } from '../config/database.config';
import { addProcessingJob, documentQueue } from '../services/queue.service';
import { logger } from '../utils/logger.util';
import { throwNotFound, throwBadRequest } from '../utils/error.util';

export const uploadDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { text, filename = 'document.txt' } = req.body;

    if (!text || typeof text !== 'string') {
      throwBadRequest('Text content is required');
    }

    const document = await prisma.document.create({
      data: { filename, status: DocumentStatus.UPLOADED },
    });

    await addProcessingJob(documentQueue, document.id, text);

    logger.info('[UPLOAD] Document queued successfully', {
      documentId: document.id,
      filename,
    });

    res.json({
      documentId: document.id,
      status: document.status,
      message: 'Document uploaded and queued for processing',
    });
  } catch (error) {
    next(error);
  }
};

export const getDocumentStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const documentId = req.params.id;

    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throwNotFound('Document not found');
    }

    res.json(document);
  } catch (error) {
    next(error);
  }
};

export const getAllDocuments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const documents = await prisma.document.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    res.json(documents);
  } catch (error) {
    next(error);
  }
};
