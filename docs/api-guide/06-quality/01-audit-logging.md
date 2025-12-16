# Audit Logging

**Complete guide to secure, tamper-proof audit logging for compliance and security.**

**Related**: [Soft Delete](../05-advanced-operations/04-soft-delete.md) · [Multitenancy](../01-core-concepts/05-multitenancy.md) · [PostgreSQL Implementation](./01-audit-logging-postgresql.md)

---

## Overview

Audit logging is **critical** for:
- 🔒 **Security** - Detect and investigate breaches
- 📋 **Compliance** - SOC2, HIPAA, GDPR requirements
- 🔍 **Forensics** - Reconstruct what happened
- 📊 **Analytics** - User behavior patterns
- ⚖️ **Legal** - Evidence in disputes

### Architecture Requirements

For production systems, audit logs must be:

1. **Tamper-proof** - Cannot be modified or deleted
2. **Complete** - Capture all security-relevant events
3. **Reliable** - Never lose audit data
4. **Performant** - Don't slow down the application
5. **Queryable** - Fast searches and analysis

**💡 See [PostgreSQL Implementation](./01-audit-logging-postgresql.md) for complete production-ready setup with:**
- ✅ Hash chain tamper-proof logging
- ✅ Append-only architecture
- ✅ Full resource snapshots
- ✅ Verification procedures
- ✅ No external services required

---

## Request ID

Every request has a unique ID:

```http
X-Request-ID: req_7k3m9x2p4b
```

**Response includes it:**
```json
{
  "meta": {
    "request_id": "req_7k3m9x2p4b"
  }
}
```

## Audit Log Structure

```json
{
  "event_id": "evt_abc123",
  "event_type": "user.updated",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "tenant_id": "org_xyz789",
  "actor": {
    "type": "user",
    "id": "usr_123",
    "email": "admin@example.com",
    "ip_address": "192.168.1.1"
  },
  "resource": {
    "type": "user",
    "id": "usr_456",
    "endpoint": "/v1/orgs/org_xyz789/users/usr_456",
    "method": "PATCH"
  },
  "changes": {
    "role": {
      "old": "member",
      "new": "admin"
    }
  },
  "metadata": {
    "request_id": "req_7k3m9x2p4b",
    "session_id": "ses_def456"
  }
}
```

## Event Types

Use consistent naming:
- `{resource}.created`
- `{resource}.updated`
- `{resource}.deleted`
- `{resource}.{action}_performed`

**Examples:**
- `user.created`
- `invoice.updated`
- `payment.refunded`
- `document.downloaded`

## Resource Data Storage Strategy

**Question: Should we store full resource snapshots or just changes?**

### Option 1: Delta Changes Only (Current Example)

```json
{
  "changes": {
    "role": { "old": "member", "new": "admin" }
  }
}
```

**Pros:**
- ✅ Space efficient
- ✅ Fast to write
- ✅ Clear what changed

**Cons:**
- ❌ Cannot reconstruct full resource history
- ❌ Requires complex queries to rebuild state

### Option 2: Full Resource Snapshots

