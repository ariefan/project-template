# Development Workflow Guide

## Overview: Contract-First Development Flow

```
1. Define Contract (API spec)
2. Generate Types
3. Implement API
4. Implement UI (Web/Mobile)
5. Test & Deploy
```

## Daily Development Workflow

### Morning Setup

```bash
# Pull latest changes
git pull origin main

# Install any new dependencies
pnpm install

# Start all apps in dev mode
pnpm dev
```

This starts:
- 🔥 Fastify API (port 3001) - with hot reload
- 🌐 Next.js Main (port 3000) - with fast refresh
- 👨‍💼 Next.js Admin (port 3002) - with fast refresh
- 📱 Expo (Metro bundler) - for mobile
- 🗄️ Database (if using Docker)

### Terminal Setup (Recommended)

```
Terminal 1: pnpm dev          # All apps
Terminal 2: pnpm db:studio    # Drizzle Studio (view DB)
Terminal 3: git status        # Git commands
Terminal 4: pnpm test:watch   # Tests in watch mode
```

Or use Turborepo's better output:

```bash
# Run everything
pnpm turbo dev

# Run specific apps
pnpm turbo dev --filter=web-main
pnpm turbo dev --filter=api-public
```

## Feature Development Flow

### Example: Adding "Create Product" Feature

#### Step 1: Define Contract (packages/contracts)

**Option A: Using TypeSpec**

```typescript
// packages/contracts/src/products.tsp
import "@typespec/http";

using TypeSpec.Http;

model Product {
  id: string;
  name: string;
  price: float64;
  description: string;
  createdAt: utcDateTime;
}

model CreateProductRequest {
  name: string;
  price: float64;
  description: string;
}

@route("/products")
namespace Products {
  @post
  op create(@body body: CreateProductRequest): Product;

  @get
  op list(@query limit?: int32 = 20): Product[];

  @get
  @route("/{id}")
  op get(@path id: string): Product | NotFoundError;
}
```

Generate types:

```bash
cd packages/contracts
pnpm tsp:compile
```

This creates:
- OpenAPI spec → `dist/openapi.json`
- TypeScript types → `dist/types.ts`
- Zod schemas → `dist/schemas.ts`

**Option B: Using Zod + ts-rest**

```typescript
// packages/contracts/src/schemas/product.ts
import { z } from 'zod'

export const productSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  price: z.number().positive(),
  description: z.string(),
  createdAt: z.coerce.date(),
})

export const createProductSchema = productSchema.pick({
  name: true,
  price: true,
  description: true,
})

export type Product = z.infer<typeof productSchema>
export type CreateProduct = z.infer<typeof createProductSchema>
```

```typescript
// packages/contracts/src/api/products.ts
import { initContract } from '@ts-rest/core'
import { productSchema, createProductSchema } from '../schemas/product'
import { z } from 'zod'

const c = initContract()

export const productsContract = c.router({
  create: {
    method: 'POST',
    path: '/products',
    body: createProductSchema,
    responses: {
      201: productSchema,
    },
  },
  list: {
    method: 'GET',
    path: '/products',
    query: z.object({
      limit: z.number().default(20),
    }),
    responses: {
      200: z.array(productSchema),
    },
  },
  get: {
    method: 'GET',
    path: '/products/:id',
    responses: {
      200: productSchema,
      404: z.object({ error: z.string() }),
    },
  },
})
```

#### Step 2: Update Database Schema (packages/db)

```typescript
// packages/db/src/schema/products.ts
import { pgTable, text, timestamp, real, uuid } from 'drizzle-orm/pg-core'

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  price: real('price').notNull(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
```

```typescript
// packages/db/src/schema/index.ts
export * from './products'
```

Generate migration:

```bash
cd packages/db
pnpm db:generate
pnpm db:migrate
```

This creates:
- Migration file in `src/migrations/`
- Updates database

#### Step 3: Implement API (apps/api-public)

```typescript
// apps/api-public/src/routes/products.ts
import { FastifyPluginAsync } from 'fastify'
import { db } from '@workspace/db'
import { products } from '@workspace/db/schema'
import { createProductSchema, productSchema } from '@workspace/contracts'

const productsRoute: FastifyPluginAsync = async (fastify) => {
  // Create product
  fastify.post('/products', {
    schema: {
      body: createProductSchema,
      response: {
        201: productSchema,
      },
    },
  }, async (request, reply) => {
    // Auth check
    if (!request.user) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const data = request.body

    const [product] = await db
      .insert(products)
      .values({
        name: data.name,
        price: data.price,
        description: data.description,
      })
      .returning()

    return reply.code(201).send(product)
  })

  // List products
  fastify.get('/products', {
    schema: {
      response: {
        200: z.array(productSchema),
      },
    },
  }, async (request, reply) => {
    const { limit = 20 } = request.query as { limit?: number }

    const items = await db
      .select()
      .from(products)
      .limit(limit)
      .orderBy(products.createdAt)

    return reply.send(items)
  })

  // Get product
  fastify.get('/products/:id', {
    schema: {
      response: {
        200: productSchema,
        404: z.object({ error: z.string() }),
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1)

    if (!product) {
      return reply.code(404).send({ error: 'Product not found' })
    }

    return reply.send(product)
  })
}

export default productsRoute
```

