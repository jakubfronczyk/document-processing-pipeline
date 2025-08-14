import { Request, Response } from 'express';
import { DocumentStatus } from '@prisma/client';
import { prisma } from '../config/database.config';
import { addProcessingJob, documentQueue } from '../services/queue.service';

export const uploadDocument = async (req: Request, res: Response) => {
  try {
    const { text, filename = 'document.txt' } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text content is required' });
    }

    const document = await prisma.document.create({
      data: {
        filename,
        status: DocumentStatus.UPLOADED,
      },
    });

    await addProcessingJob(documentQueue, document.id, text);

    console.log(`[UPLOAD] Document ${document.id} queued for processing`);

    res.json({
      documentId: document.id,
      status: document.status,
      message: 'Document uploaded and queued for processing',
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDocumentStatus = async (req: Request, res: Response) => {
  try {
    const document = await prisma.document.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(document);
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllDocuments = async (req: Request, res: Response) => {
  try {
    const documents = await prisma.document.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    res.json(documents);
  } catch (error) {
    console.error('Documents list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
