# @workspace/utils

**Shared utility functions for environment variables and formatting**

This package provides common utility functions used across the monorepo for environment variable handling and data formatting.

## Exports

```typescript
// Environment variables
export { getEnv, getEnvNumber, getEnvBoolean } from "@workspace/utils";

// Formatting
export {
  formatDate,
  formatDateTime,
  formatCurrency,
  formatNumber,
  slugify,
  truncate,
} from "@workspace/utils";
```

## Environment Variables

Type-safe environment variable access with validation and defaults.

### getEnv

```typescript
import { getEnv } from "@workspace/utils";

// Required variable (throws if missing)
const apiUrl = getEnv("API_URL");

// With default value
const logLevel = getEnv("LOG_LEVEL", "info");
```

### getEnvNumber

```typescript
import { getEnvNumber } from "@workspace/utils";

// Required number (throws if missing or invalid)
const port = getEnvNumber("PORT");

// With default value
const timeout = getEnvNumber("TIMEOUT_MS", 5000);
```

### getEnvBoolean

```typescript
import { getEnvBoolean } from "@workspace/utils";

// Parses "true" or "1" as true, anything else as false
const debug = getEnvBoolean("DEBUG", false);
const enableCache = getEnvBoolean("ENABLE_CACHE", true);
```

## Formatting Functions

### formatDate

```typescript
import { formatDate } from "@workspace/utils";

formatDate(new Date());
// → "December 24, 2024"

formatDate("2024-12-24");
// → "December 24, 2024"

formatDate(new Date(), { month: "short" });
// → "Dec 24, 2024"
```

### formatDateTime

```typescript
import { formatDateTime } from "@workspace/utils";

formatDateTime(new Date());
// → "Dec 24, 2024, 10:30 AM"

formatDateTime(new Date(), { hour12: false });
// → "Dec 24, 2024, 10:30"
```

### formatCurrency

```typescript
import { formatCurrency } from "@workspace/utils";

formatCurrency(1234.56);
// → "$1,234.56"

formatCurrency(1234.56, "EUR", "de-DE");
// → "1.234,56 €"

formatCurrency(1234.56, "JPY");
// → "¥1,235"
```

### formatNumber

```typescript
import { formatNumber } from "@workspace/utils";

formatNumber(1234567.89);
// → "1,234,567.89"

formatNumber(0.1234, { style: "percent" });
// → "12%"

formatNumber(1234567, { notation: "compact" });
// → "1.2M"
```

### slugify

```typescript
import { slugify } from "@workspace/utils";

slugify("Hello World!");
// → "hello-world"

slugify("  Multiple   Spaces  ");
// → "multiple-spaces"

slugify("Special @#$ Characters!");
// → "special-characters"
```

### truncate

```typescript
import { truncate } from "@workspace/utils";

truncate("Hello World", 8);
// → "Hello..."

truncate("Short", 10);
// → "Short"

truncate("Custom suffix here", 10, " [more]");
// → "Cus [more]"
```

## Usage Examples

### Configuration Loading

```typescript
import { getEnv, getEnvNumber, getEnvBoolean } from "@workspace/utils";

const config = {
  apiUrl: getEnv("API_URL"),
  port: getEnvNumber("PORT", 3000),
  debug: getEnvBoolean("DEBUG", false),
  environment: getEnv("NODE_ENV", "development"),
};
```

### Display Formatting

```typescript
import { formatCurrency, formatDate, truncate } from "@workspace/utils";

function OrderRow({ order }) {
  return (
    <tr>
      <td>{formatDate(order.createdAt)}</td>
      <td>{truncate(order.description, 50)}</td>
      <td>{formatCurrency(order.total)}</td>
    </tr>
  );
}
```

### URL Generation

```typescript
import { slugify } from "@workspace/utils";

function createPostUrl(title: string, id: string) {
  return `/blog/${slugify(title)}-${id}`;
}

createPostUrl("Hello World!", "abc123");
// → "/blog/hello-world-abc123"
```

## Dependencies

None - pure TypeScript utilities with no external dependencies.
