# Async Operations

**Related**: [Batch Operations](./01-batch-create.md) · [HTTP Methods](../01-core-concepts/02-http-methods.md)

## Job Creation

**Request:**
```
POST /v1/orgs/{orgId}/reports/generate
{
  "reportType": "financial",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

**Response: 202 Accepted**
```json
{
  "jobId": "job_abc123",
  "status": "pending",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "estimatedCompletion": "2024-01-15T10:35:00.000Z",
  "statusUrl": "/v1/orgs/{orgId}/jobs/job_abc123"
}
```

## Job Status

**Request:**
```
GET /v1/orgs/{orgId}/jobs/job_abc123
```

**Response:**
```json
{
  "jobId": "job_abc123",
  "status": "processing",
  "progress": 45,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "startedAt": "2024-01-15T10:30:15.000Z",
  "updatedAt": "2024-01-15T10:32:00.000Z",
  "metadata": {
    "recordsProcessed": 4500,
    "totalRecords": 10000
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