```typescript
// apps/api-public/src/index.ts
import productsRoute from './routes/products'

// Register routes
await fastify.register(productsRoute)
```

**Test it manually:**

```bash
# Create product
curl -X POST http://localhost:3001/products \
  -H "Content-Type: application/json" \
  -H "Cookie: session_token=YOUR_TOKEN" \
  -d '{
    "name": "MacBook Pro",
    "price": 2499.99,
    "description": "16-inch M3 Max"
  }'

# List products
curl http://localhost:3001/products
```

#### Step 4: Implement UI - Web (apps/web-main)

**4a. Create API Client Hook**

```typescript
// apps/web-main/lib/api/products.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Product, CreateProduct } from '@workspace/contracts'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export function useProducts(limit = 20) {
  return useQuery({
    queryKey: ['products', { limit }],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/products?limit=${limit}`)
      if (!res.ok) throw new Error('Failed to fetch products')
      return res.json() as Promise<Product[]>
    },
  })
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/products/${id}`)
      if (!res.ok) throw new Error('Failed to fetch product')
      return res.json() as Promise<Product>
    },
    enabled: !!id,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateProduct) => {
      const res = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Send cookies
        body: JSON.stringify(data),
      })

      if (!res.ok) throw new Error('Failed to create product')
      return res.json() as Promise<Product>
    },
    onSuccess: () => {
      // Invalidate products list to refetch
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
```

**4b. Create Form Component**

```typescript
// apps/web-main/components/products/create-product-form.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createProductSchema, type CreateProduct } from '@workspace/contracts'
import { useCreateProduct } from '@/lib/api/products'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@workspace/ui/components/form'
import { toast } from 'sonner'

export function CreateProductForm() {
  const createProduct = useCreateProduct()

  const form = useForm<CreateProduct>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      name: '',
      price: 0,
      description: '',
    },
  })

  const onSubmit = async (data: CreateProduct) => {
    try {
      await createProduct.mutateAsync(data)
      toast.success('Product created successfully')
      form.reset()
    } catch (error) {
      toast.error('Failed to create product')
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Name</FormLabel>
              <FormControl>
                <Input placeholder="MacBook Pro" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="2499.99"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input placeholder="16-inch M3 Max" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={createProduct.isPending}>
          {createProduct.isPending ? 'Creating...' : 'Create Product'}
        </Button>
      </form>
    </Form>
  )
}
```

**4c. Create Products List Page**

```typescript
// apps/web-main/app/products/page.tsx
'use client'

import { useProducts } from '@/lib/api/products'
import { CreateProductForm } from '@/components/products/create-product-form'

export default function ProductsPage() {
  const { data: products, isLoading } = useProducts()

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold">Products</h1>

      <div className="mt-8 grid grid-cols-2 gap-8">
        {/* Create Form */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Create Product</h2>
          <CreateProductForm />
        </div>

        {/* Products List */}
        <div>
          <h2 className="text-xl font-semibold mb-4">All Products</h2>
          <div className="space-y-4">
            {products?.map((product) => (
              <div key={product.id} className="border rounded-lg p-4">
                <h3 className="font-semibold">{product.name}</h3>
                <p className="text-2xl font-bold">${product.price}</p>
                <p className="text-sm text-gray-600">{product.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

#### Step 5: Implement UI - Mobile (apps/mobile-customer)

```typescript
// apps/mobile-customer/hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Product, CreateProduct } from '@workspace/contracts'

const API_URL = process.env.EXPO_PUBLIC_API_URL

