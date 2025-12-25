# Filtering and Searching

**Related**: [Pagination](./01-pagination.md) · [Sorting](./03-sorting.md) · [Naming Conventions](../01-core-concepts/01-naming-conventions.md)

## Field-Based Filtering

Use query parameters for exact field matches:

```
GET /v1/orgs/{orgId}/posts?status=active&role=admin
GET /v1/orgs/{orgId}/invoices?status=paid&amount=1000
```

## Filter Operators

Add suffix to field name for non-equality comparisons:

| Operator | Suffix | Example | SQL |
|----------|--------|---------|-----|
| Equals | (none) or `Eq` | `status=active` | `status = 'active'` |
| Not equals | `Ne` | `statusNe=inactive` | `status != 'inactive'` |
| Greater than | `Gt` | `amountGt=100` | `amount > 100` |
| Greater/equal | `Gte` | `amountGte=100` | `amount >= 100` |
| Less than | `Lt` | `amountLt=1000` | `amount < 1000` |
| Less/equal | `Lte` | `amountLte=1000` | `amount <= 1000` |
| In list | `In` | `statusIn=active,pending` | `status IN ('active','pending')` |
| Contains | `Contains` | `nameContains=john` | `name ILIKE '%john%'` |
| Starts with | `StartsWith` | `emailStartsWith=admin` | `email ILIKE 'admin%'` |
| Ends with | `EndsWith` | `emailEndsWith=@acme.com` | `email ILIKE '%@acme.com'` |

**Examples:**
```
GET /users?statusIn=active,pending&createdAfter=2024-01-01
GET /products?nameContains=laptop&priceLte=1000
GET /orders?emailEndsWith=@company.com&amountGte=500
```

## Date Filtering

Use ISO 8601 format:

```
GET /invoices?createdAfter=2024-01-01T00:00:00Z
GET /invoices?createdBefore=2024-01-31T23:59:59Z
GET /users?lastLoginAfter=2024-01-01&lastLoginBefore=2024-02-01
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
      "searchScore": 0.95
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
  if (query.amountGte) filters.amountGte = parseFloat(query.amountGte);
  if (query.amountLte) filters.amountLte = parseFloat(query.amountLte);

  // Date filtering
  if (query.createdAfter) filters.createdAfter = new Date(query.createdAfter);

  // In operator
  if (query.statusIn) filters.statusIn = query.statusIn.split(',');

  return filters;
}
```

## See Also

- [Pagination](./01-pagination.md) - Combine filters with pagination
- [Sorting](./03-sorting.md) - Order filtered results
