# Local Development Guide

Comprehensive guide for setting up and running the project template locally.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Development Modes](#development-modes)
- [Port Allocation](#port-allocation)
- [Quick Start](#quick-start)
- [Environment Configuration](#environment-configuration)
- [Caddy Setup](#caddy-setup)
- [Daily Workflow](#daily-workflow)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required

- **Node.js** ≥20 ([Download](https://nodejs.org/))
- **pnpm** 10.4.1+ ([Install](https://pnpm.io/installation))
- **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop/))

### Optional (for Caddy mode)

- **Caddy** 2.x ([Install Guide](https://caddyserver.com/docs/install))

**Installation on macOS:**
```bash
brew install caddy
```

**Installation on Windows:**
```powershell
# Using Chocolatey
choco install caddy

# Or download from https://caddyserver.com/download
```

**Installation on Linux:**
```bash
# Debian/Ubuntu
sudo apt install caddy

# Or use the official installation script
curl https://getcaddy.com | bash
```

## Development Modes

The template supports two development modes, each optimized for different use cases.

### Direct Mode (Default)

Each service runs on its own port with HTTP.

**When to use:**
- Quick prototyping
- No CORS issues in your workflow
- Debugging individual services
- Resource-constrained environments

**Ports:**
- API: http://localhost:3001
- Web: http://localhost:3000
- Mobile: http://localhost:8081
- PostgreSQL: localhost:5432
- Redis: localhost:6379

**Start command:**
```bash
pnpm dev
```

### Caddy Mode (Recommended)

All services behind a reverse proxy with HTTPS at a single origin.

**When to use:**
- Production-like environment
- Testing authentication flows (Better Auth cookies)
- Service workers and PWA features
- HTTPS-only browser APIs
- Avoiding CORS complexity

**Ports:**
- All apps: https://localhost
- PostgreSQL: localhost:5432
- Redis: localhost:6379

**Routing:**
- `https://localhost/api/*` → API server
- `https://localhost/*` → Web app

**Start command:**
```bash
pnpm dev:caddy
```

**Benefits:**
- ✓ Single origin (no CORS configuration needed)
- ✓ HTTPS certificates handled automatically
- ✓ Better Auth cookies work seamlessly (SameSite, Secure flags)
- ✓ Test service workers, WebCrypto, and other HTTPS-only APIs
- ✓ Production-like request routing

## Port Allocation

All ports are centrally defined in [packages/utils/src/config.ts](../packages/utils/src/config.ts).

| Service | Port | Protocol | Configurable |
|---------|------|----------|--------------|
| Web (Next.js) | 3000 | HTTP/HTTPS | Via `PORT` env var in Next.js |
| API (Fastify) | 3001 | HTTP/HTTPS | Via `PORT` env var |
| Mobile (Expo) | 8081 | HTTP | Expo default |
| PostgreSQL | 5432 | TCP | Docker Compose |
| Redis | 6379 | TCP | Docker Compose |
| Caddy HTTP | 80 | HTTP | Caddy config |
| Caddy HTTPS | 443 | HTTPS | Caddy config |

**Important:** If you change a port, update all of these locations:
1. `packages/utils/src/config.ts` - Source of truth
2. `.env.example` files (api, web, mobile)
3. `docker-compose.yml` - Infrastructure ports
4. `Caddyfile` - Reverse proxy targets

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Environment Variables

**API Server** (`apps/api/.env`):
```bash
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your settings
```

**Web App** (`apps/web/.env.local`):
```bash
cp apps/web/.env.example apps/web/.env.local
# Edit apps/web/.env.local with your settings
```

**Mobile App** (`apps/mobile/.env`):
```bash
cp apps/mobile/.env.example apps/mobile/.env
# Edit apps/mobile/.env with your settings
```

### 3. Start Development

**Direct Mode:**
```bash
pnpm dev
```

This will:
1. Start PostgreSQL in Docker
2. Wait for PostgreSQL to be ready
3. Run database migrations
4. Start all apps (API, Web, Mobile)

**Caddy Mode:**
```bash
pnpm dev:caddy
```

On first run, Caddy will:
1. Generate a local CA certificate
2. Ask for permission to install it in your system trust store
3. This enables HTTPS without browser warnings

Access your apps at:
- Direct mode: http://localhost:3000 (Web), http://localhost:3001 (API)
- Caddy mode: https://localhost (all apps)

## Environment Configuration

### Direct Mode Configuration

**apps/api/.env:**
```bash
NODE_ENV=development
PORT=3001

# CORS - Web app origin
CORS_ORIGIN=http://localhost:3000

# Auth URLs
BETTER_AUTH_URL=http://localhost:3001

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mydb

# Auth secret (generate with: openssl rand -base64 32)
BETTER_AUTH_SECRET=your-secret-key-minimum-32-characters-long
```

**apps/web/.env.local:**
```bash
# API endpoint
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**apps/mobile/.env:**
```bash
# API endpoint (use your computer's IP for physical devices)
EXPO_PUBLIC_API_URL=http://localhost:3001

# For physical devices:
# EXPO_PUBLIC_API_URL=http://192.168.1.100:3001
```

### Caddy Mode Configuration

**apps/api/.env:**
```bash
NODE_ENV=development
PORT=3001

# CORS - Single origin via Caddy
CORS_ORIGIN=https://localhost

# Auth URLs - Single origin via Caddy
BETTER_AUTH_URL=https://localhost

# Database (same as direct mode)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mydb

# Auth secret (same as direct mode)
BETTER_AUTH_SECRET=your-secret-key-minimum-32-characters-long
```

**apps/web/.env.local:**
```bash
# API endpoint via Caddy
NEXT_PUBLIC_API_URL=https://localhost
```

**apps/mobile/.env:**
```bash
# API endpoint via Caddy
EXPO_PUBLIC_API_URL=https://localhost

# Note: Caddy must be accessible from your device's network
```

### Production Safety

All environment schemas include production safety checks:

```typescript
// Development defaults are allowed
CORS_ORIGIN: z.string().url().default(
  process.env.NODE_ENV === "production"
    ? ""  // Empty string fails validation in production
    : DEFAULT_URLS.WEB
)
```

**This ensures:**
- Development: Defaults work automatically
- Production: Explicit configuration required (fails fast if missing)

## Caddy Setup

### Installation

See [Prerequisites](#prerequisites) for installation instructions.

### First-Time Setup

1. **Start Caddy with the project:**
   ```bash
   pnpm dev:caddy
   ```

2. **Install the local CA certificate:**

   Caddy will display a prompt asking to install its root certificate:
   ```
   Caddy is trying to install its CA certificate into your trust store.
   This is necessary for local HTTPS development.

   Do you want to continue? [y/N]
   ```

   Type `y` and press Enter.

3. **Grant system permissions:**

   Your OS will ask for admin/sudo password to install the certificate in the system trust store. This is safe and only affects your local machine.

4. **Verify HTTPS is working:**

   Open https://localhost in your browser. You should see:
   - ✓ Green padlock icon
   - ✓ Valid certificate for "localhost"
   - ✓ No security warnings

### Manual Caddy Management

**Start in foreground** (see logs):
```bash
caddy run
```

**Start in background:**
```bash
caddy start
```

**Stop background process:**
```bash
caddy stop
```

**Reload configuration** (zero-downtime):
```bash
caddy reload
```

**View running configuration:**
```bash
caddy adapt
```

### Caddy Configuration

The [Caddyfile](../Caddyfile) configures reverse proxy routing:

```caddyfile
{
  local_certs  # Generate local CA for HTTPS
}

localhost {
  reverse_proxy /api/* localhost:3001  # API routes
  reverse_proxy localhost:3000         # Web app (default)
}
```

**Customization examples:**

**Add subdomain routing:**
```caddyfile
api.localhost {
  reverse_proxy localhost:3001
}

web.localhost {
  reverse_proxy localhost:3000
}
```

**Add custom headers:**
```caddyfile
localhost {
  reverse_proxy /api/* localhost:3001 {
    header_up X-Real-IP {remote_host}
  }
  reverse_proxy localhost:3000
}
```

## Daily Workflow

### Starting Development

**Full stack (recommended):**
```bash
pnpm dev:caddy
```

**Just the apps** (infrastructure already running):
```bash
pnpm dev:apps
```

**With Redis cache:**
```bash
pnpm dev:full
```

### Managing Infrastructure

**Start infrastructure only:**
```bash
pnpm infra:up
```

**Stop infrastructure:**
```bash
pnpm infra:down
```

**View infrastructure logs:**
```bash
pnpm infra:logs
```

**Reset infrastructure** (remove volumes):
```bash
pnpm infra:reset
```

### Database Operations

**Run migrations:**
```bash
pnpm db:migrate
```

**Open Drizzle Studio** (database GUI):
```bash
pnpm db:studio
```

**Generate new migration:**
```bash
pnpm --filter @workspace/db db:generate
```

### Clean Start

Remove all Docker volumes and start fresh:
```bash
pnpm dev:clean
```

This is useful when:
- Database schema changes require a clean slate
- Docker volumes become corrupted
- Testing fresh installation flow

## Troubleshooting

### CORS Errors

**Symptom:**
```
Access to fetch at 'http://localhost:3001/api/users' from origin
'http://localhost:3000' has been blocked by CORS policy
```

**Solutions:**

1. **Check CORS_ORIGIN in API .env:**
   ```bash
   # apps/api/.env
   CORS_ORIGIN=http://localhost:3000
   ```

2. **Or switch to Caddy mode** (eliminates CORS):
   ```bash
   pnpm dev:caddy
   ```

   Update both .env files to use `https://localhost`.

### Better Auth Cookies Not Working

**Symptom:**
- Login appears to work but session is not persisted
- "Unauthorized" errors immediately after login

**Cause:** SameSite cookie restrictions in cross-origin scenarios.

**Solution:** Use Caddy mode for single-origin setup:
```bash
pnpm dev:caddy
```

Update .env files:
```bash
# apps/api/.env
CORS_ORIGIN=https://localhost
BETTER_AUTH_URL=https://localhost

# apps/web/.env.local
NEXT_PUBLIC_API_URL=https://localhost
```

### Port Already in Use

**Symptom:**
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solutions:**

1. **Find and kill the process:**
   ```bash
   # macOS/Linux
   lsof -ti:3001 | xargs kill -9

   # Windows
   netstat -ano | findstr :3001
   taskkill /PID <PID> /F
   ```

2. **Stop all Docker containers:**
   ```bash
   pnpm infra:down
   ```

3. **Change the port** in `packages/utils/src/config.ts` and update all .env files.

### PostgreSQL Health Check Timeout

**Symptom:**
```
❌ PostgreSQL health check timeout after 30 seconds
```

**Solutions:**

1. **Check Docker is running:**
   ```bash
   docker ps
   ```

2. **View PostgreSQL logs:**
   ```bash
   docker compose logs postgres
   ```

3. **Reset infrastructure:**
   ```bash
   pnpm infra:reset
   ```

### Caddy Certificate Trust Issues

**Symptom:**
- Browser shows "Your connection is not private"
- Certificate errors despite installing Caddy CA

**Solutions:**

1. **Re-install Caddy's root certificate:**
   ```bash
   caddy stop
   caddy trust
   caddy start
   ```

2. **Check certificate installation:**
   ```bash
   caddy trust --check
   ```

3. **Clear browser cache and restart browser**

4. **Verify Caddyfile syntax:**
   ```bash
   caddy adapt
   ```

### Mobile App Can't Connect to API

**Symptom:**
- "Network request failed" errors on mobile device
- API works in web browser

**Solutions:**

1. **Use your computer's IP address instead of localhost:**
   ```bash
   # Find your IP
   # macOS/Linux: ifconfig | grep "inet "
   # Windows: ipconfig

   # Update apps/mobile/.env
   EXPO_PUBLIC_API_URL=http://192.168.1.100:3001
   ```

2. **Ensure your device is on the same network as your computer**

3. **Disable firewall or allow incoming connections on port 3001**

4. **For Caddy mode:** Ensure Caddy is accessible on your network (may require network configuration)

### Database Connection Errors

**Symptom:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solutions:**

1. **Start PostgreSQL:**
   ```bash
   pnpm infra:up
   ```

2. **Check PostgreSQL is running:**
   ```bash
   docker compose ps
   ```

3. **Verify DATABASE_URL:**
   ```bash
   # Should match docker-compose.yml settings
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mydb
   ```

4. **Reset database:**
   ```bash
   pnpm infra:reset
   pnpm db:migrate
   ```

### Migration Failures

**Symptom:**
```
Error: relation "users" already exists
```

**Solution:**

Reset the database and re-run migrations:
```bash
pnpm infra:down -v  # Remove volumes
pnpm dev            # Will recreate and migrate
```

### Environment Variables Not Loading

**Symptom:**
- "Invalid environment variables" errors
- Variables are undefined at runtime

**Solutions:**

1. **Check file names:**
   - API: `apps/api/.env` (not `.env.local`)
   - Web: `apps/web/.env.local` (not `.env`)
   - Mobile: `apps/mobile/.env`

2. **Restart dev server after changing .env files**

3. **Verify .env files exist:**
   ```bash
   ls -la apps/api/.env
   ls -la apps/web/.env.local
   ls -la apps/mobile/.env
   ```

4. **Check for syntax errors in .env files** (no quotes needed for values)

## Additional Resources

- [Architecture Overview](../ARCHITECTURE.md)
- [Development Workflow](development-workflow.md)
- [Better Auth Implementation](better-auth-implementation.md)
- [Error Handling](error-handling.md)
- [Security Guide](security.md)
- [Performance Guide](performance.md)

## Support

For issues not covered in this guide:

1. Check existing [GitHub Issues](https://github.com/your-repo/issues)
2. Review package-specific READMEs in `packages/*/README.md`
3. Check the [Documentation Index](README.md)
