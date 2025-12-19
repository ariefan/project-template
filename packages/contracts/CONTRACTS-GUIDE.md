# TypeSpec Contracts Writing Guide

This guide provides conventions, patterns, and examples for writing TypeSpec API contracts.

## Quick Start

**To create a new resource:**

1. Copy an existing model (e.g., `spec/models/user.tsp`) to `spec/models/{resource}.tsp`
2. Copy matching routes (e.g., `spec/routes/users.tsp`) to `spec/routes/{resources}.tsp`
3. Replace names and update fields for your resource
4. Add imports to `spec/main.tsp`
5. Run `pnpm build`

## Directory Structure

```
packages/contracts/spec/
├── main.tsp              # Entry point - import all modules here
├── common/
│   ├── responses.tsp     # Envelopes, pagination, batch, async responses
│   └── errors.tsp        # Error models and error codes
├── models/
│   ├── user.tsp          # User model (CRUD, batch, soft delete)
│   ├── file.tsp          # File uploads (direct + presigned URL)
│   ├── role.tsp          # RBAC roles and permissions
│   ├── api-key.tsp       # Service account API keys
│   ├── audit-log.tsp     # Audit trail events
│   └── job.tsp           # Async job tracking
└── routes/
    ├── health.tsp        # Health check endpoint
    ├── users.tsp         # User CRUD + batch operations
    ├── files.tsp         # File upload/download
    ├── roles.tsp         # Role management + user assignment
    ├── api-keys.tsp      # API key CRUD + rotate
    ├── audit-logs.tsp    # Audit log query + export
    └── jobs.tsp          # Async job status + cancel
```

---

## Naming Conventions

### File Names

| Type | Convention | Example |
|------|------------|---------|
| Models | Singular, lowercase | `user.tsp`, `product.tsp` |
| Routes | Plural, lowercase | `users.tsp`, `products.tsp` |
| Common | Descriptive, lowercase | `responses.tsp`, `errors.tsp` |

### TypeSpec Names

| Type | Convention | Example |
|------|------------|---------|
| Models | PascalCase, singular | `User`, `Product`, `Invoice` |
| Interfaces | PascalCase, plural | `Users`, `Products`, `Invoices` |
| Properties | camelCase | `firstName`, `createdAt`, `isActive` |
| Enums | PascalCase | `UserStatus`, `OrderState` |
| Enum values | camelCase | `active`, `pending`, `completed` |

### JSON Field Names (camelCase)

All JSON fields MUST use **camelCase**:

```typescript
// ✅ CORRECT
model User {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  createdAt: utcDateTime;
  updatedAt: utcDateTime;
  isActive: boolean;
  isVerified: boolean;
}

// ❌ WRONG - Never use snake_case
model User {
  first_name: string;    // ❌ snake_case
  created_at: utcDateTime; // ❌ snake_case
}
```

### Date/Time Field Suffixes

| Suffix | Use For | Example |
|--------|---------|---------|
| `At` | Timestamps (ISO 8601) | `createdAt`, `updatedAt`, `deletedAt` |
| `Date` | Date only (no time) | `birthDate`, `startDate`, `dueDate` |

---

## Creating a New Resource

> **Tip:** Copy `spec/models/user.tsp` and `spec/routes/users.tsp` as your starting point. They demonstrate CRUD, batch operations, and soft delete patterns.

### Step 1: Create Model (`spec/models/{resource}.tsp`)

```typescript
import "@typespec/http";
import "../common/responses.tsp";

using TypeSpec.Http;

namespace ProjectAPI {
  /**
   * Product resource
   * Represents a product in the catalog
   */
  model Product {
    /** Unique identifier (format: prd_abc123) */
    id: string;

    /** Product name */
    name: string;

    /** Product description */
    description?: string;

    /** Price in cents (e.g., 1999 = $19.99) */
    priceInCents: int64;

    /** Currency code (ISO 4217) */
    currency: string;

    /** Stock keeping unit */
    sku: string;

    /** Whether product is available for purchase */
    isAvailable: boolean;

    /** Whether product is soft deleted */
    isDeleted: boolean;

    /** When product was soft deleted */
    deletedAt?: utcDateTime;

    /** Who deleted the product */
    deletedBy?: string;

    /** When product was created */
    createdAt: utcDateTime;

    /** When product was last updated */
    updatedAt: utcDateTime;
  }

  /**
   * Request body for creating a product
   */
  model CreateProductRequest {
    /** Product name */
    @minLength(1)
    @maxLength(255)
    name: string;

    /** Product description */
    @maxLength(2000)
    description?: string;

    /** Price in cents */
    @minValue(0)
    priceInCents: int64;

    /** Currency code (default: USD) */
    currency?: string = "USD";

    /** Stock keeping unit */
    @minLength(1)
    sku: string;

    /** Whether product is available (default: true) */
    isAvailable?: boolean = true;
  }

  /**
   * Request body for updating a product (partial update)
   */
  model UpdateProductRequest {
    /** Product name */
    @minLength(1)
    @maxLength(255)
    name?: string;

    /** Product description */
    @maxLength(2000)
    description?: string;

    /** Price in cents */
    @minValue(0)
    priceInCents?: int64;

    /** Currency code */
    currency?: string;

    /** Whether product is available */
    isAvailable?: boolean;
  }

  /** Single product response */
  model ProductResponse is SingleResourceResponse<Product>;

  /** Product list response with pagination */
  model ProductListResponse is CollectionResponse<Product>;
}
```

