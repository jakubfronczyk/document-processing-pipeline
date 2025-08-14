import { InvoiceMetadata } from './metadata.service';

export type ValidationResult = {
  isValid: boolean;
  errors: string[];
};

export const validateDocument = (
  metadata: InvoiceMetadata
): ValidationResult => {
  const errors = [];

  if (!metadata.invoiceNumber) errors.push('Missing invoice number');
  if (!metadata.customer) errors.push('Missing customer');
  if (!metadata.amount || metadata.amount <= 0) errors.push('Invalid amount');

  return {
    isValid: errors.length === 0,
    errors,
  };
};
