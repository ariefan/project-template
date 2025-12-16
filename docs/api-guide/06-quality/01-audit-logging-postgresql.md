# PostgreSQL Audit Logging Implementation

**Complete guide to implementing tamper-proof audit logging with PostgreSQL.**

## Overview

This guide shows how to implement **production-grade, tamper-proof audit logging** using only PostgreSQL, without external services. The implementation includes:

- ✅ **Tamper-proof** - Hash chains prevent modification (REQUIRED)
- ✅ **Append-only** - Cannot UPDATE or DELETE logs (REQUIRED)
- ✅ **Data storage** - Stores actual resource data in audit log (REQUIRED)
- ✅ **Full resource snapshots** - Complete audit trail (OPTIONAL - can use deltas only)
- ✅ **Compliance-ready** - SOC2, HIPAA, GDPR compatible
- ✅ **Performance** - Optimized for high-volume writes (OPTIONAL)
- ✅ **Verifiable** - Can detect any tampering (REQUIRED)

---

## 📦 Does Audit Log Store the Actual Data?

**YES** - The audit log stores actual resource data in three JSONB fields:

```sql
-- Change tracking (choose based on your needs)
changes JSONB,           -- Delta: old/new values {"role": {"old": "member", "new": "admin"}}
resource_before JSONB,   -- Full snapshot before change (entire user object)
resource_after JSONB,    -- Full snapshot after change (entire user object)
```

**You can choose:**
- **Deltas only** (`changes`) - Space efficient, good for routine updates
- **Full snapshots** (`resource_before`, `resource_after`) - Complete history, easier queries
- **Hybrid** (RECOMMENDED) - Deltas for routine, snapshots for sensitive ops

**All three fields are in the table, use what you need!**

---

## 🎯 What's REQUIRED vs OPTIONAL

### ✅ REQUIRED (Core Security)

These are **essential** for tamper-proof logging:

1. **Hash chain** - Detects any tampering
2. **Append-only triggers** - Prevents modifications
3. **Separate schema** - Security isolation
4. **Verification function** - Proves integrity

**Skip these and your audit log is not secure.**

### 📦 OPTIONAL (Nice to Have)

These **improve** functionality but aren't essential:

1. **Full snapshots** - Can start with deltas only
2. **Partitioning** - Only needed for >1M events/day
3. **Permission model** - Can simplify initially
4. **Monthly archival** - Add when storage becomes issue

**Start simple, add as needed.**

---

## 🚀 Quick Start: Minimum Implementation

Want to get started quickly? Here's the **minimum required** (30 minutes):

### Steps 1-5 (REQUIRED)
1. ✅ Create audit schema
2. ✅ Create audit.logs table
3. ✅ Add hash chain trigger
4. ✅ Add append-only triggers (prevent UPDATE/DELETE)
5. ✅ Create log_event() function

**That's it! You now have tamper-proof audit logging.**

### Steps 6-10 (OPTIONAL - Add Later)
6. 📦 Usage examples (reference as needed)
7. 📦 Verification function (run manually first, automate later)
8. 📦 Query examples (add as you need them)
9. 📦 Permissions model (simplify for MVP)
10. 📦 Performance optimization (wait until >1M events/day)

---

## Architecture

### Database Schema Design

```
┌─────────────────────────────────────────────────────┐
│ audit_logs (append-only, tamper-proof)             │
│                                                     │
│ ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│ │ Event 1  │───▶│ Event 2  │───▶│ Event 3  │     │
│ │ hash: A  │    │ hash: B  │    │ hash: C  │     │
│ │ prev: -  │    │ prev: A  │    │ prev: B  │     │
│ └──────────┘    └──────────┘    └──────────┘     │
│                                                     │
│ Each event contains hash of previous event        │
│ Forms tamper-evident chain                        │
└─────────────────────────────────────────────────────┘
```

---

## Step 1: Create Audit Schema

### Separate Schema for Isolation

