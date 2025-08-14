const formatForDevelopment = (
  level: string,
  message: string,
  data?: Record<string, unknown>
) => {
  const timestamp = new Date().toISOString().split('T')[1]!.slice(0, -5);
  const dataStr = data ? ` ${JSON.stringify(data)}` : '';

  return `${timestamp} [${level.toUpperCase()}] ${message}${dataStr}`;
};

export const logger = {
  info: (message: string, data?: Record<string, unknown>) => {
    console.log(formatForDevelopment('info', message, data));
  },

  warn: (message: string, data?: Record<string, unknown>) => {
    console.log(formatForDevelopment('warn', message, data));
  },

  error: (message: string, data?: Record<string, unknown>) => {
    console.log(formatForDevelopment('error', message, data));
  },
};