### Step 2: Create Routes (`spec/routes/{resources}.tsp`)

```typescript
import "@typespec/http";
import "../common/responses.tsp";
import "../common/errors.tsp";
import "../models/product.tsp";

using TypeSpec.Http;

namespace ProjectAPI {
  /**
   * Products API endpoints
   * All endpoints are scoped to an organization (multi-tenant)
   */
  @route("/v1/orgs/{orgId}/products")
  @tag("Products")
  interface Products {
    /**
     * List products in an organization
     * Supports pagination, filtering, sorting, and field selection
     */
    @get
    @summary("List products")
    list(
      /** Organization ID */
      @path orgId: string,

      /** Page number (1-indexed) */
      @query page?: int32 = 1,

      /** Number of items per page (max: 100) */
      @query pageSize?: int32 = 50,

      /** Sort order (e.g., "-createdAt,name") */
      @query orderBy?: string,

      /** Comma-separated list of fields to return */
      @query fields?: string,

      /** Comma-separated list of relations to include */
      @query include?: string,

      /** Full-text search query */
      @query search?: string,

      // === Filters ===

      /** Filter by availability */
      @query isAvailable?: boolean,

      /** Filter by minimum price (in cents) */
      @query priceMin?: int64,

      /** Filter by maximum price (in cents) */
      @query priceMax?: int64,

      /** Filter products created after this timestamp */
      @query createdAfter?: utcDateTime,

      /** Filter products created before this timestamp */
      @query createdBefore?: utcDateTime
    ): ProductListResponse | ErrorResponse;

    /**
     * Create a new product
     */
    @post
    @summary("Create product")
    create(
      /** Organization ID */
      @path orgId: string,

      /** Product creation data */
      @body body: CreateProductRequest
    ):
      | {
          @statusCode statusCode: 201;
          @header location: string;
          @body body: ProductResponse;
        }
      | ErrorResponse;

    /**
     * Get a single product by ID
     */
    @route("/{id}")
    @get
    @summary("Get product")
    get(
      /** Organization ID */
      @path orgId: string,

      /** Product ID */
      @path id: string,

      /** Comma-separated list of fields to return */
      @query fields?: string,

      /** Comma-separated list of relations to include */
      @query include?: string
    ): ProductResponse | ErrorResponse;

    /**
     * Update a product (partial update)
     */
    @route("/{id}")
    @patch
    @summary("Update product")
    update(
      /** Organization ID */
      @path orgId: string,

      /** Product ID */
      @path id: string,

      /** Product update data */
      @body body: UpdateProductRequest
    ): ProductResponse | ErrorResponse;

    /**
     * Soft delete a product
     * Product is marked as deleted but can be restored
     */
    @route("/{id}")
    @delete
    @summary("Soft delete product")
    delete(
      /** Organization ID */
      @path orgId: string,

      /** Product ID */
      @path id: string
    ): SoftDeleteResponse | ErrorResponse;

    /**
     * Permanently delete a product (hard delete)
     * Product is permanently removed and cannot be restored
     */
    @route("/{id}/permanent")
    @delete
    @summary("Permanently delete product")
    deletePermanent(
      /** Organization ID */
      @path orgId: string,

      /** Product ID */
      @path id: string
    ):
      | {
          @statusCode statusCode: 204;
        }
      | ErrorResponse;

    /**
     * Restore a soft-deleted product
     */
    @route("/{id}/restore")
    @post
    @summary("Restore product")
    restore(
      /** Organization ID */
      @path orgId: string,

      /** Product ID */
      @path id: string
    ): ProductResponse | ErrorResponse;
  }
}
```

### Step 3: Import in main.tsp

```typescript
// Add to spec/main.tsp
import "./models/product.tsp";
import "./routes/products.tsp";
```

### Step 4: Build and Commit

```bash
pnpm build
git add tsp-output/
git commit -m "Add Product API contracts"
```

---

## Common Patterns

### Standard Query Parameters

Always support these on list endpoints:

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `page` | int32 | Page number (1-indexed) | `?page=2` |
| `pageSize` | int32 | Items per page (max 100) | `?pageSize=25` |
| `orderBy` | string | Sort fields with `-` for desc | `?orderBy=-createdAt,name` |
| `fields` | string | Sparse fieldsets | `?fields=id,name,price` |
| `include` | string | Related resources | `?include=category,reviews` |
| `search` | string | Full-text search | `?search=laptop` |

### Filter Naming Conventions

