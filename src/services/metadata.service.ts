export type InvoiceMetadata = {
  invoiceNumber: string | null;
  customer: string | null;
  amount: number;
};

export const extractMetadata = (text: string): InvoiceMetadata => {
  return {
    invoiceNumber: text.match(/Invoice #(\S+)/)?.[1] || null,
    customer: text.match(/Customer: ([^\n]+)/)?.[1] || null,
    amount: parseFloat(text.match(/Amount: \$([0-9.]+)/)?.[1] || '0'),
  };
};