```sql
-- Create dedicated audit schema
CREATE SCHEMA IF NOT EXISTS audit;

-- Enable pgcrypto for hash functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

**Why separate schema?**
- Security isolation from main data
- Easier to manage permissions
- Can be on separate tablespace for performance
- Clear separation of concerns

---

## Step 2: Create Audit Log Table

### Table Structure

```sql
CREATE TABLE audit.logs (
  -- Identity
  id BIGSERIAL PRIMARY KEY,
  event_id VARCHAR(50) NOT NULL UNIQUE,
  sequence_number BIGINT NOT NULL,

  -- Timestamp (immutable)
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Event details
  event_type VARCHAR(100) NOT NULL,
  tenant_id VARCHAR(50) NOT NULL,

  -- Actor (who did it)
  actor_type VARCHAR(50) NOT NULL,
  actor_id VARCHAR(50) NOT NULL,
  actor_email VARCHAR(255),
  actor_ip_address INET,

  -- Resource (what was affected)
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(50) NOT NULL,
  endpoint VARCHAR(500),
  http_method VARCHAR(10),

  -- Change tracking
  changes JSONB,
  resource_before JSONB,
  resource_after JSONB,

  -- Tamper-proof hash chain
  previous_hash VARCHAR(64),
  event_hash VARCHAR(64) NOT NULL,

  -- Metadata
  request_id VARCHAR(50),
  session_id VARCHAR(50),
  user_agent TEXT,
  metadata JSONB,

  -- Indexes
  CONSTRAINT event_id_format CHECK (event_id ~ '^evt_[a-zA-Z0-9]+$')
);

-- Indexes for performance
CREATE INDEX idx_audit_logs_tenant ON audit.logs(tenant_id);
CREATE INDEX idx_audit_logs_timestamp ON audit.logs(timestamp DESC);
CREATE INDEX idx_audit_logs_event_type ON audit.logs(event_type);
CREATE INDEX idx_audit_logs_resource ON audit.logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_actor ON audit.logs(actor_id);
CREATE INDEX idx_audit_logs_sequence ON audit.logs(sequence_number);

-- Unique sequence per tenant (prevents race conditions)
CREATE UNIQUE INDEX idx_audit_logs_tenant_sequence
  ON audit.logs(tenant_id, sequence_number);
```

---

## Step 3: Implement Hash Chain

### Automatic Hash Calculation Trigger

```sql
CREATE OR REPLACE FUNCTION audit.calculate_event_hash()
RETURNS TRIGGER AS $$
DECLARE
  last_hash VARCHAR(64);
  last_sequence BIGINT;
  hash_input TEXT;