| Pattern | Description | Example |
|---------|-------------|---------|
| `{field}` | Exact match | `status=active` |
| `{field}Ne` | Not equal | `statusNe=deleted` |
| `{field}In` | In list (comma-separated) | `statusIn=active,pending` |
| `{field}Contains` | String contains | `nameContains=pro` |
| `{field}StartsWith` | String starts with | `nameStartsWith=Mac` |
| `{field}EndsWith` | String ends with | `emailEndsWith=@acme.com` |
| `{field}After` | Date greater than | `createdAfter=2024-01-01` |
| `{field}Before` | Date less than | `createdBefore=2024-12-31` |
| `{field}Min` | Number >= | `priceMin=1000` |
| `{field}Max` | Number <= | `priceMax=5000` |

### Response Status Codes

| Operation | Success | Notes |
|-----------|---------|-------|
| GET (single) | 200 OK | With resource body |
| GET (list) | 200 OK | With array + pagination |
| POST (create) | 201 Created | With Location header |
| PATCH (update) | 200 OK | With updated resource |
| DELETE (soft) | 200 OK | With deletion metadata |
| DELETE (hard) | 204 No Content | No body |
| POST (action) | 200 OK | With action result |

### Custom Actions Pattern

For non-CRUD operations, use the actions pattern:

```typescript
/**
 * Custom action: Publish product
 */
@route("/{id}/actions/publish")
@post
@summary("Publish product")
publish(
  @path orgId: string,
  @path id: string,
  @body body: {
    /** When to publish (default: now) */
    publishAt?: utcDateTime;
    /** Notify subscribers */
    notify?: boolean;
  }
):
  | {
      data: {
        productId: string;
        publishedAt: utcDateTime;
        notificationsSent: int32;
      };
      meta: ResponseMeta;
    }
  | ErrorResponse;
```

### Batch Operations

For bulk operations:

```typescript
/**
 * Batch create products
 */
@route("/batch")
@post
@summary("Batch create products")
batchCreate(
  @path orgId: string,
  @body body: {
    products: CreateProductRequest[];
  }
):
  | {
      @statusCode statusCode: 201;
      @body body: {
        data: {
          created: Product[];
          failed: {
            index: int32;
            error: Error;
          }[];
        };
        meta: ResponseMeta;
      };
    }
  | ErrorResponse;
```

---

## Validation Decorators

TypeSpec supports validation decorators:

```typescript
model CreateUserRequest {
  /** Email must be valid format */
  @format("email")
  email: string;

  /** Name between 1-100 characters */
  @minLength(1)
  @maxLength(100)
  name: string;

  /** Password at least 8 characters */
  @minLength(8)
  password: string;

  /** Age between 18-120 */
  @minValue(18)
  @maxValue(120)
  age?: int32;

  /** URL format */
  @format("uri")
  website?: string;
}
```

Available decorators:
- `@minLength(n)`, `@maxLength(n)` - String length
- `@minValue(n)`, `@maxValue(n)` - Number range
- `@minItems(n)`, `@maxItems(n)` - Array length
- `@pattern("regex")` - Regex pattern
- `@format("email"|"uri"|"uuid"|...)` - Format validation

---

## Documentation Best Practices

### Always Document

1. **Model purpose** - What the resource represents
2. **Field descriptions** - What each field means
3. **Endpoint purpose** - What the operation does
4. **Parameter meanings** - What each parameter controls

### Documentation Format

```typescript
/**
 * Brief description (first line)
 *
 * Extended description if needed.
 * Can be multiple lines.
 *
 * @example
 * ```json
 * { "name": "Example Product" }
 * ```
 */
model MyModel {
  /** Field description (required for all fields) */
  myField: string;
}
```

---

## Error Codes

When defining new error scenarios, add to `common/errors.tsp`:

```typescript
enum ErrorCode {
  // ... existing codes ...

  /** Product not found or inactive */
  productNotFound: "productNotFound",

  /** Insufficient stock for order */
  insufficientStock: "insufficientStock",
}
```

---

## Checklist for New Resources

- [ ] Created model in `spec/models/{resource}.tsp`
- [ ] Created routes in `spec/routes/{resources}.tsp`
- [ ] Added imports to `spec/main.tsp`
- [ ] All fields use camelCase
- [ ] All fields have JSDoc comments
- [ ] Date fields use `At` or `Date` suffix
- [ ] List endpoint has standard query parameters
- [ ] Filters follow naming conventions
- [ ] Create returns 201 with Location header
- [ ] Soft delete returns 200 with metadata
- [ ] Hard delete returns 204 No Content
- [ ] Validation decorators added where needed
- [ ] Error codes added if needed
- [ ] Built and tested with `pnpm build`
- [ ] Generated OpenAPI committed

---

## Resources

- [TypeSpec Documentation](https://typespec.io/)
- [TypeSpec HTTP Library](https://typespec.io/docs/libraries/http/reference)
- [API Guide](../../docs/api-guide/) - Documentation standards
- [README.md](./README.md) - Package usage