```json
{
  "resource_before": {
    "id": "usr_456",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "member",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "resource_after": {
    "id": "usr_456",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "admin",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

**Pros:**
- ✅ Complete audit trail
- ✅ Easy to reconstruct any point in time
- ✅ Simpler queries

**Cons:**
- ❌ Storage intensive
- ❌ Larger write payload

### Recommended: Hybrid Approach

**Use snapshots for:**
- User creation/deletion
- Sensitive data operations (payment methods, PII)
- Permission/role changes
- High-value resources

**Use deltas for:**
- Routine field updates
- Metadata changes
- Low-sensitivity operations

---

## What to Audit

### Security Events (ALWAYS)

**Authentication:**
- ✅ Login attempts (success and failure)
- ✅ Logout events
- ✅ Password changes
- ✅ MFA enrollment/removal
- ✅ Session creation/expiration
- ✅ Token refresh/revocation

**Authorization:**
- ✅ Permission denied (403 errors)
- ✅ Role changes
- ✅ Permission grants/revocations
- ✅ Access to restricted resources
- ✅ Tenant switching

### Data Operations (ALWAYS)

**CREATE:**
- ✅ Store full `resource_after` snapshot
- ✅ Include who created it

**UPDATE:**
- ✅ Store `changes` (delta) for routine updates
- ✅ Store full snapshots for sensitive fields
- ✅ Include who made the change

**DELETE:**
- ✅ Store full `resource_before` snapshot
- ✅ Include who deleted it
- ✅ Link to soft delete if applicable

### Sensitive Data Access (COMPLIANCE)

- ✅ Viewing PII (personal identifiable information)
- ✅ Exporting data
- ✅ Downloading files
- ✅ Viewing payment methods
- ✅ Accessing financial records
- ✅ Viewing health records (HIPAA)

### Administrative Actions (ALWAYS)

- ✅ Configuration changes
- ✅ System settings updates
- ✅ Feature flag changes
- ✅ Bulk operations
- ✅ Data imports/exports
- ✅ API key creation/deletion

### Optional (Consider for Analytics)

- 📊 Resource read operations (high volume)
- 📊 Search queries
- 📊 Report generation
- 📊 File downloads

**Warning:** Be careful with high-volume events - they can overwhelm audit system.

---

## Compliance Requirements

### SOC2 Type II

**Logging Controls (CC6.3):**
- ✅ All privileged user actions
- ✅ All access to customer data
- ✅ All security configuration changes
- ✅ All failed access attempts

**Integrity (CC7.1):**
- ✅ Logs are tamper-proof (see [PostgreSQL Implementation](./01-audit-logging-postgresql.md))
- ✅ Logs cannot be modified or deleted
- ✅ Log integrity can be verified

### HIPAA (Health Insurance Portability and Accountability Act)

**Access Logging (§164.312(b)):**
- ✅ All access to electronic protected health information (ePHI)
- ✅ Who accessed what patient data
- ✅ When access occurred
- ✅ Purpose of access (if available)

**Retention:**
- ✅ Minimum 6 years retention
- ✅ Logs must be tamper-proof

### GDPR (General Data Protection Regulation)

**Right to Access (Article 15):**
- ✅ Users can request audit logs of their data access

**Data Breach Notification (Article 33):**
- ✅ Must have logs to determine breach scope
- ✅ 72-hour notification requirement

**Right to be Forgotten (Article 17):**
- ⚠️ May need to pseudonymize audit logs after data deletion
- ✅ Keep audit metadata, replace personal identifiers

---

## Tamper-Proof Implementation

### Hash Chain Strategy

Each audit event contains hash of previous event:

```
Event 1 (hash: A)
  ↓
Event 2 (hash: B, previous_hash: A)
  ↓
Event 3 (hash: C, previous_hash: B)
```

**Benefits:**
- Any tampering breaks the chain
- Can verify entire audit trail
- No external service required

**See [PostgreSQL Implementation](./01-audit-logging-postgresql.md) for complete code.**

### Append-Only Architecture

**Implementation:**
- Database triggers prevent UPDATE/DELETE
- Revoke UPDATE/DELETE permissions
- Separate audit database/schema

**Result:** Audit logs are immutable

---

## Performance Considerations

### High-Volume Systems

For systems with **>1M events/day:**

1. **Async logging** - Don't block requests
2. **Batch writes** - Buffer and write in batches
3. **Partitioning** - Monthly partitions for fast queries
4. **Archival** - Move old logs to cold storage
5. **Indexes** - Optimize for common queries

### Query Optimization

**Fast queries:**
```sql
-- Good: Uses index on (tenant_id, timestamp)
WHERE tenant_id = 'org_123' AND timestamp > NOW() - INTERVAL '24 hours'

-- Bad: Full table scan
WHERE actor_email LIKE '%@example.com%'
```

---

## See Also

- [PostgreSQL Implementation](./01-audit-logging-postgresql.md) - **Complete production setup**
- [Multitenancy](../01-core-concepts/05-multitenancy.md) - Tenant context
- [Soft Delete](../05-advanced-operations/04-soft-delete.md) - Deletion tracking
- [Security Best Practices](../03-security/04-security-best-practices.md) - Security auditing