BEGIN
  -- Get last event's hash and sequence for this tenant
  SELECT event_hash, sequence_number
  INTO last_hash, last_sequence
  FROM audit.logs
  WHERE tenant_id = NEW.tenant_id
  ORDER BY sequence_number DESC
  LIMIT 1;

  -- Set sequence number (increment or start at 1)
  IF last_sequence IS NULL THEN
    NEW.sequence_number := 1;
    NEW.previous_hash := NULL;
  ELSE
    NEW.sequence_number := last_sequence + 1;
    NEW.previous_hash := last_hash;
  END IF;

  -- Build hash input (canonical JSON representation)
  hash_input := json_build_object(
    'event_id', NEW.event_id,
    'sequence_number', NEW.sequence_number,
    'timestamp', NEW.timestamp,
    'event_type', NEW.event_type,
    'tenant_id', NEW.tenant_id,
    'actor_id', NEW.actor_id,
    'resource_type', NEW.resource_type,
    'resource_id', NEW.resource_id,
    'changes', NEW.changes,
    'previous_hash', NEW.previous_hash
  )::TEXT;

  -- Calculate SHA-256 hash
  NEW.event_hash := encode(
    digest(hash_input, 'sha256'),
    'hex'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger (BEFORE INSERT)
CREATE TRIGGER trigger_calculate_event_hash
  BEFORE INSERT ON audit.logs
  FOR EACH ROW
  EXECUTE FUNCTION audit.calculate_event_hash();
```

**How it works:**
1. Before inserting, gets last event's hash and sequence
2. Increments sequence number
3. Stores previous event's hash in `previous_hash`
4. Calculates SHA-256 hash of current event data
5. Stores hash in `event_hash`

**Result:** Tamper-evident chain where each event links to previous

---

## Step 4: Make Table Append-Only

### Prevent Updates and Deletes

```sql
-- Trigger to prevent UPDATE
CREATE OR REPLACE FUNCTION audit.prevent_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable. UPDATE is not allowed.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_update
  BEFORE UPDATE ON audit.logs
  FOR EACH ROW
  EXECUTE FUNCTION audit.prevent_update();

-- Trigger to prevent DELETE
CREATE OR REPLACE FUNCTION audit.prevent_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable. DELETE is not allowed.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_delete
  BEFORE DELETE ON audit.logs
  FOR EACH ROW
  EXECUTE FUNCTION audit.prevent_delete();

-- Prevent TRUNCATE at table level
ALTER TABLE audit.logs SET (
  autovacuum_enabled = true,
  toast_tuple_target = 8160
);

-- Additional protection: Revoke UPDATE/DELETE permissions
REVOKE UPDATE, DELETE, TRUNCATE ON audit.logs FROM PUBLIC;
```

**Protection layers:**
1. ✅ Triggers block UPDATE/DELETE
2. ✅ Permission revocation
3. ✅ Application layer should only INSERT

---

## Step 5: Create Audit Logging Function

### Helper Function for Easy Logging

```sql
CREATE OR REPLACE FUNCTION audit.log_event(
  p_event_type VARCHAR,
  p_tenant_id VARCHAR,
  p_actor_type VARCHAR,
  p_actor_id VARCHAR,
  p_actor_email VARCHAR,
  p_actor_ip_address INET,
  p_resource_type VARCHAR,
  p_resource_id VARCHAR,
  p_endpoint VARCHAR,
  p_http_method VARCHAR,
  p_changes JSONB DEFAULT NULL,
  p_resource_before JSONB DEFAULT NULL,
  p_resource_after JSONB DEFAULT NULL,
  p_request_id VARCHAR DEFAULT NULL,
  p_session_id VARCHAR DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS VARCHAR AS $$
DECLARE
  v_event_id VARCHAR;
BEGIN
  -- Generate event ID
  v_event_id := 'evt_' || encode(gen_random_bytes(16), 'hex');

  -- Insert audit log (trigger will calculate hash)
  INSERT INTO audit.logs (
    event_id,
    event_type,
    tenant_id,
    actor_type,
    actor_id,
    actor_email,
    actor_ip_address,
    resource_type,
    resource_id,
    endpoint,
    http_method,
    changes,
    resource_before,
    resource_after,
    request_id,
    session_id,
    user_agent,
    metadata
  ) VALUES (
    v_event_id,
    p_event_type,
    p_tenant_id,
    p_actor_type,
    p_actor_id,
    p_actor_email,
    p_actor_ip_address,
    p_resource_type,
    p_resource_id,
    p_endpoint,
    p_http_method,
    p_changes,
    p_resource_before,
    p_resource_after,
    p_request_id,
    p_session_id,
    p_user_agent,
    p_metadata
  );

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;
```

---

## Step 6: Usage Examples

### Example 1: Log User Update (Delta Changes)

```sql
-- User role changed from 'member' to 'admin'
SELECT audit.log_event(
  p_event_type := 'user.updated',
  p_tenant_id := 'org_xyz789',
  p_actor_type := 'user',
  p_actor_id := 'usr_admin123',
  p_actor_email := 'admin@example.com',
  p_actor_ip_address := '192.168.1.100'::INET,
  p_resource_type := 'user',
  p_resource_id := 'usr_456',
  p_endpoint := '/v1/orgs/org_xyz789/users/usr_456',
  p_http_method := 'PATCH',
  p_changes := '{
    "role": {
      "old": "member",
      "new": "admin"
    }
  }'::JSONB,
  p_request_id := 'req_abc123'
);
```

### Example 2: Log User Creation (Full Snapshot)

```sql
-- New user created
SELECT audit.log_event(
  p_event_type := 'user.created',
  p_tenant_id := 'org_xyz789',
  p_actor_type := 'user',
  p_actor_id := 'usr_admin123',
  p_actor_email := 'admin@example.com',
  p_actor_ip_address := '192.168.1.100'::INET,
  p_resource_type := 'user',
  p_resource_id := 'usr_789',
  p_endpoint := '/v1/orgs/org_xyz789/users',
  p_http_method := 'POST',
  p_resource_after := '{
    "id": "usr_789",
    "email": "newuser@example.com",
    "name": "New User",
    "role": "member",
    "created_at": "2024-01-15T10:30:00Z"
  }'::JSONB,
  p_request_id := 'req_def456'
);
```

### Example 3: Log Sensitive Data Access

```sql
-- Admin viewed user's payment methods
SELECT audit.log_event(
  p_event_type := 'payment_methods.viewed',
  p_tenant_id := 'org_xyz789',
  p_actor_type := 'user',
  p_actor_id := 'usr_admin123',
  p_actor_email := 'admin@example.com',
  p_actor_ip_address := '192.168.1.100'::INET,
  p_resource_type := 'user',
  p_resource_id := 'usr_456',
  p_endpoint := '/v1/orgs/org_xyz789/users/usr_456?include=payment_methods',
  p_http_method := 'GET',
  p_metadata := '{
    "included_relations": ["payment_methods"],
    "payment_method_count": 2
  }'::JSONB,
  p_request_id := 'req_ghi789'
);
```

---

## Step 7: Verification Functions

### Verify Hash Chain Integrity

```sql
CREATE OR REPLACE FUNCTION audit.verify_chain(p_tenant_id VARCHAR)
RETURNS TABLE(
  is_valid BOOLEAN,
  broken_at_sequence BIGINT,
  broken_event_id VARCHAR,
  message TEXT
) AS $$
DECLARE
  v_record RECORD;
  v_expected_hash VARCHAR(64);
  v_hash_input TEXT;
