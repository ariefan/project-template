# Versioning

**Related**: [Naming Conventions](./01-naming-conventions.md) · [Deprecation](../08-governance/04-deprecation.md) · [Migration](../08-governance/05-migration.md)

## Versioning Strategy

Use **URL path versioning** for API versions.

```
https://api.example.com/{version}/{resource}
                        └─ v1, v2, v3
```

## URL Path Versioning (Recommended)

**Format:**
```
https://api.example.com/v1/users
https://api.example.com/v2/users
https://api.example.com/v3/users
```

**Benefits:**
- ✅ Clear and explicit
- ✅ Easy to route and cache
- ✅ Simple for clients
- ✅ Works with all HTTP clients
- ✅ Browser-friendly

**Examples:**
```
GET /v1/orgs/{org_id}/users
GET /v2/orgs/{org_id}/users
GET /v3/orgs/{org_id}/users
```

## Version Numbers

Use **major versions** only: `v1`, `v2`, `v3`

**Correct:**
```
/v1/users
/v2/users
/v3/users
```

**Incorrect:**
```
/v1.0/users          ❌ No minor versions
/v1.2.3/users        ❌ No patch versions
/version-1/users     ❌ Use short form
/api/v1/users        ❌ Version comes first
```

**Why major versions only:**
- Minor/patch versions = backward compatible (no new version needed)
- Major versions = breaking changes (new version required)
- Keeps versioning simple

## Version Lifecycle

### Stage 1: Active Development
New version in development, not publicly available.

### Stage 2: Beta
```
GET /v2beta/users
```
- Available for testing
- May have breaking changes
- No SLA guarantees
- Document as "beta"

### Stage 3: Stable (Current)
```
GET /v2/users
```
- Fully supported
- Production-ready
- SLA applies
- Documentation complete

### Stage 4: Deprecated
```
GET /v1/users
Deprecation: true
Sunset: Sat, 31 Dec 2024 23:59:59 GMT
```
- Still functional
- Marked for removal
- Migration guide available
- Sunset date announced

### Stage 5: Retired
```
GET /v1/users
HTTP/1.1 410 Gone
```
- No longer available
- Returns 410 Gone
- Error message with migration info

## Version Headers

Include version information in response headers.

```http
HTTP/1.1 200 OK
X-API-Version: v1
X-API-Deprecated: false
X-API-Sunset: 2025-12-31T23:59:59Z
```

**Headers:**
- `X-API-Version` - Version being used
- `X-API-Deprecated` - Deprecation flag
- `X-API-Sunset` - Removal date (RFC 8594)

## Deprecation Response

```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sat, 31 Dec 2024 23:59:59 GMT
Link: <https://docs.example.com/migrations/v1-to-v2>; rel="deprecation"
```

```json
{
  "data": {
    "id": "usr_123",
    "email": "user@example.com"
  },
  "warnings": [
    {
      "code": "endpointDeprecated",
      "message": "This endpoint version will be sunset on 2024-12-31",
      "sunsetDate": "2024-12-31T23:59:59Z",
      "alternative": "Use GET /v2/users instead",
      "documentationUrl": "https://docs.example.com/migrations/v1-to-v2"
    }
  ]
}
```

## Version Policy

### Maintain Multiple Versions

Support **at least 2 versions** simultaneously:
- Current version (v2)
- Previous version (v1)

**Example timeline:**
```
Jan 2024: v2 released (v1 still supported)
Jul 2024: v2 stable, v1 deprecated
Jan 2025: v3 released, v1 sunset
Jul 2025: v3 stable, v2 deprecated
```

### Deprecation Timeline

**Standard timeline: 12 months minimum**

See [Deprecation Process](../08-governance/04-deprecation.md) for the complete 6-phase timeline from announcement to retirement.

**Minimum support: 6 months after deprecation announcement**

### Breaking Changes

Create **new version** for breaking changes:

**Breaking changes:**
- Removing fields
- Renaming fields
- Changing field types
- Removing endpoints
- Changing authentication
- Changing response structure

**Non-breaking changes (no new version):**
- Adding new fields
- Adding new endpoints
- Adding new optional parameters
- Deprecating fields (with warning)
- Bug fixes

## Handling Breaking Changes

### v1 Example

```json
{
  "userId": "123",
  "fullName": "John Doe",
  "createdDate": "2024-01-15"
}
```

### v2 Example (Breaking Changes)

