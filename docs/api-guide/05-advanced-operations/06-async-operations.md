# Async Operations

**Related**: [Batch Operations](./01-batch-create.md) · [HTTP Methods](../01-core-concepts/02-http-methods.md)

## Job Creation

**Request:**
```
POST /v1/orgs/{org_id}/reports/generate
{
  "report_type": "financial",
  "start_date": "2024-01-01",
  "end_date": "2024-01-31"
}
```

**Response: 202 Accepted**
```json
{
  "job_id": "job_abc123",
  "status": "pending",
  "created_at": "2024-01-15T10:30:00.000Z",
  "estimated_completion": "2024-01-15T10:35:00.000Z",
  "status_url": "/v1/orgs/{org_id}/jobs/job_abc123"
}
```

## Job Status

**Request:**
```
GET /v1/orgs/{org_id}/jobs/job_abc123
```

**Response:**
```json
{
  "job_id": "job_abc123",
  "status": "processing",
  "progress": 45,
  "created_at": "2024-01-15T10:30:00.000Z",
  "started_at": "2024-01-15T10:30:15.000Z",
  "updated_at": "2024-01-15T10:32:00.000Z",
  "metadata": {
    "records_processed": 4500,
    "total_records": 10000
  }
}
```

## Job Statuses

- `pending` - Queued, not started
- `processing` - Currently running
- `completed` - Finished successfully
- `failed` - Failed with errors
- `cancelled` - Cancelled by user

## See Also

- [HTTP Methods](../01-core-concepts/02-http-methods.md) - Status codes
- [Batch Operations](./01-batch-create.md) - Async batch operations
