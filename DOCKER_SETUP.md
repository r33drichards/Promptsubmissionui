# Docker Compose Development Setup

This Docker Compose configuration provides a complete local development environment for the Prompt Submission application.

## Services Included

- **PostgreSQL** (port 5432): Main database for storing prompts, sessions, and messages
- **Redis** (port 6379): Cache and message queue
- **Backend API** (port 8000): Rust-based API server from [prompt-backend](https://github.com/r33drichards/prompt-backend)
- **Frontend** (port 3000): React + Vite development server with hot-reload
- **Sandbox** (port 8001): wholelottahoopla/sandbox Docker image for code execution

## Prerequisites

- Docker Engine 20.10+
- Docker Compose V2
- Git

## Quick Start

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone https://github.com/r33drichards/Promptsubmissionui.git
   cd Promptsubmissionui
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.docker .env
   ```
   
   Edit `.env` and add your:
   - `GITHUB_TOKEN`: Your GitHub personal access token
   - `ANTHROPIC_API_KEY`: Your Anthropic API key

3. **Start all services**:
   ```bash
   docker-compose up -d
   ```

4. **Initialize the database** (first time only):
   ```bash
   # Run migrations
   docker-compose exec backend rust-redis-webserver --migrate
   ```

5. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Sandbox: http://localhost:8001

## Development Workflow

### Hot Reload

The frontend container is configured with volume mounts for hot-reload during development:
- Changes to `src/` will automatically reload
- Changes to configuration files will also trigger reload

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f backend
```

### Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clears database)
docker-compose down -v
```

### Rebuilding Services

```bash
# Rebuild frontend after dependency changes
docker-compose build frontend

# Rebuild backend (pulls latest from GitHub)
docker-compose build backend --no-cache

# Rebuild all services
docker-compose build
```

## Service Details

### PostgreSQL
- **Database**: `prompt_backend`
- **User**: `promptuser`
- **Password**: `promptpass`
- **Port**: 5432
- **Data**: Persisted in `postgres_data` volume

### Redis
- **Port**: 6379
- **Data**: Persisted in `redis_data` volume

### Backend
- Built from https://github.com/r33drichards/prompt-backend
- Automatically runs database migrations on startup
- Connects to PostgreSQL, Redis, and Sandbox

### Frontend
- Vite dev server with HMR (Hot Module Replacement)
- Authentication disabled by default (`VITE_DISABLE_AUTH=true`)
- Source code mounted for live editing

### Sandbox
- Uses `wholelottahoopla/sandbox:latest`
- Provides isolated code execution environment
- Accessible at http://localhost:8001

## Troubleshooting

### Backend won't start
- Check if PostgreSQL is healthy: `docker-compose ps postgres`
- View backend logs: `docker-compose logs backend`
- Ensure environment variables are set correctly in `.env`

### Frontend build errors
- Rebuild with no cache: `docker-compose build frontend --no-cache`
- Check Node.js version compatibility

### Database connection issues
- Ensure PostgreSQL healthcheck passes
- Verify `DATABASE_URL` environment variable
- Check network connectivity: `docker-compose exec backend ping postgres`

### Port conflicts
If you have services already running on ports 3000, 5432, 6379, 8000, or 8001, you can modify the port mappings in `docker-compose.yml`.

## Networking

All services are connected via the `prompt-network` bridge network, allowing them to communicate using service names as hostnames (e.g., `postgres`, `redis`, `backend`).

## Data Persistence

- PostgreSQL data is stored in the `postgres_data` volume
- Redis data is stored in the `redis_data` volume
- To clear all data: `docker-compose down -v`

## Production Considerations

This setup is designed for **local development only**. For production:
- Use stronger database credentials
- Enable authentication (`VITE_DISABLE_AUTH=false`)
- Use production builds (`npm run build`)
- Configure proper HTTPS/TLS
- Set up proper monitoring and logging
- Review security settings for all services