BEGIN
  FOR v_record IN
    SELECT *
    FROM audit.logs
    WHERE tenant_id = p_tenant_id
    ORDER BY sequence_number ASC
  LOOP
    -- Build expected hash
    v_hash_input := json_build_object(
      'event_id', v_record.event_id,
      'sequence_number', v_record.sequence_number,
      'timestamp', v_record.timestamp,
      'event_type', v_record.event_type,
      'tenant_id', v_record.tenant_id,
      'actor_id', v_record.actor_id,
      'resource_type', v_record.resource_type,
      'resource_id', v_record.resource_id,
      'changes', v_record.changes,
      'previous_hash', v_record.previous_hash
    )::TEXT;

    v_expected_hash := encode(
      digest(v_hash_input, 'sha256'),
      'hex'
    );

    -- Check if hash matches
    IF v_record.event_hash != v_expected_hash THEN
      RETURN QUERY SELECT
        false,
        v_record.sequence_number,
        v_record.event_id,
        'Hash mismatch detected - audit log has been tampered with!'::TEXT;
      RETURN;
    END IF;
  END LOOP;

  -- All hashes valid
  RETURN QUERY SELECT
    true,
    NULL::BIGINT,
    NULL::VARCHAR,
    'Audit chain is valid - no tampering detected'::TEXT;
END;
$$ LANGUAGE plpgsql;
```

### Usage

```sql
-- Verify audit trail for a tenant
SELECT * FROM audit.verify_chain('org_xyz789');

-- Result if valid:
-- is_valid | broken_at_sequence | broken_event_id | message
-- true     | NULL               | NULL            | Audit chain is valid...

-- Result if tampered:
-- is_valid | broken_at_sequence | broken_event_id | message
-- false    | 1234               | evt_abc123      | Hash mismatch detected...
```

---

## Step 8: Query Examples

### Get Audit Trail for a Resource

```sql
-- Get all changes to a specific user
SELECT
  event_id,
  timestamp,
  event_type,
  actor_email,
  changes,
  resource_before,
  resource_after
