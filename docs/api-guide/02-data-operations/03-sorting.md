# Sorting

**Related**: [Filtering](./02-filtering-and-search.md) · [Pagination](./01-pagination.md)

## Standard: order_by Parameter

Use `order_by` with optional `-` prefix for descending order:

```
GET /users?order_by=-created_at
GET /products?order_by=price
```

**Sort direction:**
- No prefix = Ascending (A-Z, 0-9, oldest first)
- `-` prefix = Descending (Z-A, 9-0, newest first)

**Examples:**
```
GET /users?order_by=-created_at        # Newest first
GET /products?order_by=price           # Cheapest first
GET /invoices?order_by=-amount         # Highest amount first
GET /customers?order_by=name           # Alphabetical A-Z
```

## Multiple Sort Fields

Comma-separate fields for multi-level sorting:

```
GET /users?order_by=-created_at,name,email
GET /products?order_by=-priority,price
GET /tasks?order_by=-is_urgent,due_date,name
```

**SQL equivalent:**
```sql
-- order_by=-created_at,name,email
ORDER BY created_at DESC, name ASC, email ASC

-- order_by=-priority,price
ORDER BY priority DESC, price ASC
```

**Rules:**
- First field = primary sort
- Subsequent fields = tiebreakers
- Each field can have its own direction
- No spaces in value

## Common Sort Fields

| Resource | Common Sorts |
|----------|--------------|
| Users | `created_at`, `name`, `email`, `last_login_at` |
| Invoices | `created_at`, `amount`, `due_date`, `status` |
| Products | `name`, `price`, `created_at`, `popularity` |
| Orders | `created_at`, `amount`, `status` |

## Default Sorting

**Recommended defaults:**
- Lists: `order_by=-created_at` (newest first)
- Names: `order_by=name` (alphabetical)
- Amounts: `order_by=-amount` (highest first)

**Always document the default** in API responses or documentation.

## Implementation

**Parse order_by parameter:**
```typescript
function parseOrderBy(orderBy: string) {
  return orderBy.split(',').map(field => {
    const isDesc = field.startsWith('-');
    const fieldName = isDesc ? field.slice(1) : field;
    return { field: fieldName, direction: isDesc ? 'desc' : 'asc' };
  });
}

// Usage
const sorts = parseOrderBy('-created_at,name');
// [{field: 'created_at', direction: 'desc'}, {field: 'name', direction: 'asc'}]
```

**SQL generation:**
```typescript
function buildOrderBy(orderBy: string) {
  const sorts = parseOrderBy(orderBy);
  return sorts
    .map(s => `${s.field} ${s.direction.toUpperCase()}`)
    .join(', ');
}

// buildOrderBy('-created_at,name')
// → "created_at DESC, name ASC"
```

## Alternative Pattern (Legacy)

Some APIs use separate parameters:

```
GET /users?sort_by=created_at&sort_direction=desc
```

**Not recommended** - verbose and requires two parameters for single-field sorting. Use `order_by` instead for:
- Brevity (one parameter vs two)
- Multi-field support
- REST convention alignment

## See Also

- [Pagination](./01-pagination.md) - Page sorted results
- [Filtering](./02-filtering-and-search.md) - Filter before sorting
- [Performance](../06-quality/05-performance.md) - Indexing for sort fields