export function useProducts(limit = 20) {
  return useQuery({
    queryKey: ['products', { limit }],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/products?limit=${limit}`)
      return res.json() as Promise<Product[]>
    },
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateProduct) => {
      const res = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return res.json() as Promise<Product>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
```

```typescript
// apps/mobile-customer/app/(tabs)/products.tsx
import { View, Text, FlatList } from 'react-native'
import { useProducts } from '@/hooks/useProducts'

export default function ProductsScreen() {
  const { data: products, isLoading } = useProducts()

  if (isLoading) {
    return <Text>Loading...</Text>
  }

  return (
    <View className="flex-1 p-4">
      <Text className="text-2xl font-bold mb-4">Products</Text>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="border rounded-lg p-4 mb-4">
            <Text className="font-semibold text-lg">{item.name}</Text>
            <Text className="text-xl font-bold">${item.price}</Text>
            <Text className="text-gray-600">{item.description}</Text>
          </View>
        )}
      />
    </View>
  )
}
```

## Common Development Tasks

### Adding a New API Endpoint

```bash
# 1. Define in contracts
vim packages/contracts/src/api/users.ts

# 2. Implement in API
vim apps/api-public/src/routes/users.ts

# 3. Test
curl http://localhost:3001/api/users

# 4. Use in UI
vim apps/web-main/lib/api/users.ts
```

### Adding a New Shared Component

```bash
# Use PlopJS generator
pnpm plop component

# Or manually:
vim packages/ui/src/components/product-card.tsx

# Export it
vim packages/ui/src/index.ts

# Use in app
import { ProductCard } from '@workspace/ui'
```

### Adding a New Web App

```bash
# Use PlopJS generator
pnpm plop web

# Enter: "analytics"
# Creates: apps/web-analytics

# Or manually:
cd apps
pnpm create next-app@latest web-analytics --typescript --tailwind

# Add to pnpm-workspace.yaml (already includes apps/*)
```

### Updating Database Schema

```bash
# 1. Edit schema
vim packages/db/src/schema/products.ts

# 2. Generate migration
cd packages/db
pnpm db:generate

# 3. Apply migration
pnpm db:migrate

# 4. View in Drizzle Studio
pnpm db:studio
```

### Running Tests

```bash
# All tests
pnpm test

# Watch mode
pnpm test:watch

# Specific package
pnpm test --filter=api-public

# E2E tests
pnpm test:e2e
```

### Code Quality Checks

```bash
# Lint & format (Biome)
pnpm check

# Type check all packages
pnpm typecheck

# Run all checks (pre-commit)
pnpm lint && pnpm typecheck && pnpm test
```

## Git Workflow

### Feature Branch Flow

```bash
# 1. Create feature branch
git checkout -b feat/add-products

# 2. Make changes (as shown above)
# ... develop feature ...

# 3. Lefthook runs on commit (auto lint/format)
git add .
git commit -m "feat: add product management"

# 4. Push (Lefthook runs tests)
git push origin feat/add-products

# 5. Create PR
gh pr create --title "Add product management"

# 6. CI runs (GitHub Actions)
# - Type check
# - Tests
# - Build all apps

# 7. Merge to main
gh pr merge
```

### Commit Convention

Follow Conventional Commits:

```bash
feat: add product API
fix: handle empty product list
docs: update API documentation
style: format code with Biome
refactor: simplify product query
test: add product creation tests
chore: update dependencies
```

## Debugging

### API Debugging

```bash
# View Fastify logs
pnpm --filter=api-public dev

# Or use Fastify logger
fastify.log.info({ product }, 'Creating product')
```

### Next.js Debugging

```typescript
// Use console.log (removed in production)
console.log('User data:', user)

// Or use Next.js debug mode
DEBUG=* pnpm dev
```

### Database Debugging

```bash
# Open Drizzle Studio
pnpm db:studio

# View query logs
db.select().from(products).$debug()
```

## VS Code Shortcuts

```
Cmd/Ctrl + P: Quick file open
Cmd/Ctrl + Shift + F: Search across workspace
Cmd/Ctrl + `: Toggle terminal
F12: Go to definition
Shift + F12: Find all references
```

## Recommended VS Code Extensions

```json
{
  "recommendations": [
    "biomejs.biome",
    "bradlc.vscode-tailwindcss",
    "dbaeumer.vscode-eslint",
    "prisma.prisma",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

## Production Build

```bash
# Build all apps
pnpm build

# Build specific app
pnpm build --filter=web-main

# Preview production build
cd apps/web-main
pnpm start
```

## Summary: Your Typical Day

```
1. git pull                    # Get latest
2. pnpm install               # Install deps
3. pnpm dev                   # Start all apps
4. Edit contracts/            # Define API
5. Edit apps/api-public/      # Implement backend
6. Edit apps/web-main/        # Implement frontend
7. Test manually              # Click around
8. pnpm test                  # Run tests
9. git commit                 # Lefthook auto-formats
10. git push                   # CI runs
11. Create PR                  # Deploy preview
12. Merge                      # Deploy to prod
```

**The flow is smooth because:**
- ✅ Types are shared (no API mismatches)
- ✅ Hot reload works (see changes instantly)
- ✅ Validation is shared (same schemas everywhere)
- ✅ Components are reusable (build once)
- ✅ Linting is automatic (Lefthook)
- ✅ Everything is type-safe (TypeScript + Zod)

This is the **AI-friendly monorepo advantage**! 🚀
