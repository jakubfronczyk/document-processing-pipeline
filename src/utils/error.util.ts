export interface ErrorWithStatus extends Error {
  statusCode: number;
}

export const throwError = (
  message: string,
  statusCode: number = 500
): never => {
  const error = new Error(message) as ErrorWithStatus;
  error.statusCode = statusCode;
  throw error;
};

export const throwNotFound = (message: string): never =>
  throwError(message, 404);
export const throwBadRequest = (message: string): never =>
  throwError(message, 400);
export const throwServerError = (message: string): never =>
  throwError(message, 500);
