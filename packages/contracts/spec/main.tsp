/**
 * ============================================================================
 * PROJECT API - TypeSpec Contract Definitions
 * ============================================================================
 *
 * This is the main entry point for all API contracts. It imports all modules
 * and defines the API namespace with server configurations.
 *
 * ## Quick Start
 *
 * 1. Add a new resource:
 *    - Copy an existing model (e.g., `models/user.tsp`) to `models/{resource}.tsp`
 *    - Copy matching routes (e.g., `routes/users.tsp`) to `routes/{resources}.tsp`
 *    - Replace names and update fields for your resource
 *    - Add imports below
 *    - Run `pnpm build`
 *
 * 2. See CONTRACTS-GUIDE.md for complete documentation
 *
 * ## File Organization
 *
 * spec/
 * ├── main.tsp              ← You are here (entry point)
 * ├── common/
 * │   ├── responses.tsp     ← Envelope types, pagination, batch, async
 * │   └── errors.tsp        ← Error models and error codes
 * ├── models/
 * │   ├── file.tsp          ← File uploads (direct + presigned URL)
 * │   ├── role.tsp          ← RBAC roles and permissions
 * │   ├── audit-log.tsp     ← Audit trail events
 * │   ├── job.tsp           ← Async job tracking
 * │   └── webhook.tsp       ← Webhook configuration
 * └── routes/
 *     ├── health.tsp        ← Health check endpoint
 *     ├── files.tsp         ← File upload/download
 *     ├── roles.tsp         ← Role management + user assignment
 *     ├── audit-logs.tsp    ← Audit log query + export
 *     ├── jobs.tsp          ← Async job status + cancel
 *     └── webhooks.tsp      ← Webhook management + deliveries
 *
 * NOTE: The following are handled by better-auth plugins:
 * - Admin plugin: /api/auth/admin/* (platform user management)
 * - Organization plugin: /api/auth/organization/* (member management)
 * - API Key plugin: /api/auth/api-key/* (user-scoped API keys)
 *
 * ## API Design Principles
 *
 * - URL Versioning: All routes start with /v1
 * - Multi-Tenant: Resources scoped to /orgs/{orgId}
 * - Response Envelope: { data, pagination?, meta }
 * - Soft Delete: Default delete marks deletedAt, restore available
 * - Batch Operations: /batch endpoint for bulk create/update/delete
 * - Field Selection: ?fields=id,name&include=relations
 * - Filtering: Suffix operators (e.g., statusNe, createdAfter)
 *
 * ## Naming Convention: camelCase
 *
 * All JSON fields use camelCase (industry standard):
 * - firstName, lastName, emailAddress
 * - createdAt, updatedAt, deletedAt
 * - pageSize, totalCount, hasNext
 * - isActive, isVerified, isDeleted
 *
 * ============================================================================
 */

import "@typespec/http";
import "@typespec/openapi3";

// ============================================================================
// Common Types (shared across all resources)
// ============================================================================
import "./common/responses.tsp";
import "./common/errors.tsp";

// ============================================================================
// Resource Models (add new models here)
// ============================================================================
import "./models/file.tsp";
import "./models/role.tsp";
import "./models/audit-log.tsp";
import "./models/job.tsp";
import "./models/webhook.tsp";
import "./models/example-post.tsp";
import "./models/example-comment.tsp";
import "./models/notification.tsp";
// import "./models/product.tsp";     ← Example: Add new models

// ============================================================================
// Route Definitions (add new routes here)
// ============================================================================
import "./routes/health.tsp";
import "./routes/files.tsp";
import "./routes/roles.tsp";
import "./routes/audit-logs.tsp";
import "./routes/jobs.tsp";
import "./routes/webhooks.tsp";
import "./routes/migration.tsp";
import "./routes/example-posts.tsp";
import "./routes/example-comments.tsp";
import "./routes/notifications.tsp";
// import "./routes/products.tsp";    ← Example: Add new routes

using TypeSpec.Http;

/**
 * Project API - RESTful API following modern best practices
 *
 * Key Features:
 * - URL versioning (/v1)
 * - Multi-tenant architecture (path-based with /orgs/{orgId})
 * - Comprehensive pagination with navigation links
 * - Structured error responses with detailed validation
 * - Soft delete support with restore capability
 * - Batch operations for bulk processing
 * - Field selection and relation inclusion
 * - Full-text search and filtering
 *
 * @see CONTRACTS-GUIDE.md for writing conventions
 */
@service
@server("http://localhost:3001", "Development server")
@server("https://api.example.com", "Production server")
namespace ProjectAPI;
