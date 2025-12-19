# API Documentation Standards

This document defines the standards, conventions, and best practices for maintaining consistent, high-quality API documentation that is understandable by both humans and AI systems.

## Quick Checklist

Before publishing or updating any API documentation, ensure:

- [ ] Follows standard document structure
- [ ] Uses canonical conventions (orderBy, hasNext, etc.)
- [ ] Includes implementation examples
- [ ] Has 3-5 cross-references
- [ ] No duplicated content
- [ ] Consistent terminology
- [ ] AI-optimized formatting

## Document Structure Template

All API documentation files SHOULD follow this structure:

```markdown
# {Title}

**Related**: [Prerequisite/Related Topic] · [Related Topic 2] · [Related Topic 3]

## Overview

Brief description of the concept (2-4 sentences):
- What is this?
- When to use it?
- Key benefits (3-5 bullets if needed)

## {Primary Section}

Core content with clear examples.

### {Subsection}

Detailed explanations with code examples.

## Implementation

Practical code examples showing how to implement:

### {Language/Framework} Example

\```typescript
// Clear, copy-paste ready code
\```

### {Alternative Implementation}

\```typescript
// Alternative approach
\```

## Best Practices

1. **Practice Name**
   - Guideline
   - Rationale
   - Example

2. **Another Practice**
   - ...

## Error Handling

Common errors and how to resolve them:

\```json
{
  "error": {...}
}
\```

## Performance Considerations

- Optimization tips
- Indexing strategies
- Caching approaches

## Security Implications

Security notes relevant to this topic (if applicable).

## See Also

- [Related Topic 1](./path.md) - Brief description
- [Related Topic 2](./path.md) - Brief description
- [Related Topic 3](./path.md) - Brief description
```

## Canonical Conventions

Use ONLY these standardized patterns throughout documentation:

### Sorting

**✅ PRIMARY:**
```
GET /users?orderBy=-createdAt
GET /products?orderBy=-price,name
```

**❌ AVOID:**
```
GET /users?sort_by=created_at&sort_direction=desc  # Legacy pattern
```

**Rule:** Always use `orderBy` with `-` prefix for descending. Support multi-field with comma separation.

### Pagination

**✅ Field Naming:**
```json
{
  "pagination": {
    "hasNext": true,
    "hasPrevious": false
  }
}
```

**❌ AVOID:**
```json
{
  "pagination": {
    "has_more": true  # Inconsistent naming
  }
}
```

**Rule:** Use `hasNext` and `hasPrevious` (not `has_more`).

### DELETE Responses

**✅ Decision Tree:**
```
Soft delete with metadata → 200 OK + {deletedAt, canRestore}
Soft delete without metadata → 204 No Content
Hard delete → 204 No Content
```

**❌ AVOID:**
- Ambiguous: "204 or 200" without context
- Inconsistent: Sometimes 200, sometimes 204 for same operation

**Rule:** Use decision tree pattern, prefer 200 OK for soft delete (auditability).

### HTTP Status Codes

**Single Source of Truth:** [Error Codes](./04-error-handling/02-error-codes.md)

**Rule:** Reference error codes doc instead of duplicating status code tables.

#### Algorithmic Decision Logic

AI systems should use this exact logic to determine status codes:

```python
# POST (Create)
def get_post_status_code(success: bool, created: bool) -> int:
    if not success:
        return 400  # or 422 for validation errors
    if created:
        return 201  # ALWAYS 201 for successful creation
    return 200  # For non-creation POST operations

# PATCH/PUT (Update)
def get_update_status_code(success: bool) -> int:
    if not success:
        return 400  # or 404 if not found, 422 for validation
    return 200  # ALWAYS 200 for successful update

# DELETE
def get_delete_status_code(success: bool, is_soft_delete: bool) -> int:
    if not success:
        return 404  # Resource not found
    if is_soft_delete:
        return 200  # ALWAYS 200 for soft delete (return metadata)
    return 204  # ALWAYS 204 for hard delete (no body)

# GET
def get_read_status_code(found: bool) -> int:
    return 200 if found else 404
```

**AI Instruction:** Use these functions to determine status codes. No exceptions.

