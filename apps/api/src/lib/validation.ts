import type { FastifyReply, FastifyRequest } from "fastify";
import type { ZodSchema } from "zod";
import { ZodError } from "zod";

/**
 * Validation error response structure
 */
interface ValidationErrorResponse {
  error: {
    code: "validationError";
    message: string;
    details: Array<{
      field: string;
      message: string;
    }>;
    requestId: string;
  };
}

/**
 * Validate request body against a Zod schema
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (request: FastifyRequest, reply: FastifyReply): void => {
    try {
      request.body = schema.parse(request.body);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError: ValidationErrorResponse = {
          error: {
            code: "validationError",
            message: "Invalid request body",
            details: error.issues.map((err) => ({
              field: err.path.join("."),
              message: err.message,
            })),
            requestId: request.id,
          },
        };
        reply.status(400).send(validationError);
      } else {
        reply.status(500).send({
          error: {
            code: "internalError",
            message: "Validation failed",
            requestId: request.id,
          },
        });
      }
    }
  };
}

/**
 * Validate request query parameters against a Zod schema
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (request: FastifyRequest, reply: FastifyReply): void => {
    try {
      request.query = schema.parse(request.query);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError: ValidationErrorResponse = {
          error: {
            code: "validationError",
            message: "Invalid query parameters",
            details: error.issues.map((err) => ({
              field: err.path.join("."),
              message: err.message,
            })),
            requestId: request.id,
          },
        };
        reply.status(400).send(validationError);
      } else {
        reply.status(500).send({
          error: {
            code: "internalError",
            message: "Validation failed",
            requestId: request.id,
          },
        });
      }
    }
  };
}

/**
 * Validate request path parameters against a Zod schema
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (request: FastifyRequest, reply: FastifyReply): void => {
    try {
      request.params = schema.parse(request.params);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError: ValidationErrorResponse = {
          error: {
            code: "validationError",
            message: "Invalid path parameters",
            details: error.issues.map((err) => ({
              field: err.path.join("."),
              message: err.message,
            })),
            requestId: request.id,
          },
        };
        reply.status(400).send(validationError);
      } else {
        reply.status(500).send({
          error: {
            code: "internalError",
            message: "Validation failed",
            requestId: request.id,
          },
        });
      }
    }
  };
}