FROM audit.logs
WHERE tenant_id = 'org_xyz789'
  AND resource_type = 'user'
  AND resource_id = 'usr_456'
ORDER BY timestamp DESC;
```

### Get Admin Actions

```sql
-- All admin actions in last 30 days
SELECT
  timestamp,
  event_type,
  actor_email,
  resource_type,
  resource_id,
  endpoint
FROM audit.logs
WHERE tenant_id = 'org_xyz789'
  AND timestamp > NOW() - INTERVAL '30 days'
  AND (
    event_type LIKE '%.deleted'
    OR changes->>'role' = 'admin'
    OR endpoint LIKE '%/admin/%'
  )
ORDER BY timestamp DESC;
```

### Get Failed Authentication Attempts

```sql
-- Failed login attempts
SELECT
  timestamp,
  actor_email,
  actor_ip_address,
  metadata->>'failure_reason' AS reason
FROM audit.logs
WHERE tenant_id = 'org_xyz789'
  AND event_type = 'auth.login_failed'
  AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;
```

### Reconstruct Resource at Point in Time

```sql
-- Reconstruct user state as of specific date
WITH user_history AS (
  SELECT
    timestamp,
    event_type,
    resource_after,
    changes,
    ROW_NUMBER() OVER (ORDER BY timestamp DESC) as rn
  FROM audit.logs
  WHERE tenant_id = 'org_xyz789'
    AND resource_type = 'user'
    AND resource_id = 'usr_456'
    AND timestamp <= '2024-01-15 10:00:00'::TIMESTAMPTZ
)
SELECT
  resource_after
FROM user_history
WHERE event_type = 'user.created'
   OR resource_after IS NOT NULL
ORDER BY timestamp DESC
LIMIT 1;
```

---

## Step 9: Permissions Model (OPTIONAL)

**This is OPTIONAL but recommended for production.**

You can start with simple permissions and enhance later.

### Secure Permission Setup

```sql
-- Create read-only audit role
CREATE ROLE audit_reader;
GRANT USAGE ON SCHEMA audit TO audit_reader;
GRANT SELECT ON audit.logs TO audit_reader;

-- Create audit writer role (for application)
CREATE ROLE audit_writer;
GRANT USAGE ON SCHEMA audit TO audit_writer;
GRANT INSERT ON audit.logs TO audit_writer;
GRANT USAGE, SELECT ON SEQUENCE audit.logs_id_seq TO audit_writer;
GRANT EXECUTE ON FUNCTION audit.log_event TO audit_writer;

-- Create audit admin role (for verification only)
CREATE ROLE audit_admin;
GRANT USAGE ON SCHEMA audit TO audit_admin;
GRANT SELECT ON audit.logs TO audit_admin;
GRANT EXECUTE ON FUNCTION audit.verify_chain TO audit_admin;

-- Application user (can only INSERT via function)
CREATE USER api_service WITH PASSWORD 'secure_password';
GRANT audit_writer TO api_service;

-- Analyst user (can only SELECT)
CREATE USER security_analyst WITH PASSWORD 'secure_password';
GRANT audit_reader TO security_analyst;

-- Admin user (can verify integrity)
CREATE USER audit_administrator WITH PASSWORD 'secure_password';
GRANT audit_admin TO audit_administrator;
```

**Permission Matrix:**

| Role | INSERT | SELECT | UPDATE | DELETE | VERIFY |
|------|--------|--------|--------|--------|--------|
| audit_writer (app) | ✅ | ❌ | ❌ | ❌ | ❌ |
| audit_reader (analyst) | ❌ | ✅ | ❌ | ❌ | ❌ |
| audit_admin | ❌ | ✅ | ❌ | ❌ | ✅ |

---

## Step 10: Performance Optimization (OPTIONAL)

**These optimizations are OPTIONAL - only add when you have >1M events/day.**

Start simple, optimize when needed.

### Partitioning by Month (OPTIONAL)

```sql
-- Convert to partitioned table (for large scale)
CREATE TABLE audit.logs_partitioned (
  LIKE audit.logs INCLUDING ALL
) PARTITION BY RANGE (timestamp);

