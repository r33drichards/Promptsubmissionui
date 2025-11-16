# Backend Architecture Guide

## Repository
- **URL**: https://github.com/r33drichards/prompt-backend
- **Tech Stack**: Rust + Rocket + PostgreSQL + Redis + Keycloak OAuth

## Overview

The prompt-backend is a Rust web service that manages AI-powered code assistance sessions. It orchestrates Claude Code CLI executions in sandboxed environments, handles OAuth authentication via Keycloak, and manages background job processing with Apalis.

## Core Architecture

### Technology Stack

- **Web Framework**: Rocket 0.5 (async web framework with OpenAPI support)
- **Database**: PostgreSQL 15 (via SeaORM)
- **Cache/Queue**: Redis 7
- **Auth**: Keycloak OAuth 2.0 / JWT validation
- **Background Jobs**: Apalis (database-backed job queue)
- **Monitoring**: Prometheus metrics + Grafana
- **Build System**: Nix flakes for reproducible builds

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (Browser)                        │
│                    http://localhost:5173                     │
└────────────────────────────┬────────────────────────────────┘
                             │ OIDC Auth Flow
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   Keycloak (OAuth Provider)                  │
│                    http://localhost:8080                     │
│  - Handles GitHub OAuth                                      │
│  - Issues JWT tokens                                         │
│  - Manages users and sessions                                │
└────────────────────────────┬────────────────────────────────┘
                             │ JWT Bearer Tokens
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              Rocket Web Server (Port 8000)                   │
│                                                              │
│  Protected Endpoints:                                        │
│  - POST /sessions (create new session)                       │
│  - GET /sessions (list user's sessions)                      │
│  - GET /sessions/:id (get session details)                   │
│  - POST /prompts (submit prompt to session)                  │
│  - GET /prompts/:id/messages (stream Claude responses)       │
│                                                              │
│  Public Endpoints:                                           │
│  - GET /health (health check)                                │
│  - GET /metrics (Prometheus metrics)                         │
│  - GET /swagger-ui/ (API documentation)                      │
└───────┬─────────────────────┬──────────────────┬────────────┘
        │                     │                  │
        ▼                     ▼                  ▼
┌──────────────┐   ┌──────────────────┐   ┌─────────────┐
│  PostgreSQL  │   │      Redis       │   │  Keycloak   │
│   (Port      │   │   (Port 6379)    │   │   JWKS      │
│    5432)     │   │                  │   │  Endpoint   │
│              │   │  - Apalis Queue  │   │             │
│  Tables:     │   │  - Cache         │   └─────────────┘
│  - sessions  │   └──────────────────┘
│  - prompts   │
│  - messages  │
│  - dlq       │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│              Background Task Workers (Apalis)                │
│                                                              │
│  1. Outbox Publisher                                         │
│     - Processes new prompts                                  │
│     - Borrows sandbox from IP allocator                      │
│     - Clones GitHub repo                                     │
│     - Runs Claude Code CLI                                   │
│     - Streams results to messages table                      │
│                                                              │
│  2. Prompt Poller                                            │
│     - Polls for new prompts in Pending status                │
│     - Enqueues jobs for processing                           │
│                                                              │
│  3. IP Return Poller                                         │
│     - Returns borrowed IPs when sessions complete            │
│     - Cleans up sandbox resources                            │
│                                                              │
│  4. Cancellation Enforcer                                    │
│     - Terminates long-running or cancelled sessions          │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### Sessions Table
The core entity representing a user's work session.

```rust
pub struct Session {
    pub id: Uuid,                           // Primary key
    pub user_id: String,                    // From JWT "sub" claim
    pub repo: Option<String>,               // GitHub repo (e.g., "owner/repo")
    pub target_branch: Option<String>,      // Base branch (e.g., "main")
    pub branch: Option<String>,             // Working branch
    pub title: Option<String>,              // Auto-generated title
    pub session_status: SessionStatus,      // Active, Completed, Failed, etc.
    pub inbox_status: InboxStatus,          // Pending, Processing, Completed
    pub messages: Option<Json>,             // Conversation history
    pub sbx_config: Option<Json>,           // Sandbox configuration
    pub status_message: Option<String>,     // Human-readable status
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}
```

**Session Status Flow:**
```
Active → Processing → ReturningIp → Archived
   ↓
Cancelled / Failed
```

### Prompts Table
User prompts/requests submitted to a session.

```rust
pub struct Prompt {
    pub id: Uuid,                           // Primary key
    pub session_id: Uuid,                   // Foreign key to sessions
    pub data: Json,                         // Prompt content/metadata
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

### Messages Table
Claude Code responses streamed during prompt processing.

```rust
pub struct Message {
    pub id: Uuid,                           // Primary key
    pub prompt_id: Uuid,                    // Foreign key to prompts
    pub data: Json,                         // Message content (streaming JSON)
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

### Dead Letter Queue (DLQ)
Failed jobs for manual inspection/retry.

```rust
pub struct DeadLetterQueue {
    pub id: Uuid,
    pub job_type: String,                   // Type of failed job
    pub payload: Json,                      // Original job data
    pub error: String,                      // Error message
    pub created_at: DateTime<Utc>,
}
```

## Authentication Flow

### OAuth 2.0 with Keycloak

1. **User visits frontend** → Redirected to Keycloak login
2. **User authenticates** via GitHub OAuth or username/password
3. **Keycloak issues JWT** with claims: `sub` (user_id), `email`, `name`
4. **Frontend stores JWT** in memory/localStorage
5. **API requests include** `Authorization: Bearer <jwt>`
6. **Backend validates JWT** using JWKS from Keycloak

### Request Guard Implementation

Every protected endpoint uses the `AuthenticatedUser` guard:

```rust
#[post("/sessions", data = "<input>")]
pub async fn create(
    db: &State<DatabaseConnection>,
    user: AuthenticatedUser,  // ← Automatic JWT validation
    input: Json<CreateSessionInput>,
) -> OResult<CreateSessionOutput> {
    // user.user_id contains the "sub" claim from JWT
}
```

The guard (`src/auth/guard.rs`):
- Extracts JWT from `Authorization` header
- Validates signature using cached JWKS
- Extracts claims (user_id, email)
- Returns 401 if invalid/expired

## Background Task System (Apalis)

### Task Registration

All background tasks are registered in `src/bg_tasks/mod.rs`:

```rust
pub const OUTBOX_PUBLISHER: &str = "outbox-publisher";
pub const PROMPT_POLLER: &str = "prompt-poller";
pub const IP_RETURN_POLLER: &str = "ip-return-poller";
pub const CANCELLATION_ENFORCER: &str = "cancellation-enforcer";
```

### Task 1: Prompt Poller

**Purpose**: Continuously polls database for new prompts and enqueues processing jobs.

**Implementation**: `src/bg_tasks/prompt_poller.rs`

**Logic**:
```rust
loop {
    // Every 5 seconds
    sleep(Duration::from_secs(5)).await;
    
    // Find prompts in Pending status
    let pending_prompts = Prompt::find()
        .filter(prompt::Column::Status.eq("Pending"))
        .all(&db)
        .await?;
    
    // Enqueue each as OutboxJob
    for prompt in pending_prompts {
        storage.push(OutboxJob {
            prompt_id: prompt.id.to_string(),
            payload: prompt.data,
        }).await?;
        
        // Mark as enqueued to avoid duplicates
    }
}
```

### Task 2: Outbox Publisher (The Heavy Lifter)

**Purpose**: Processes prompts by running Claude Code CLI in sandboxed environments.

**Implementation**: `src/bg_tasks/outbox_publisher.rs`

**Workflow**:

```rust
pub async fn process_outbox_job(job: OutboxJob, ctx: Data<OutboxContext>) -> Result<(), Error> {
    // 1. Load prompt and session from database
    let prompt = Prompt::find_by_id(job.prompt_id).one(&ctx.db).await?;
    let session = Session::find_by_id(prompt.session_id).one(&ctx.db).await?;
    
    // 2. Borrow sandbox IP from allocator
    let ip_allocator_url = env::var("IP_ALLOCATOR_URL")?;
    let ip_client = ip_allocator_client::Client::new(&ip_allocator_url);
    let borrowed_ip = ip_client.handlers_ip_borrow(None).await?;
    
    // 3. Setup sandbox environment
    let sbx = sandbox_client::Client::new(&borrowed_ip.api_url);
    
    // Authenticate with GitHub
    sbx.exec_command(&format!("echo '{}' | gh auth login --with-token", github_token)).await?;
    
    // Clone repository
    let repo_dir = format!("repo_{}", session.id);
    sbx.exec_command(&format!("git clone {} {}", session.repo, repo_dir)).await?;
    
    // Checkout target branch
    sbx.exec_command(&format!("git checkout {}", session.target_branch)).await?;
    
    // Create/checkout working branch
    sbx.exec_command(&format!("git checkout {} || git switch -c {}", branch, branch)).await?;
    
    // 4. Run Claude Code CLI (fire-and-forget spawned task)
    tokio::spawn(async move {
        // Create temp directory for MCP config
        let temp_dir = tempfile::Builder::new()
            .prefix(&format!("claude_session_{}_", session_id))
            .tempdir()?;
        
        // Write MCP config
        fs::write(temp_dir.path().join("mcp_config.json"), &mcp_json_string)?;
        
        // Load system prompt from embedded file
        let system_prompt = include_str!("../../prompts/outbox_handler_system_prompt.md")
            .replace("{{repo_path}}", &repo_path)
            .replace("{{repo_name}}", &session.repo)
            .replace("{{branch}}", &branch);
        
        // Execute Claude CLI with streaming output
        let mut child = Command::new("claude")
            .args([
                "--dangerously-skip-permissions",
                "--print",
                "--output-format=stream-json",
                "--session-id", &session_id,
                "--allowedTools", "WebSearch,mcp__*",
                "--disallowedTools", "Bash,Edit,Write",
                "--append-system-prompt", &system_prompt,
                "-p", &prompt_content,
                "--mcp-config", mcp_config_path,
            ])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()?;
        
        // Stream stdout line-by-line to messages table
        let stdout_reader = BufReader::new(child.stdout.take()?);
        for line in stdout_reader.lines() {
            let json = serde_json::from_str(&line?)?;
            
            // Insert each message into database
            let new_message = message::ActiveModel {
                id: Set(Uuid::new_v4()),
                prompt_id: Set(prompt_id),
                data: Set(json),
                created_at: NotSet,
                updated_at: NotSet,
            };
            new_message.insert(&db).await?;
        }
        
        // Wait for process completion
        child.wait()?;
        
        // Return borrowed IP (always, even on failure)
        ip_client.handlers_ip_return_item(&ReturnInput {
            item: borrowed_ip.item
        }).await?;
    });
    
    Ok(())
}
```

**Key Features**:
- **Fire-and-forget spawning**: Main job returns quickly, spawned task runs for hours
- **Streaming JSON**: Claude output piped line-by-line to database
- **MCP Integration**: Sandbox access via Model Context Protocol
- **Resource cleanup**: Always returns borrowed IP, even on failure

### Task 3: IP Return Poller

**Purpose**: Cleans up sandbox resources when sessions complete.

**Implementation**: `src/bg_tasks/ip_return_poller.rs`

**Logic**:
```rust
loop {
    sleep(Duration::from_secs(5)).await;
    
    // Find sessions in ReturningIp status
    let sessions = Session::find()
        .filter(session::Column::SessionStatus.eq(SessionStatus::ReturningIp))
        .filter(session::Column::SbxConfig.is_not_null())
        .all(&db)
        .await?;
    
    for session in sessions {
        // Return IP to allocator
        ip_client.handlers_ip_return_item(&session.sbx_config).await?;
        
        // Update session to Archived
        session.update()
            .set(session::Column::SessionStatus, SessionStatus::Archived)
            .set(session::Column::SbxConfig, None)
            .exec(&db)
            .await?;
    }
}
```

### Task 4: Cancellation Enforcer

**Purpose**: Terminates sessions that run too long or are cancelled by user.

**Implementation**: `src/bg_tasks/cancellation_enforcer.rs`

## API Endpoints

### Session Management

**POST /sessions**
- **Auth**: Required (JWT)
- **Body**: 
  ```json
  {
    "repo": "owner/repo",
    "target_branch": "main",
    "title": "Fix login bug"
  }
  ```
- **Response**: Created session with ID
- **Side Effects**: Creates session in database, auto-generates title via Anthropic API

**GET /sessions**
- **Auth**: Required (JWT)
- **Response**: Array of user's sessions
- **Filters**: By status, date range, repo

**GET /sessions/:id**
- **Auth**: Required (JWT)
- **Response**: Session details including status and prompts

**DELETE /sessions/:id**
- **Auth**: Required (JWT)
- **Side Effects**: Soft-deletes session (sets `deleted_at`)

### Prompt Management

**POST /prompts**
- **Auth**: Required (JWT)
- **Body**:
  ```json
  {
    "session_id": "uuid",
    "data": {
      "content": "Add unit tests for authentication"
    }
  }
  ```
- **Response**: Created prompt with ID
- **Side Effects**: Creates prompt, prompt_poller picks it up for processing

**GET /prompts/:id/messages**
- **Auth**: Required (JWT)
- **Response**: Array of messages (streaming Claude responses)
- **Format**: 
  ```json
  [
    {
      "id": "uuid",
      "prompt_id": "uuid",
      "data": { /* Claude streaming JSON */ },
      "created_at": "2025-01-01T12:00:00Z"
    }
  ]
  ```

### System Endpoints

**GET /health**
- **Auth**: None
- **Response**: `{ "status": "ok" }`

**GET /metrics**
- **Auth**: None
- **Response**: Prometheus metrics (text format)
- **Metrics**:
  - Job success/failure rates
  - Job duration histograms
  - Queue depths
  - HTTP request counts/latencies

**GET /swagger-ui/**
- **Auth**: None
- **Response**: Interactive API documentation

## Environment Configuration

Required environment variables (see `.env.example`):

```bash
# Database
DATABASE_URL=postgres://promptuser:promptpass@localhost:5432/prompt_backend

# Redis
REDIS_URL=redis://127.0.0.1:6379/

# OAuth (Keycloak)
KEYCLOAK_ISSUER=http://localhost:8080/realms/oauth2-realm
KEYCLOAK_JWKS_URI=http://localhost:8080/realms/oauth2-realm/protocol/openid-connect/certs

# External Services
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx         # For git operations
ANTHROPIC_API_KEY=sk-ant-xxxxx         # For title generation
IP_ALLOCATOR_URL=http://localhost:8000  # Sandbox IP allocator

# Optional
ROCKET_PORT=8000
ROCKET_ADDRESS=0.0.0.0
```

## Development Workflow

### Local Setup

See `BACKEND_SETUP.md` for complete setup instructions.

Quick start:
```bash
# Clone backend
git clone https://github.com/r33drichards/prompt-backend
cd prompt-backend

# Start infrastructure
docker compose up -d

# Run backend
nix develop --command cargo run -- --server
```

### Testing

```bash
# Unit tests
cargo test

# Format check
cargo fmt -- --check

# Linting
cargo clippy -- -D warnings

# Database migrations
cargo run -- --server  # Auto-runs migrations on startup
```

### Monitoring

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin)
- **Keycloak Admin**: http://localhost:8080/admin (admin/admin)

## Production Deployment

### CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/ci-cd.yml`):

1. **Test**: Run tests, formatting, clippy
2. **Build**: Create Docker image with Nix
3. **Publish**: Push to Docker Hub
4. **Deploy**: Trigger Railway redeployment

### Railway Configuration

Services deployed:
- **Web**: Rust backend (with all background tasks)
- **Postgres**: Main database
- **Redis**: Cache and job queue
- **Keycloak**: OAuth provider (separate Railway project)

Environment variables set via Railway dashboard.

## Architecture Patterns

### Outbox Pattern
- Prompts are written to database first (durable)
- Background poller processes them asynchronously
- Ensures no lost work even on crashes

### Poller-Based Processing
- Resilient to restarts (rediscovers pending work)
- Self-healing (automatically retries on failures)
- Simple to reason about (no complex queue state)

### JWT Validation
- Stateless authentication (no session storage)
- JWKS caching (performance optimization)
- Automatic token refresh (handled by frontend)

### Fire-and-Forget Long Tasks
- Main job returns quickly (Apalis sees success)
- Spawned task runs independently (hours)
- Database provides durability (streaming messages)

## Key Dependencies

- **rocket**: Web framework (v0.5)
- **sea-orm**: Database ORM (v0.12)
- **apalis**: Background job processing (v0.5)
- **jsonwebtoken**: JWT validation (v9.3)
- **reqwest**: HTTP client (v0.11)
- **sandbox-client**: Custom SDK for sandbox API
- **ip-allocator-client**: Custom SDK for IP allocator

## Common Issues & Solutions

### Issue: JWT validation fails
**Solution**: Check KEYCLOAK_JWKS_URI is reachable from backend

### Issue: Background tasks not running
**Solution**: Ensure `--server` flag is used when starting

### Issue: Sessions stuck in Processing
**Solution**: Check IP allocator is running and accessible

### Issue: Database connection pool exhausted
**Solution**: Increase pool size or check for connection leaks

## References

- [CLAUDE.md](https://github.com/r33drichards/prompt-backend/blob/main/CLAUDE.md) - Developer guide
- [SETUP_LOCAL.md](https://github.com/r33drichards/prompt-backend/blob/main/SETUP_LOCAL.md) - Local setup
- [ARCHITECTURE_REVIEW.md](https://github.com/r33drichards/prompt-backend/blob/main/ARCHITECTURE_REVIEW.md) - Design review
- [OpenAPI Spec](http://localhost:8000/openapi.json) - API specification
