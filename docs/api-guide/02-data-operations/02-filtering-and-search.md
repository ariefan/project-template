# Filtering and Searching

**Related**: [Pagination](./01-pagination.md) · [Sorting](./03-sorting.md) · [Naming Conventions](../01-core-concepts/01-naming-conventions.md)

## Field-Based Filtering

Use query parameters for exact field matches:

```
GET /v1/orgs/{org_id}/users?status=active&role=admin
GET /v1/orgs/{org_id}/invoices?status=paid&amount=1000
```

## Filter Operators

Add suffix to field name for non-equality comparisons:

| Operator | Suffix | Example | SQL |
|----------|--------|---------|-----|
| Equals | (none) or `_eq` | `status=active` | `status = 'active'` |
| Not equals | `_ne` | `status_ne=inactive` | `status != 'inactive'` |
| Greater than | `_gt` | `amount_gt=100` | `amount > 100` |
| Greater/equal | `_gte` | `amount_gte=100` | `amount >= 100` |
| Less than | `_lt` | `amount_lt=1000` | `amount < 1000` |
| Less/equal | `_lte` | `amount_lte=1000` | `amount <= 1000` |
| In list | `_in` | `status_in=active,pending` | `status IN ('active','pending')` |
| Contains | `_contains` | `name_contains=john` | `name ILIKE '%john%'` |
| Starts with | `_startswith` | `email_startswith=admin` | `email ILIKE 'admin%'` |
| Ends with | `_endswith` | `email_endswith=@acme.com` | `email ILIKE '%@acme.com'` |

**Examples:**
```
GET /users?status_in=active,pending&created_after=2024-01-01
GET /products?name_contains=laptop&price_lte=1000
GET /orders?email_endswith=@company.com&amount_gte=500
```

## Date Filtering

Use ISO 8601 format:

```
GET /invoices?created_after=2024-01-01T00:00:00Z
GET /invoices?created_before=2024-01-31T23:59:59Z
GET /users?last_login_after=2024-01-01&last_login_before=2024-02-01
```

## Full-Text Search

Use `search` or `q` for cross-field search:

```
GET /users?search=john+doe
GET /products?q=laptop+dell+15inch
```

**Response with relevance:**
```json
{
  "data": [
    {
      "id": "prd_123",
      "name": "Dell Laptop 15inch",
      "search_score": 0.95
    }
  ]
}
```

## Implementation

```typescript
function buildFilters(query: any, tenantId: string) {
  const filters = { tenant_id: tenantId };

  // Exact match
  if (query.status) filters.status = query.status;

  // Comparison operators
  if (query.amount_gte) filters.amount_gte = parseFloat(query.amount_gte);
  if (query.amount_lte) filters.amount_lte = parseFloat(query.amount_lte);

  // Date filtering
  if (query.created_after) filters.created_after = new Date(query.created_after);

  // In operator
  if (query.status_in) filters.status_in = query.status_in.split(',');

  return filters;
}
```

## See Also

- [Pagination](./01-pagination.md) - Combine filters with pagination
- [Sorting](./03-sorting.md) - Order filtered results