### Resource IDs

**Format:** `{prefix}_{random}`

**Examples:**
```
usr_abc123
org_xyz789
inv_def456
```

**Rule:** Always use prefixed IDs. See [Naming Conventions glossary](./01-core-concepts/01-naming-conventions.md#naming-consistency) for standard prefixes.

#### Tenant vs Organization Naming

**CRITICAL:** Tenant concept uses different names in different contexts. Follow this mapping:

| Context | Term to Use | Example |
|---------|-------------|---------|
| URL paths | `orgId` | `/v1/orgs/{orgId}/users` |
| Path parameters | `orgId` | `req.params.orgId` |
| Database columns | `tenantId` | `WHERE tenantId = ?` |
| TypeScript variables | `tenantId` | `const tenantId = ...` |
| Documentation prose | "organization" or "tenant" | "User belongs to organization" |

**Implementation pattern:**
```typescript
// URL route
app.get('/v1/orgs/:orgId/users', async (req, res) => {
  // Extract from URL (orgId)
  const tenantId = req.params.orgId;

  // Query database (tenantId)
  const users = await db('users')
    .where('tenantId', tenantId)
    .select('*');

  res.json({ data: users });
});
```

**AI Instruction:**
- URLs: Always use `/orgs/{orgId}`
- Database queries: Always use `tenantId` column
- Code variables: Always use `tenantId` (camelCase)
- NEVER mix these terms within the same context

### Date/Time Fields

**Suffix Conventions:**
- `At` → Timestamp (ISO 8601): `createdAt`, `updatedAt`, `deletedAt`
- `Date` → Date only: `birthDate`, `startDate`, `dueDate`

**Format:** ISO 8601 with timezone: `2024-01-15T10:30:00.000Z`

**Rule:** Always use UTC timezone. Accept date-only format (interpreted as midnight UTC).

### Permission Format

**Pattern:** `{resource}:{action}`

**Examples:**
```
users:read
users:write
invoices:*
*:read
```

**Rule:** Use consistent `resource:action` format. Use `*` for wildcards.

## Content Guidelines

### 1. No Duplication

**❌ BAD:**
```markdown
# File A
## Deprecation Timeline
| Phase | Timeline | Action |
|-------|----------|--------|
| ... full table ... |

# File B
## Deprecation Timeline
| Phase | Timeline | Action |
|-------|----------|--------|
| ... same table ... |
```

**✅ GOOD:**
```markdown
# File A (Governance/Deprecation)
## Deprecation Timeline
| Phase | Timeline | Action |
|-------|----------|--------|
| ... full table ... |

# File B (Versioning)
## Deprecation
See [Deprecation Process](./governance/deprecation.md) for the complete timeline.
```

**Rule:** Single source of truth. Reference, don't duplicate.

### 2. Implementation Examples Required

Every documentation file covering a feature MUST include implementation examples.

**❌ BAD:**
```markdown
## Sorting

You can sort results using the order_by parameter.
```

**✅ GOOD:**
```markdown
## Sorting

You can sort results using the orderBy parameter:

\```
GET /users?orderBy=-createdAt
\```

### Implementation

\```typescript
function parseOrderBy(orderBy: string) {
  return orderBy.split(',').map(field => {
    const isDesc = field.startsWith('-');
    const fieldName = isDesc ? field.slice(1) : field;
    return { field: fieldName, direction: isDesc ? 'desc' : 'asc' };
  });
}
\```
```

**Rule:** Show usage AND implementation.

### 3. Cross-References

**Minimum:** 3 related topics
**Maximum:** 7 related topics
**Format:** Link + brief description

**✅ GOOD:**
```markdown
## See Also

- [Pagination](./pagination.md) - Page through sorted results
- [Filtering](./filtering.md) - Filter before sorting
- [Performance](./performance.md) - Indexing for sort fields
```

**❌ BAD:**
```markdown
## See Also

- [Pagination](./pagination.md)  # No description
```

**Rule:** Every file needs 3-5 meaningful cross-references with descriptions.

### 4. Decision Trees for Ambiguity

When multiple valid approaches exist, provide explicit decision tree:

**✅ GOOD:**
```markdown
## Which Pagination Strategy?

\```
Dataset size?
├─ < 10,000 records → Page-based (simple, page jumping)
├─ 10,000 - 100,000 records
│  └─ Need page jumping? → Page-based
│  └─ Don't need page jumping? → Cursor-based
└─ > 100,000 records → Cursor-based (consistent, no duplicates)
\```
```

**Rule:** Eliminate ambiguity with decision trees or clear recommendations.

### 5. Code Examples Format

**Requirements:**
- Language specified: \```typescript, \```json, \```http, \```sql
- Complete and runnable (no placeholders without explanation)
- Commented for clarity
- Include both request AND response

**✅ GOOD:**
```markdown
\```http
POST /v1/orgs/{orgId}/users HTTP/1.1
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe"
}
\```

**Response: 201 Created**
\```json
{
  "data": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
\```
```

**Rule:** Show complete request/response pairs.

## AI Optimization

To maximize AI code generation quality:

### 1. Explicit Patterns

**✅ AI-Friendly:**
```markdown
## Standard Pattern

Use `orderBy` with `-` prefix for descending:

\```
orderBy=-createdAt     # Descending
orderBy=name           # Ascending
orderBy=-price,name    # Multi-field
\```

**AI Instruction:** Always generate `orderBy` syntax by default.
```

**Rule:** Add "AI Instruction" notes for canonical patterns.

### 2. Implementation Templates

Provide copy-paste templates:

**✅ AI-Friendly:**
```typescript
// Template: Replace {placeholders} with actual values
function requirePermission(permission: string) {
  return (req, res, next) => {
    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({
        error: {
          code: 'forbidden',
          message: `Required permission: ${permission}`,
        },
      });
    }
    next();
  };
}
```

**Rule:** Annotate templates clearly.

### 3. Table Format for Structured Data

Use tables for comparison and reference:

**✅ AI-Parseable:**
```markdown
| HTTP Code | Error Code | Description | Client Action |
|-----------|------------|-------------|---------------|
| 401 | unauthorized | No token | Redirect to login |
| 401 | tokenExpired | Token expired | Refresh token |
```

**Rule:** Use tables for structured, comparable data.

### 4. Consistent Terminology

Maintain a glossary of terms:

| Term | Use | Don't Use |
|------|-----|-----------|
| Tenant | Organization, account context | Company, client |
| User | Individual person | Account, member |
| Permission | Access right | Privilege, grant |
| Role | Collection of permissions | Group, level |
| Soft delete | Mark as deleted | Archive, hide |
| Hard delete | Permanent removal | Delete, remove |

**Rule:** Use consistent terminology from the glossary.

## File Organization

### Naming Convention

- Use numbered prefixes for ordered content: `01-`, `02-`, `03-`
- Use kebab-case: `naming-conventions.md`, `field-selection.md`
- Be specific: `batch-create.md` (not `batching.md`)

### Directory Structure

```
docs/api-guide/
├── README.md
├── DOCUMENTATION-STANDARDS.md (this file)
├── 01-core-concepts/
│   ├── 01-naming-conventions.md
│   ├── 02-http-methods.md
│   ├── 03-request-response-format.md
│   ├── 04-versioning.md
│   └── 05-multitenancy.md
├── 02-data-operations/
│   ├── 01-pagination.md
│   ├── 02-filtering-and-search.md
│   ├── 03-sorting.md
│   └── 04-field-selection.md
├── 03-security/
│   ├── 01-authentication.md
│   ├── 02-authorization.md
│   ├── 03-rate-limiting.md
│   ├── 04-security-best-practices.md
│   └── 05-cors-and-headers.md
├── 04-error-handling/
│   ├── 01-error-structure.md
│   ├── 02-error-codes.md
│   └── 03-validation.md
├── 05-advanced-operations/
├── 06-quality/
├── 07-integrations/
└── 08-governance/
```

**Rule:** Group related topics in numbered directories.

## Quality Checklist

Before committing documentation changes:

### Content Quality

- [ ] No grammatical errors
- [ ] No broken links
- [ ] All code examples tested
- [ ] All placeholders explained (`{orgId}`, `{userId}`)
- [ ] Consistent voice (imperative, active)

### Technical Accuracy

- [ ] HTTP methods correct (GET/POST/PATCH/DELETE)
- [ ] Status codes appropriate (200/201/204/400/401/403/404)
- [ ] JSON examples valid
- [ ] TypeScript examples compile
- [ ] SQL examples syntactically correct

### Consistency

- [ ] Uses canonical conventions (orderBy, hasNext, etc.)
- [ ] ID format consistent (`usr_`, `org_`, etc.)
- [ ] Date format ISO 8601
- [ ] Error structure matches standard
- [ ] Terminology from glossary

### Completeness

- [ ] Overview section present
- [ ] Implementation section with code
- [ ] Error handling documented
- [ ] Best practices listed
- [ ] See Also links (3-5 items)

### AI Optimization

- [ ] Clear examples with input/output
- [ ] Decision trees for choices
- [ ] Implementation templates provided
- [ ] Consistent patterns documented
- [ ] No ambiguous guidance

## Common Mistakes to Avoid

### ❌ Mistake 1: Showing Multiple Equal Options

**BAD:**
```markdown
Use either:
- `sort_by + sort_direction`, OR
- `order_by`
```

**GOOD:**
```markdown
Use `orderBy` (recommended):
\```
GET /users?orderBy=-createdAt
\```

Alternative (legacy): `sort_by + sort_direction`
```

### ❌ Mistake 2: Missing Implementation

**BAD:**
```markdown
## Pagination

Use `page` and `pageSize` parameters.
```

**GOOD:**
```markdown
## Pagination

\```
GET /users?page=2&pageSize=50
\```

### Implementation

\```typescript
const page = parseInt(req.query.page) || 1;
const pageSize = Math.min(parseInt(req.query.pageSize) || 50, 100);
const offset = (page - 1) * pageSize;

const users = await db('users')
  .limit(pageSize)
  .offset(offset);
\```
```

### ❌ Mistake 3: Duplicate Content

**BAD:** Copying the same table to multiple files

**GOOD:** Reference the source of truth

### ❌ Mistake 4: Vague Error Messages

**BAD:**
```markdown
Returns 403 if forbidden.
```

**GOOD:**
```markdown
**403 Forbidden:**
\```json
{
  "error": {
    "code": "forbidden",
    "message": "Permission denied",
    "details": [
      {
        "code": "insufficientPermissions",
        "message": "Required permission: users:write",
        "metadata": {
          "required": "users:write",
          "actual": ["users:read"]
        }
      }
    ]
  }
}
\```
```

## Maintenance

### Regular Reviews

- **Monthly:** Review cross-references (ensure links not broken)
- **Quarterly:** Update examples to reflect current best practices
- **Per major version:** Review all docs for accuracy

### Version Control

- Create git commits with clear messages
- Group related changes
- Reference issue numbers if applicable

### Feedback Loop

- Track common support questions → improve docs
- Monitor AI code generation errors → add clarity
- Review developer PRs → standardize patterns

## Reference Documents

**Canonical Sources (Single Source of Truth):**

- Error Codes: [04-error-handling/02-error-codes.md](./04-error-handling/02-error-codes.md)
- Deprecation Timeline: [08-governance/04-deprecation.md](./08-governance/04-deprecation.md)
- Security Headers: [03-security/05-cors-and-headers.md](./03-security/05-cors-and-headers.md)
- ID Prefixes: [01-core-concepts/01-naming-conventions.md](./01-core-concepts/01-naming-conventions.md)

**Always reference these instead of duplicating.**

## Questions?

When in doubt:

1. **Is it clear to a junior developer?** If not, add examples.
2. **Can an AI generate correct code?** If not, add implementation details.
3. **Is it the canonical pattern?** If not, reference the correct pattern.
4. **Is it duplicated elsewhere?** If yes, reference instead of duplicate.
5. **Is there ambiguity?** If yes, add decision tree or explicit recommendation.

---

**Last Updated:** 2024-01-20
**Maintainer:** API Standards Team