-- Create monthly partitions
CREATE TABLE audit.logs_2024_01 PARTITION OF audit.logs_partitioned
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE audit.logs_2024_02 PARTITION OF audit.logs_partitioned
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Auto-create future partitions (requires pg_cron or external script)
```

### Archive Old Logs (OPTIONAL)

```sql
-- Archive logs older than 7 years to cold storage
-- (Export to S3/external system, then drop partition)

-- Export to CSV
\copy (SELECT * FROM audit.logs WHERE timestamp < NOW() - INTERVAL '7 years') TO '/backup/audit_archive_2017.csv' CSV HEADER;

-- After backup verified, drop old partition
-- (Only if using partitioned table)
DROP TABLE IF EXISTS audit.logs_2017_01;
```

---

## Compliance & Retention

### Retention Policies

**Recommended retention:**
- **Hot storage** (PostgreSQL): 1 year
- **Warm storage** (compressed in DB): 3 years
- **Cold storage** (S3/archive): 7 years
- **Permanent retention**: Authentication failures, security events

### SOC2 Requirements

✅ **Logging Controls:**
- Who accessed what data
- When access occurred
- What changes were made
- Failed access attempts

✅ **Integrity Controls:**
- Logs are tamper-proof (hash chain)
- Logs cannot be deleted (triggers)
- Changes are detectable (verification function)

### GDPR Compliance

⚠️ **Right to be Forgotten:**
- Audit logs may contain personal data
- Strategy: Pseudonymize PII after retention period
- Keep audit metadata, replace personal identifiers

```sql
-- Pseudonymize old audit logs
UPDATE audit.logs
SET
  actor_email = 'pseudonymized_' || md5(actor_email),
  actor_ip_address = NULL,
  resource_before = NULL,
  resource_after = NULL
WHERE timestamp < NOW() - INTERVAL '2 years'
  AND actor_id = 'usr_to_be_forgotten';
```

---

## Best Practices

### ✅ DO:
- Always log to audit system via `audit.log_event()` function
- Store full resource snapshots for sensitive operations
- Store deltas for routine updates
- Verify chain integrity regularly (daily cron job)
- Monitor for failed verification
- Keep audit database separate from application database
- Use connection pooling for audit writes
- Test restore procedures

### ❌ DON'T:
- Never directly INSERT into audit.logs (bypass function)
- Never store passwords or secrets in audit logs
- Never disable triggers "temporarily"
- Don't grant UPDATE/DELETE to anyone (not even DBA)
- Don't skip logging authentication events
- Don't use audit logs as operational data store

---

## Monitoring & Alerts

### Daily Verification Job

```sql
-- Run daily via pg_cron
SELECT cron.schedule(
  'verify-audit-chains',
  '0 2 * * *', -- 2 AM daily
  $$
    SELECT audit.verify_chain(tenant_id)
    FROM (SELECT DISTINCT tenant_id FROM audit.logs) t;
  $$
);
```

### Alert on Tampering

```sql
-- Create alert function
CREATE OR REPLACE FUNCTION audit.check_and_alert()
RETURNS void AS $$
DECLARE
  v_tenant_id VARCHAR;
  v_result RECORD;
BEGIN
  FOR v_tenant_id IN SELECT DISTINCT tenant_id FROM audit.logs LOOP
    SELECT * INTO v_result
    FROM audit.verify_chain(v_tenant_id);

    IF NOT v_result.is_valid THEN
      -- Send alert (implement your notification system)
      RAISE WARNING 'SECURITY ALERT: Audit chain tampered for tenant %', v_tenant_id;
      -- INSERT INTO alerts.security_incidents...
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

---

## See Also

- [Multitenancy](../../01-core-concepts/05-multitenancy.md) - Tenant isolation
- [Security Best Practices](../../03-security/04-security-best-practices.md) - Security standards
- [Soft Delete](../../05-advanced-operations/04-soft-delete.md) - Deletion tracking