```json
{
  "id": "usr_123",
  "firstName": "John",
  "lastName": "Doe",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

**Changes:**
- `userId` → `id` (renamed)
- `fullName` → `firstName` + `lastName` (split)
- `createdDate` → `createdAt` (renamed + format change)

## Version Discovery

### API Info Endpoint

```
GET /version
GET /v1/version
```

**Response:**
```json
{
  "currentVersion": "v2",
  "supportedVersions": ["v1", "v2"],
  "deprecatedVersions": ["v1"],
  "latestVersion": "v2",
  "versions": [
    {
      "version": "v1",
      "status": "deprecated",
      "sunsetDate": "2024-12-31T23:59:59Z",
      "documentationUrl": "https://docs.example.com/v1"
    },
    {
      "version": "v2",
      "status": "stable",
      "releasedDate": "2024-01-01T00:00:00Z",
      "documentationUrl": "https://docs.example.com/v2"
    }
  ]
}
```

## Migration Support

### Dual Reads

Support reading from both old and new versions during migration.

```typescript
// Read from v2, fall back to v1
const user = await getV2User(userId) || await getV1User(userId);
```

### Adapter Pattern

```typescript
interface UserV1 {
  userId: string;
  fullName: string;
}

interface UserV2 {
  id: string;
  first_name: string;
  last_name: string;
}

function adaptV1toV2(v1User: UserV1): UserV2 {
  const [first_name, last_name] = v1User.fullName.split(' ');
  return {
    id: `usr_${v1User.userId}`,
    first_name,
    last_name,
  };
}
```

### Migration Endpoint

Provide endpoint to check migration status:

```
GET /v1/migration/status
```

**Response:**
```json
{
  "version": "v1",
  "status": "deprecated",
  "sunsetDate": "2024-12-31T23:59:59Z",
  "daysUntilSunset": 45,
  "replacementVersion": "v2",
  "migrationGuideUrl": "https://docs.example.com/migrations/v1-to-v2",
  "breakingChanges": [
    "User ID format changed from numeric to prefixed string",
    "Full name split into firstName and lastName",
    "Date format changed to ISO 8601"
  ],
  "migrationChecklist": [
    "Update user ID parsing to handle usr_ prefix",
    "Split full name into first and last name fields",
    "Update date parsing to ISO 8601 format"
  ]
}
```

## Version Routing

### Backend Implementation

```typescript
// Express.js example
const v1Router = require('./routes/v1');
const v2Router = require('./routes/v2');

app.use('/v1', v1Router);
app.use('/v2', v2Router);

// Default to latest
app.use('/', v2Router);
```

### Version Middleware

```typescript
function versionMiddleware(req, res, next) {
  const version = req.path.split('/')[1];

  if (version === 'v1') {
    res.set('X-API-Version', 'v1');
    res.set('Deprecation', 'true');
    res.set('Sunset', 'Sat, 31 Dec 2024 23:59:59 GMT');
  } else if (version === 'v2') {
    res.set('X-API-Version', 'v2');
  }

  next();
}
```

## Examples

### Active Version

```http
GET /v2/orgs/org_123/users HTTP/1.1
Host: api.example.com
```

**Response:**
```http
HTTP/1.1 200 OK
X-API-Version: v2
X-API-Deprecated: false
```

```json
{
  "data": [...],
  "meta": {
    "apiVersion": "v2"
  }
}
```

### Deprecated Version

```http
GET /v1/orgs/org_123/users HTTP/1.1
Host: api.example.com
```

**Response:**
```http
HTTP/1.1 200 OK
X-API-Version: v1
X-API-Deprecated: true
Deprecation: true
Sunset: Sat, 31 Dec 2024 23:59:59 GMT
Link: <https://docs.example.com/migrations/v1-to-v2>; rel="deprecation"
```

```json
{
  "data": [...],
  "warnings": [
    {
      "code": "versionDeprecated",
      "message": "API version v1 is deprecated and will be sunset on 2024-12-31",
      "sunsetDate": "2024-12-31T23:59:59Z",
      "replacementVersion": "v2",
      "migrationUrl": "https://docs.example.com/migrations/v1-to-v2"
    }
  ],
  "meta": {
    "apiVersion": "v1"
  }
}
```

### Retired Version

```http
GET /v0/orgs/org_123/users HTTP/1.1
Host: api.example.com
```

**Response:**
```http
HTTP/1.1 410 Gone
```

```json
{
  "error": {
    "code": "versionRetired",
    "message": "API version v0 has been retired",
    "retiredDate": "2023-12-31T23:59:59Z",
    "replacementVersion": "v2",
    "migrationUrl": "https://docs.example.com/migrations/v0-to-v2"
  }
}
```

## Best Practices

1. **Version early**: Start with v1, even for first release
2. **Minimize versions**: Support only 2-3 versions simultaneously
3. **Plan deprecation**: Announce 12 months in advance
4. **Document changes**: Provide detailed migration guides
5. **Automate detection**: Log usage of deprecated versions
6. **Monitor adoption**: Track migration progress
7. **Communicate clearly**: Email users about deprecations
8. **Test thoroughly**: Ensure backward compatibility

## See Also

- [Deprecation Process](../08-governance/04-deprecation.md) - Detailed deprecation workflow
- [Migration Support](../08-governance/05-migration.md) - Migration strategies
- [API Governance](../08-governance/01-api-governance.md) - Version approval process
- [Documentation Standards](../08-governance/02-documentation-standards.md) - Documenting versions
