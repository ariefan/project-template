# Sorting

**Related**: [Filtering](./02-filtering-and-search.md) · [Pagination](./01-pagination.md)

## Standard: orderBy Parameter

Use `orderBy` with optional `-` prefix for descending order:

```
GET /users?orderBy=-createdAt
GET /products?orderBy=price
```

**Sort direction:**
- No prefix = Ascending (A-Z, 0-9, oldest first)
- `-` prefix = Descending (Z-A, 9-0, newest first)

**Examples:**
```
GET /users?orderBy=-createdAt        # Newest first
GET /products?orderBy=price           # Cheapest first
GET /invoices?orderBy=-amount         # Highest amount first
GET /customers?orderBy=name           # Alphabetical A-Z
```

## Multiple Sort Fields

Comma-separate fields for multi-level sorting:

```
GET /users?orderBy=-createdAt,name,email
GET /products?orderBy=-priority,price
GET /tasks?orderBy=-isUrgent,dueDate,name
```

**SQL equivalent:**
```sql
-- orderBy=-createdAt,name,email
ORDER BY createdAt DESC, name ASC, email ASC

-- orderBy=-priority,price
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
| Users | `createdAt`, `name`, `email`, `lastLoginAt` |
| Invoices | `createdAt`, `amount`, `dueDate`, `status` |
| Products | `name`, `price`, `createdAt`, `popularity` |
| Orders | `createdAt`, `amount`, `status` |

## Default Sorting

**Recommended defaults:**
- Lists: `orderBy=-createdAt` (newest first)
- Names: `orderBy=name` (alphabetical)
- Amounts: `orderBy=-amount` (highest first)

**Always document the default** in API responses or documentation.

## Implementation

**Parse orderBy parameter:**
```typescript
function parseOrderBy(orderBy: string) {
  return orderBy.split(',').map(field => {
    const isDesc = field.startsWith('-');
    const fieldName = isDesc ? field.slice(1) : field;
    return { field: fieldName, direction: isDesc ? 'desc' : 'asc' };
  });
}

// Usage
const sorts = parseOrderBy('-createdAt,name');
// [{field: 'createdAt', direction: 'desc'}, {field: 'name', direction: 'asc'}]
```

**SQL generation:**
```typescript
function buildOrderBy(orderBy: string) {
  const sorts = parseOrderBy(orderBy);
  return sorts
    .map(s => `${s.field} ${s.direction.toUpperCase()}`)
    .join(', ');
}

// buildOrderBy('-createdAt,name')
// → "createdAt DESC, name ASC"
```

## Alternative Pattern (Legacy)

Some APIs use separate parameters:

```
GET /users?sortBy=createdAt&sortDirection=desc
```

**Not recommended** - verbose and requires two parameters for single-field sorting. Use `orderBy` instead for:
- Brevity (one parameter vs two)
- Multi-field support
- REST convention alignment

## See Also

- [Pagination](./01-pagination.md) - Page sorted results
- [Filtering](./02-filtering-and-search.md) - Filter before sorting
- [Performance](../06-quality/05-performance.md) - Indexing for sort fields
