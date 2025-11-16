# Backend Development Setup Guide

This guide walks you through setting up the [prompt-backend](https://github.com/r33drichards/prompt-backend) for local development alongside this frontend application.

## Prerequisites

- **Docker & Docker Compose**: For running infrastructure services
- **Rust & Cargo**: For building and running the backend (or use Nix)
- **Nix** (recommended): For reproducible development environment
- **Git**: For cloning the repository
- **GitHub Personal Access Token**: For git operations in sandboxes

## Quick Start (15 minutes)

### Step 1: Start Infrastructure Services

From this frontend repository directory, start all the required infrastructure:

```bash
# Start PostgreSQL, Redis, Keycloak, Prometheus, and Grafana
docker compose -f docker-compose.backend.yml up -d

# Wait for all services to be healthy (30-60 seconds)
docker compose -f docker-compose.backend.yml ps
```

You should see all services with status "Up (healthy)".

### Step 2: Clone and Setup Backend

```bash
# Navigate to your workspace directory
cd ~/workspace  # or wherever you keep your projects

# Clone the backend repository
git clone https://github.com/r33drichards/prompt-backend.git
cd prompt-backend

# Copy environment template
cp .env.example .env
```

### Step 3: Configure Environment Variables

Edit the `.env` file with your credentials:

```bash
# Database (from docker-compose)
DATABASE_URL=postgres://promptuser:promptpass@localhost:5432/prompt_backend

# Redis (from docker-compose)
REDIS_URL=redis://127.0.0.1:6379/

# Keycloak (from docker-compose)
KEYCLOAK_ISSUER=http://localhost:8080/realms/oauth2-realm
KEYCLOAK_JWKS_URI=http://localhost:8080/realms/oauth2-realm/protocol/openid-connect/certs

# GitHub Token - Create at: https://github.com/settings/tokens
# Required scopes: repo, user:email
GITHUB_TOKEN=ghp_your_personal_access_token_here

# Anthropic API Key - Get from: https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-your_api_key_here

# IP Allocator URL (if you have one, otherwise comment out)
# IP_ALLOCATOR_URL=http://localhost:8001
```

**Important**: You need to create:
- **GitHub Personal Access Token**: https://github.com/settings/tokens/new
  - Select scopes: `repo`, `user:email`
- **Anthropic API Key**: https://console.anthropic.com/account/keys

### Step 4: Setup Keycloak Realm

The backend requires a Keycloak realm named `oauth2-realm` with specific configuration.

**Option A: Import from backend repository** (if available)

```bash
# If the backend has a keycloak/oauth2-realm.json file
docker cp keycloak/oauth2-realm.json prompt-backend-keycloak:/tmp/
docker exec -it prompt-backend-keycloak /opt/keycloak/bin/kc.sh import --file /tmp/oauth2-realm.json
```

**Option B: Manual setup**

1. Go to http://localhost:8080/admin
2. Login with admin/admin
3. Create a new realm called `oauth2-realm`
4. Create a client:
   - Client ID: `prompt-submission-ui`
   - Client Protocol: `openid-connect`
   - Access Type: `public`
   - Valid Redirect URIs: `http://localhost:5173/*`
   - Web Origins: `http://localhost:5173`
5. Create a test user:
   - Username: `testuser`
   - Email: `testuser@example.com`
   - Set password: `testpass` (disable temporary)

### Step 5: Run Database Migrations

**Using Nix** (recommended):

```bash
cd ~/workspace/prompt-backend
nix develop --command cargo run -- --server
# Migrations run automatically on startup
```

**Without Nix**:

```bash
cd ~/workspace/prompt-backend

# Install Rust if needed
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Run migrations
cargo run -- --server
```

The backend will:
- Run database migrations automatically
- Start the web server on port 8000
- Start all background task workers

### Step 6: Verify Backend is Running

Check the health endpoint:

```bash
curl http://localhost:8000/health
# Should return: {"status":"ok"}
```

View API documentation:
- Swagger UI: http://localhost:8000/swagger-ui/
- RapiDoc: http://localhost:8000/rapidoc/

### Step 7: Update Frontend Configuration

Ensure your frontend `.env.development` is configured correctly:

```bash
VITE_OIDC_AUTHORITY=http://localhost:8080/realms/oauth2-realm
VITE_OIDC_CLIENT_ID=prompt-submission-ui
VITE_OIDC_REDIRECT_URI=http://localhost:5173/authentication/callback
VITE_OIDC_SCOPE=openid profile email
VITE_BACKEND_URL=http://localhost:8000
```

### Step 8: Start Frontend

```bash
# From this repository
npm install
npm run dev
```

Visit http://localhost:5173 and you should be redirected to Keycloak for login.

## Architecture Overview

```
Frontend (5173) ──OIDC──> Keycloak (8080)
                             │
                             │ JWT
                             ▼
Frontend (5173) ──API──> Backend (8000) ──> PostgreSQL (5432)
                                        └──> Redis (6379)
```

## Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | - |
| Backend API | http://localhost:8000 | JWT required |
| Swagger UI | http://localhost:8000/swagger-ui/ | - |
| Keycloak | http://localhost:8080 | admin/admin |
| Keycloak Admin | http://localhost:8080/admin | admin/admin |
| Prometheus | http://localhost:9090 | - |
| Grafana | http://localhost:3000 | admin/admin |
| PostgreSQL | localhost:5432 | promptuser/promptpass |
| Redis | localhost:6379 | - |

## Common Development Tasks

### View Backend Logs

```bash
# If running with cargo
# Logs are in stdout where you ran the command

# Check background task activity
# Look for log lines containing "Processing outbox job" or "Prompt poller"
```

### Access Database

```bash
# Using Docker
docker exec -it prompt-backend-postgres psql -U promptuser -d prompt_backend

# Using psql directly
psql postgres://promptuser:promptpass@localhost:5432/prompt_backend

# Useful queries
\dt                          # List tables
SELECT * FROM sessions;      # View sessions
SELECT * FROM prompts;       # View prompts
SELECT * FROM messages;      # View messages
```

### Access Redis

```bash
docker exec -it prompt-backend-redis redis-cli

# Useful commands
KEYS *                       # List all keys
GET key_name                 # Get value
FLUSHALL                     # Clear all data (use with caution!)
```

### Restart Backend

```bash
# Stop the running backend (Ctrl+C in the terminal)

# Start again
cd ~/workspace/prompt-backend
nix develop --command cargo run -- --server
```

### Rebuild Backend After Code Changes

```bash
cd ~/workspace/prompt-backend

# Run tests
cargo test

# Check formatting
cargo fmt -- --check

# Run clippy
cargo clippy -- -D warnings

# Rebuild and run
cargo run -- --server
```

### View Metrics

The backend exposes Prometheus metrics at http://localhost:8000/metrics

Key metrics to watch:
- `apalis_jobs_total` - Total jobs processed
- `apalis_jobs_duration_seconds` - Job processing duration
- `http_requests_total` - HTTP request count
- `http_request_duration_seconds` - HTTP request latency

View in Prometheus: http://localhost:9090/graph

### Reset Everything

To start fresh:

```bash
# Stop and remove all Docker containers and data
docker compose -f docker-compose.backend.yml down -v

# Start again
docker compose -f docker-compose.backend.yml up -d

# Reconfigure Keycloak (follow Step 4 again)

# Run backend (migrations will recreate tables)
cd ~/workspace/prompt-backend
nix develop --command cargo run -- --server
```

## Troubleshooting

### Backend won't start - "connection refused"

**Problem**: Backend can't connect to PostgreSQL or Redis

**Solution**:
```bash
# Check services are running
docker compose -f docker-compose.backend.yml ps

# Check PostgreSQL
docker exec prompt-backend-postgres pg_isready -U promptuser -d prompt_backend

# Check Redis
docker exec prompt-backend-redis redis-cli ping
```

### Keycloak admin console not accessible

**Problem**: Keycloak is starting up (takes 30-60 seconds)

**Solution**:
```bash
# Check Keycloak logs
docker compose -f docker-compose.backend.yml logs -f keycloak

# Wait for: "Keycloak ... started"
```

### Frontend shows "401 Unauthorized"

**Problem**: JWT validation failing

**Solutions**:
1. Check you're logged in (visit http://localhost:5173)
2. Check backend can reach Keycloak:
   ```bash
   curl http://localhost:8080/realms/oauth2-realm/.well-known/openid-configuration
   ```
3. Check backend logs for JWT validation errors

### Background tasks not processing prompts

**Problem**: Backend started without `--server` flag

**Solution**:
```bash
# Restart with --server flag
cargo run -- --server
```

### Database migrations fail

**Problem**: Database schema mismatch or corrupted state

**Solution**:
```bash
# Reset database
docker compose -f docker-compose.backend.yml down -v
docker compose -f docker-compose.backend.yml up -d postgres

# Wait for PostgreSQL to be ready
docker exec prompt-backend-postgres pg_isready -U promptuser -d prompt_backend

# Run backend again (migrations will recreate schema)
cargo run -- --server
```

## Development Workflow

### Typical Development Session

1. **Start infrastructure** (once per day):
   ```bash
   docker compose -f docker-compose.backend.yml up -d
   ```

2. **Start backend** (in one terminal):
   ```bash
   cd ~/workspace/prompt-backend
   nix develop --command cargo run -- --server
   ```

3. **Start frontend** (in another terminal):
   ```bash
   npm run dev
   ```

4. **Make changes**, refresh browser, repeat!

5. **Stop everything** (end of day):
   ```bash
   # Ctrl+C in backend terminal
   # Ctrl+C in frontend terminal
   docker compose -f docker-compose.backend.yml down
   ```

### Working on Backend and Frontend Together

When you need to modify both:

1. **Make backend changes**
2. **Test in Swagger UI** (http://localhost:8000/swagger-ui/)
3. **Update frontend** to use new API
4. **Test in browser**

The backend has hot-reload for code changes (via `cargo watch` if installed):

```bash
# Install cargo-watch
cargo install cargo-watch

# Run with auto-reload
cargo watch -x 'run -- --server'
```

## Additional Resources

- **Backend Repository**: https://github.com/r33drichards/prompt-backend
- **Backend Architecture**: See `BACKEND_ARCHITECTURE.md` in this repo
- **Backend CLAUDE.md**: Detailed developer guide in backend repo
- **Backend SETUP_LOCAL.md**: Original setup guide in backend repo
- **API Client**: See `BACKEND_CLIENT.md` in this repo for using the TypeScript SDK

## Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Review backend logs for error messages
3. Check Docker container logs: `docker compose -f docker-compose.backend.yml logs [service-name]`
4. Consult backend repository documentation
5. Check backend issues: https://github.com/r33drichards/prompt-backend/issues

## Next Steps

Once you have everything running:

- Read [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md) to understand the backend design
- Review [BACKEND_CLIENT.md](./BACKEND_CLIENT.md) to learn about the TypeScript API client
- Explore the API in Swagger UI: http://localhost:8000/swagger-ui/
- Set up monitoring dashboards in Grafana: http://localhost:3000
