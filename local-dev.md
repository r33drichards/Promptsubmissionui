# Local Development Setup

This guide will help you set up the Prompt Submission UI for local development using Docker Compose.

## Prerequisites

- Docker and Docker Compose installed on your machine
- Git
- A GitHub Personal Access Token (for backend git operations)
- An Anthropic API Key (for AI-powered features)

## Quick Start

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd Promptsubmissionui
   ```

2. **Set up environment variables**

   Create a `.env` file in the root directory:

   ```bash
   cp .env.docker .env
   ```

   Edit `.env` and add your API keys:

   ```env
   GITHUB_TOKEN=your_github_personal_access_token_here
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ```

   **GitHub Token Scopes Required:**
   - `repo`
   - `user:email`

3. **Start all services**

   ```bash
   docker-compose up -d
   ```

   This will start:
   - PostgreSQL database (port 5432)
   - Redis cache (port 6379)
   - Keycloak authentication server (port 8080)
   - Backend API (port 8000)
   - Frontend (port 3000)
   - Sandbox environment (port 8001)

4. **Wait for services to be healthy**

   Check service status:

   ```bash
   docker-compose ps
   ```

   All services should show as "healthy" or "running".

5. **Access the application**

   Open your browser and navigate to:

   ```
   http://localhost:3000
   ```

   You'll be redirected to Keycloak for authentication.

## Default Credentials

### Keycloak Admin Console

- URL: http://localhost:8080/admin
- Username: `admin`
- Password: `admin`

### Test User

- Username: `testuser`
- Email: `testuser@example.com`
- Password: `testpass`

## Service Details

### Frontend (React + Vite)

- **Port:** 3000
- **Configuration:** Environment variables in `docker-compose.yml`
- **Hot Reload:** Enabled via volume mounts

### Backend (Rust API)

- **Port:** 8000
- **Database:** PostgreSQL (prompt_backend)
- **Cache:** Redis
- **Auth:** Keycloak JWT validation

### Keycloak

- **Port:** 8080
- **Realm:** oauth2-realm
- **Database:** PostgreSQL (keycloak)
- **Realm Import:** `keycloak/oauth2-realm.json`

The realm configuration includes:
- Frontend client (`prompt-submission-ui`)
- Backend client (`prompt-backend`)
- Test user with credentials
- Audience mapper for JWT tokens

## Development Workflow

### Viewing Logs

View logs for a specific service:

```bash
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f keycloak
```

View all logs:

```bash
docker-compose logs -f
```

### Restarting Services

Restart a single service:

```bash
docker-compose restart frontend
```

Restart all services:

```bash
docker-compose restart
```

### Stopping Services

Stop all services:

```bash
docker-compose down
```

Stop and remove volumes (clean slate):

```bash
docker-compose down -v
```

### Rebuilding Services

If you make changes to the frontend source code, the changes will hot-reload automatically.

To rebuild the frontend container:

```bash
docker-compose up -d --build frontend
```

## Troubleshooting

### 401 Unauthorized Errors

If you see 401 errors after logging in:

1. Ensure Keycloak is running and healthy:
   ```bash
   docker-compose ps keycloak
   ```

2. Check backend logs for authentication errors:
   ```bash
   docker-compose logs backend | grep -i "error\|auth"
   ```

3. Verify the JWT token includes the correct audience:
   - Log in to the app
   - Open browser DevTools → Network tab
   - Find a request to `/sessions`
   - Check the Authorization header

### Keycloak Realm Not Imported

If the test user doesn't work:

1. Check Keycloak logs:
   ```bash
   docker-compose logs keycloak | grep -i import
   ```

2. You should see:
   ```
   Realm 'oauth2-realm' imported
   ```

3. If not, restart Keycloak:
   ```bash
   docker-compose restart keycloak
   ```

### Button Nesting Warning in Console

If you see React warnings about nested buttons, ensure you're running the latest version of the code with the multi-select component fixes.

### Database Connection Issues

If the backend can't connect to PostgreSQL:

1. Check if PostgreSQL is healthy:
   ```bash
   docker-compose ps postgres
   ```

2. Verify database exists:
   ```bash
   docker exec -it prompt-postgres psql -U promptuser -d prompt_backend -c "\dt"
   ```

### Port Conflicts

If you get port binding errors:

1. Check which process is using the port:
   ```bash
   # macOS/Linux
   lsof -i :3000
   lsof -i :8000
   lsof -i :8080
   ```

2. Stop the conflicting service or change the port mapping in `docker-compose.yml`

## Authentication Flow

1. User visits `http://localhost:3000`
2. Frontend checks if user is authenticated
3. If not, redirects to Keycloak login: `http://localhost:8080/realms/oauth2-realm`
4. User logs in with credentials
5. Keycloak redirects back to frontend with authorization code
6. Frontend exchanges code for JWT token
7. Frontend includes JWT token in API requests to backend
8. Backend validates JWT token with Keycloak's public keys
9. Backend checks audience claim includes `prompt-backend`
10. If valid, backend processes request

## Customizing Keycloak Realm

The realm configuration is stored in `keycloak/oauth2-realm.json`.

To make changes:

1. Log in to Keycloak admin console
2. Make changes to the oauth2-realm
3. Export the realm:
   - Realm Settings → Action → Partial Export
   - Select what to export
   - Download the JSON

4. Replace `keycloak/oauth2-realm.json` with the exported file
5. Restart Keycloak to import the updated realm

## Environment Variables Reference

### Frontend

- `VITE_BACKEND_URL` - Backend API URL (default: http://localhost:8000)
- `VITE_DISABLE_AUTH` - Disable authentication (default: false for local dev)
- `VITE_OIDC_AUTHORITY` - Keycloak realm URL
- `VITE_OIDC_CLIENT_ID` - OAuth client ID
- `VITE_OIDC_REDIRECT_URI` - OAuth callback URL
- `VITE_OIDC_SCOPE` - OAuth scopes
- `VITE_OIDC_SILENT_REDIRECT_URI` - Silent refresh URL

### Backend

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `GITHUB_TOKEN` - GitHub API token
- `ANTHROPIC_API_KEY` - Anthropic API key
- `IP_ALLOCATOR_URL` - Sandbox service URL
- `KEYCLOAK_ISSUER` - JWT token issuer URL
- `KEYCLOAK_JWKS_URI` - Keycloak JWKS endpoint
- `KEYCLOAK_URL` - Keycloak base URL
- `KEYCLOAK_REALM` - Keycloak realm name

## Running Frontend Locally (without Docker)

If you want to run the frontend outside of Docker:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment variables:
   ```bash
   cp .env.development .env.local
   ```

3. Start the dev server:
   ```bash
   npm run dev
   ```

4. Ensure backend and Keycloak are still running in Docker:
   ```bash
   docker-compose up -d backend keycloak postgres redis sandbox
   ```

## Additional Resources

- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Vite Documentation](https://vitejs.dev/)
