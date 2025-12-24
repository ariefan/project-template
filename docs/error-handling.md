# Error Handling Guide

This guide documents the standard error handling patterns used across the monorepo for consistent error responses, logging, and debugging.

## Table of Contents

1. [Error Response Format](#error-response-format)
2. [HTTP Status Codes](#http-status-codes)
3. [Error Classes](#error-classes)
4. [API Error Handling](#api-error-handling)
5. [Client-Side Error Handling](#client-side-error-handling)
6. [Logging Standards](#logging-standards)
7. [Error Codes Catalog](#error-codes-catalog)

---

## Error Response Format

All API errors follow a consistent JSON structure:

```typescript
type ErrorResponse = {
  error: {
    code: string;           // Machine-readable error code
    message: string;        // Human-readable description
    details?: unknown;      // Additional context (validation errors, etc.)
    requestId?: string;     // For tracing/debugging
  };
};
```

### Examples

**Validation Error:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": {
      "fields": [
        { "field": "email", "message": "Invalid email format" },
        { "field": "password", "message": "Must be at least 8 characters" }
      ]
    },
    "requestId": "req_abc123"
  }
}
```

**Not Found:**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Post not found",
    "requestId": "req_abc123"
  }
}
```

**Authorization Error:**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You don't have permission to delete this resource",
    "requestId": "req_abc123"
  }
}
```

---

## HTTP Status Codes

| Status | Code | When to Use |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request body/params |
| 400 | `BAD_REQUEST` | Malformed request |
| 401 | `UNAUTHORIZED` | Missing or invalid auth |
| 403 | `FORBIDDEN` | Authenticated but not allowed |
| 404 | `NOT_FOUND` | Resource doesn't exist |
| 409 | `CONFLICT` | Duplicate entry, state conflict |
| 422 | `UNPROCESSABLE_ENTITY` | Valid syntax but semantic errors |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected server error |
| 503 | `SERVICE_UNAVAILABLE` | Temporary unavailability |

---

## Error Classes

### Base Error Class

```typescript
// packages/utils/src/errors.ts (or wherever you define errors)

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}
```

### Common Error Classes

```typescript
export class ValidationError extends AppError {
  constructor(message: string, details?: { fields: FieldError[] }) {
    super("VALIDATION_ERROR", message, 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} with id '${id}' not found`
      : `${resource} not found`;
    super("NOT_FOUND", message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super("UNAUTHORIZED", message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Access denied") {
    super("FORBIDDEN", message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super("CONFLICT", message, 409);
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super("RATE_LIMITED", "Too many requests", 429, { retryAfter });
  }
}
```

### Usage in Route Handlers

```typescript
// apps/api/src/routes/posts.ts
import { NotFoundError, ForbiddenError } from "@workspace/utils/errors";

app.get("/posts/:id", async (request, reply) => {
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, request.params.id),
  });

  if (!post) {
    throw new NotFoundError("Post", request.params.id);
  }

  return post;
});

app.delete("/posts/:id", async (request, reply) => {
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, request.params.id),
  });

  if (!post) {
    throw new NotFoundError("Post", request.params.id);
  }

  if (post.authorId !== request.user.id) {
    throw new ForbiddenError("You can only delete your own posts");
  }

  await db.delete(posts).where(eq(posts.id, request.params.id));
  return reply.status(204).send();
});
```

---

## API Error Handling

### Fastify Error Handler

Register a global error handler to convert errors to consistent responses:

```typescript
// apps/api/src/plugins/error-handler.ts
import { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "@workspace/utils/errors";

export function errorHandler(
  error: FastifyError | AppError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const requestId = request.id;

  // Handle known application errors
  if (error instanceof AppError) {
    request.log.warn({ err: error, requestId }, error.message);

    return reply.status(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        requestId,
      },
    });
  }

  // Handle Zod validation errors
  if (error.validation) {
    const fields = error.validation.map((v) => ({
      field: v.instancePath.replace("/", ""),
      message: v.message,
    }));

    request.log.warn({ err: error, requestId }, "Validation error");

    return reply.status(400).send({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request",
        details: { fields },
        requestId,
      },
    });
  }

  // Handle unexpected errors
  request.log.error({ err: error, requestId }, "Unexpected error");

  return reply.status(500).send({
    error: {
      code: "INTERNAL_ERROR",
      message: process.env.NODE_ENV === "production"
        ? "An unexpected error occurred"
        : error.message,
      requestId,
    },
  });
}
```

### Register Error Handler

```typescript
// apps/api/src/index.ts
import { errorHandler } from "./plugins/error-handler";

app.setErrorHandler(errorHandler);
```

### Async Error Boundaries

Fastify automatically catches async errors. Just throw:

```typescript
// Good - Fastify catches this automatically
app.get("/posts/:id", async (request) => {
  const post = await getPost(request.params.id);
  if (!post) {
    throw new NotFoundError("Post");
  }
  return post;
});

// Also good - explicit error handling for specific cases
app.post("/posts", async (request, reply) => {
  try {
    const post = await createPost(request.body);
    return reply.status(201).send(post);
  } catch (error) {
    if (error.code === "23505") { // Postgres unique violation
      throw new ConflictError("A post with this slug already exists");
    }
    throw error; // Re-throw unexpected errors
  }
});
```

---

## Client-Side Error Handling

### React Query Error Handling

```typescript
// apps/web/lib/api/client.ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error instanceof ApiError && error.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
    },
    mutations: {
      onError: (error) => {
        // Global error handling for mutations
        if (error instanceof ApiError) {
          if (error.status === 401) {
            // Redirect to login
            window.location.href = "/login";
          }
        }
      },
    },
  },
});
```

### Error Class for Client

```typescript
// apps/web/lib/api/errors.ts
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }

  static fromResponse(status: number, body: { error: ErrorResponse["error"] }) {
    return new ApiError(
      status,
      body.error.code,
      body.error.message,
      body.error.details
    );
  }
}

// Fetch wrapper
export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json();
    throw ApiError.fromResponse(response.status, body);
  }

  return response.json();
}
```

### Error Boundary Component

```tsx
// apps/web/components/error-boundary.tsx
"use client";

import { Component, ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, info);
    // Log to error tracking service (Sentry, etc.)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="p-4 text-center">
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="text-muted-foreground">
            {this.state.error?.message}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 px-4 py-2 bg-primary text-white rounded"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Form Error Display

```tsx
// apps/web/components/form-error.tsx
import { ApiError } from "@/lib/api/errors";

type Props = {
  error: Error | null;
};

export function FormError({ error }: Props) {
  if (!error) return null;

  if (error instanceof ApiError && error.details?.fields) {
    return (
      <div className="text-sm text-destructive">
        <ul>
          {error.details.fields.map((field) => (
            <li key={field.field}>{field.field}: {field.message}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="text-sm text-destructive">
      {error.message}
    </div>
  );
}
```

---

## Logging Standards

### Log Levels

| Level | When to Use |
|-------|-------------|
| `error` | Unexpected errors, system failures |
| `warn` | Expected errors (4xx), degraded state |
| `info` | Request lifecycle, important events |
| `debug` | Development debugging |

### Structured Logging

```typescript
// Good - structured with context
request.log.error({
  err: error,
  userId: request.user?.id,
  resource: "posts",
  action: "delete",
}, "Failed to delete post");

// Bad - unstructured
console.log("Error deleting post:", error);
```

### What to Log

**Always log:**
- Request ID for tracing
- User ID (if authenticated)
- Resource type and action
- Error stack trace (for errors)

**Never log:**
- Passwords or secrets
- Full request bodies with sensitive data
- PII without consent

---

## Error Codes Catalog

### Authentication Errors (401)

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | No auth token provided |
| `TOKEN_EXPIRED` | Auth token has expired |
| `TOKEN_INVALID` | Auth token is malformed |
| `SESSION_NOT_FOUND` | Session doesn't exist |

### Authorization Errors (403)

| Code | Description |
|------|-------------|
| `FORBIDDEN` | Generic access denied |
| `INSUFFICIENT_PERMISSIONS` | Missing required permission |
| `ORG_ACCESS_DENIED` | Not a member of organization |
| `RESOURCE_ACCESS_DENIED` | Can't access this resource |

### Validation Errors (400)

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request body validation failed |
| `INVALID_PARAMS` | Query/path parameters invalid |
| `MISSING_REQUIRED_FIELD` | Required field not provided |
| `INVALID_FORMAT` | Field format is wrong |

### Resource Errors (404, 409)

| Code | Description |
|------|-------------|
| `NOT_FOUND` | Resource doesn't exist |
| `USER_NOT_FOUND` | User doesn't exist |
| `ORG_NOT_FOUND` | Organization doesn't exist |
| `CONFLICT` | State conflict |
| `DUPLICATE_ENTRY` | Unique constraint violation |
| `ALREADY_EXISTS` | Resource already exists |

### Rate Limiting (429)

| Code | Description |
|------|-------------|
| `RATE_LIMITED` | Too many requests |
| `QUOTA_EXCEEDED` | Usage quota exceeded |

### Server Errors (500, 503)

| Code | Description |
|------|-------------|
| `INTERNAL_ERROR` | Unexpected server error |
| `DATABASE_ERROR` | Database operation failed |
| `SERVICE_UNAVAILABLE` | Dependency unavailable |
| `TIMEOUT` | Operation timed out |

---

## Best Practices Summary

1. **Use error classes** - Throw typed errors, not strings
2. **Include context** - Error messages should help debugging
3. **Don't leak internals** - Sanitize error messages in production
4. **Log appropriately** - Use structured logging with context
5. **Handle gracefully** - Provide user-friendly error messages
6. **Be consistent** - Use the same error format everywhere
7. **Include request ID** - Enable request tracing
8. **Validate early** - Catch validation errors at the boundary
