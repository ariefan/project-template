export class AppError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode = 500) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      "notFound",
      id ? `${resource} with id '${id}' not found` : `${resource} not found`,
      404
    );
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super("conflict", message, 409);
    this.name = "ConflictError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super("forbidden", message, 403);
    this.name = "ForbiddenError";
  }
}

export class ValidationError extends AppError {
  details?: Array<{ field: string; code: string; message: string }>;

  constructor(
    message: string,
    details?: Array<{ field: string; code: string; message: string }>
  ) {
    super("validationError", message, 400);
    this.details = details;
    this.name = "ValidationError";
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super("badRequest", message, 400);
    this.name = "BadRequestError";
  }
}

export interface ErrorResult {
  statusCode: number;
  response: {
    error: {
      code: string;
      message: string;
      details?: Array<{ field: string; code: string; message: string }>;
      requestId: string;
    };
  };
}

export function handleError(error: unknown, requestId: string): ErrorResult {
  if (error instanceof ValidationError) {
    return {
      statusCode: error.statusCode,
      response: {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          requestId,
        },
      },
    };
  }

  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      response: {
        error: {
          code: error.code,
          message: error.message,
          requestId,
        },
      },
    };
  }

  console.error("Unhandled error:", error);
  return {
    statusCode: 500,
    response: {
      error: {
        code: "internalError",
        message: "An unexpected error occurred",
        requestId,
      },
    },
  };
}
