export type OCRResult = {
  text: string;
  confidence: number;
  language: string;
};

export const simulateOCR = (text: string): Promise<OCRResult> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        text: text,
        confidence: 0.98,
        language: 'en',
      });
    }, 500);
  });
};
