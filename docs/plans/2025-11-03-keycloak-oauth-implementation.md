# Keycloak OAuth Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate Keycloak OAuth 2.0 authentication into frontend React app and backend Rust API, ensuring all endpoints (except /health) require valid JWT tokens and sessions are scoped per user.

**Architecture:** Frontend uses @axa-fr/react-oidc for OIDC Authorization Code + PKCE flow. Backend validates JWT tokens via Rocket request guards using Keycloak's JWKS. Sessions table extended with user_id column for user-scoping.

**Tech Stack:**

- Frontend: React, @axa-fr/react-oidc, TanStack Query, Vite
- Backend: Rust, Rocket, jsonwebtoken, SeaORM, PostgreSQL

---

## Prerequisites

**Keycloak Setup Required:**

1. Create client in Keycloak oauth2-realm (if not exists)
2. Client ID: `prompt-submission-ui`
3. Client Type: Public (no secret)
4. Enable: Standard Flow + PKCE
5. Valid Redirect URIs: `http://localhost:5173/authentication/callback`
6. Web Origins: `http://localhost:5173`

**Working Directories:**

- Frontend: `/Users/robertwendt/workspace/Promptsubmissionui/.worktrees/oauth`
- Backend: `/Users/robertwendt/workspace/prompt-backend/.worktrees/oauth`

---

## Phase 1: Backend - Add JWT Dependencies

### Task 1.1: Add JWT Dependencies to Cargo.toml

**Files:**

- Modify: `Cargo.toml`

**Step 1: Add jsonwebtoken and reqwest dependencies**

Add to the `[dependencies]` section in `Cargo.toml`:

```toml
jsonwebtoken = "9.3"
reqwest = { version = "0.11", features = ["json"] }
```

**Step 2: Verify dependencies compile**

Run in backend worktree:

```bash
cd /Users/robertwendt/workspace/prompt-backend/.worktrees/oauth
nix develop --command cargo build
```

Expected: Build succeeds with new dependencies

**Step 3: Commit dependency changes**

```bash
git add Cargo.toml Cargo.lock
git commit -m "chore: add jsonwebtoken and reqwest dependencies for OAuth"
```

---

## Phase 2: Backend - Database Migration

### Task 2.1: Create Migration for user_id Column

**Files:**

- Create: `migration/src/m20251103_000001_add_user_id_to_sessions.rs`
- Modify: `migration/src/lib.rs`

**Step 1: Create new migration file**

Create `migration/src/m20251103_000001_add_user_id_to_sessions.rs`:

```rust
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Session::Table)
                    .add_column(
                        ColumnDef::new(Session::UserId)
                            .string()
                            .not_null()
                            .default("")
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_sessions_user_id")
                    .table(Session::Table)
                    .col(Session::UserId)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Session::Table)
                    .drop_column(Session::UserId)
                    .to_owned(),
            )
            .await
    }
}

#[derive(Iden)]
enum Session {
    Table,
    UserId,
}
```

**Step 2: Register migration in lib.rs**

Modify `migration/src/lib.rs`, add to the vec! in `migrations()`:

```rust
Box::new(m20251103_000001_add_user_id_to_sessions::Migration),
```

Also add the mod declaration:

```rust
mod m20251103_000001_add_user_id_to_sessions;
```

**Step 3: Test migration compiles**

```bash
cd /Users/robertwendt/workspace/prompt-backend/.worktrees/oauth
nix develop --command cargo build
```

Expected: Build succeeds

**Step 4: Commit migration**

```bash
git add migration/
git commit -m "feat: add user_id column migration for sessions table"
```

---

## Phase 3: Backend - Update Session Entity

### Task 3.1: Add user_id Field to Session Entity

**Files:**

- Modify: `src/entities/session.rs`

**Step 1: Add user_id field to Model struct**

In `src/entities/session.rs`, find the `Model` struct and add:

```rust
#[sea_orm(column_name = "user_id")]
pub user_id: String,
```

**Step 2: Verify entity compiles**

```bash
cd /Users/robertwendt/workspace/prompt-backend/.worktrees/oauth
nix develop --command cargo build
```

Expected: Build succeeds

**Step 3: Commit entity update**

```bash
git add src/entities/session.rs
git commit -m "feat: add user_id field to Session entity"
```

---

## Phase 4: Backend - JWT Validation Guard

### Task 4.1: Create JWKS Fetcher Module

**Files:**

- Create: `src/auth/mod.rs`
- Create: `src/auth/jwks.rs`
- Modify: `src/lib.rs`

**Step 1: Create auth module structure**

Create `src/auth/mod.rs`:

```rust
pub mod jwks;
pub mod guard;

pub use guard::AuthenticatedUser;
pub use jwks::JwksCache;
```

**Step 2: Create JWKS fetcher**

Create `src/auth/jwks.rs`:

```rust
use jsonwebtoken::{decode, decode_header, Algorithm, DecodingKey, Validation};
use reqwest;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Jwk {
    pub kty: String,
    pub kid: String,
    pub n: String,
    pub e: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Jwks {
    pub keys: Vec<Jwk>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub iss: String,
    pub aud: Option<String>,
    pub exp: u64,
    pub iat: u64,
    pub email: Option<String>,
    pub name: Option<String>,
}

pub struct JwksCache {
    jwks_uri: String,
    issuer: String,
    cache: Arc<RwLock<Option<Jwks>>>,
}

impl JwksCache {
    pub fn new(jwks_uri: String, issuer: String) -> Self {
        Self {
            jwks_uri,
            issuer,
            cache: Arc::new(RwLock::new(None)),
        }
    }

    pub async fn fetch_jwks(&self) -> Result<Jwks, String> {
        let response = reqwest::get(&self.jwks_uri)
            .await
            .map_err(|e| format!("Failed to fetch JWKS: {}", e))?;

        let jwks: Jwks = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse JWKS: {}", e))?;

        let mut cache = self.cache.write().await;
        *cache = Some(jwks.clone());

        Ok(jwks)
    }

    pub async fn get_jwks(&self) -> Result<Jwks, String> {
        let cache = self.cache.read().await;
        if let Some(jwks) = cache.as_ref() {
            return Ok(jwks.clone());
        }
        drop(cache);

        self.fetch_jwks().await
    }

    pub async fn validate_token(&self, token: &str) -> Result<Claims, String> {
        let header = decode_header(token)
            .map_err(|e| format!("Invalid token header: {}", e))?;

        let kid = header.kid.ok_or("Missing kid in token header")?;

        let jwks = self.get_jwks().await?;
        let jwk = jwks
            .keys
            .iter()
            .find(|k| k.kid == kid)
            .ok_or("Key not found in JWKS")?;

        let decoding_key = DecodingKey::from_rsa_components(&jwk.n, &jwk.e)
            .map_err(|e| format!("Invalid RSA key: {}", e))?;

        let mut validation = Validation::new(Algorithm::RS256);
        validation.set_issuer(&[&self.issuer]);
        validation.validate_exp = true;

        let token_data = decode::<Claims>(token, &decoding_key, &validation)
            .map_err(|e| format!("Token validation failed: {}", e))?;

        Ok(token_data.claims)
    }
}
```

**Step 3: Register auth module in lib.rs**

Add to `src/lib.rs`:

```rust
mod auth;
```

**Step 4: Verify compilation**

```bash
cd /Users/robertwendt/workspace/prompt-backend/.worktrees/oauth
nix develop --command cargo build
```

Expected: Build succeeds

**Step 5: Commit JWKS module**

```bash
git add src/auth/
git add src/lib.rs
git commit -m "feat: add JWKS fetcher for JWT validation"
```

---

### Task 4.2: Create AuthenticatedUser Request Guard

**Files:**

- Create: `src/auth/guard.rs`

**Step 1: Create request guard**

Create `src/auth/guard.rs`:

```rust
use rocket::http::Status;
use rocket::request::{FromRequest, Outcome, Request};
use rocket::State;

use super::jwks::JwksCache;

#[derive(Debug, Clone)]
pub struct AuthenticatedUser {
    pub user_id: String,
    pub email: Option<String>,
    pub name: Option<String>,
}

#[rocket::async_trait]
impl<'r> FromRequest<'r> for AuthenticatedUser {
    type Error = String;

    async fn from_request(request: &'r Request<'_>) -> Outcome<Self, Self::Error> {
        let jwks_cache = request
            .guard::<&State<JwksCache>>()
            .await
            .succeeded()
            .ok_or("JWKS cache not available".to_string());

        if let Err(e) = jwks_cache {
            return Outcome::Error((Status::InternalServerError, e));
        }

        let jwks_cache = jwks_cache.unwrap();

        let auth_header = request.headers().get_one("Authorization");
        if auth_header.is_none() {
            return Outcome::Error((
                Status::Unauthorized,
                "Missing Authorization header".to_string(),
            ));
        }

        let auth_header = auth_header.unwrap();
        if !auth_header.starts_with("Bearer ") {
            return Outcome::Error((
                Status::Unauthorized,
                "Invalid Authorization header format".to_string(),
            ));
        }

        let token = &auth_header[7..];

        match jwks_cache.validate_token(token).await {
            Ok(claims) => Outcome::Success(AuthenticatedUser {
                user_id: claims.sub,
                email: claims.email,
                name: claims.name,
            }),
            Err(e) => Outcome::Error((Status::Unauthorized, e)),
        }
    }
}
```

**Step 2: Update mod.rs to export guard**

Ensure `src/auth/mod.rs` has:

```rust
pub mod jwks;
pub mod guard;

pub use guard::AuthenticatedUser;
pub use jwks::JwksCache;
```

**Step 3: Verify compilation**

```bash
cd /Users/robertwendt/workspace/prompt-backend/.worktrees/oauth
nix develop --command cargo build
```

Expected: Build succeeds

**Step 4: Commit guard**

```bash
git add src/auth/guard.rs
git commit -m "feat: add AuthenticatedUser request guard for JWT validation"
```

---

## Phase 5: Backend - Add Health Endpoint

### Task 5.1: Create Health Handler

**Files:**

- Create: `src/handlers/health.rs`
- Modify: `src/handlers/mod.rs`

**Step 1: Create health handler**

Create `src/handlers/health.rs`:

```rust
use rocket::serde::json::Json;
use rocket_okapi::openapi;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, JsonSchema)]
pub struct HealthResponse {
    pub status: String,
}

#[openapi(tag = "Health")]
#[get("/health")]
pub fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_string(),
    })
}
```

**Step 2: Register handler in mod.rs**

Add to `src/handlers/mod.rs`:

```rust
pub mod health;
```

**Step 3: Verify compilation**

```bash
cd /Users/robertwendt/workspace/prompt-backend/.worktrees/oauth
nix develop --command cargo build
```

Expected: Build succeeds

**Step 4: Commit health handler**

```bash
git add src/handlers/health.rs src/handlers/mod.rs
git commit -m "feat: add health endpoint without authentication"
```

---

## Phase 6: Backend - Update Main.rs with JWKS and Health

### Task 6.1: Initialize JWKS Cache and Mount Health Endpoint

**Files:**

- Modify: `src/main.rs`

**Step 1: Import auth modules**

Add to imports in `src/main.rs`:

```rust
use rust_redis_webserver::auth::{AuthenticatedUser, JwksCache};
```

**Step 2: Initialize JWKS cache in run_server function**

In the `run_server` function, before building the rocket instance, add:

```rust
let keycloak_issuer = std::env::var("KEYCLOAK_ISSUER")
    .expect("KEYCLOAK_ISSUER must be set");
let keycloak_jwks_uri = std::env::var("KEYCLOAK_JWKS_URI")
    .expect("KEYCLOAK_JWKS_URI must be set");

let jwks_cache = JwksCache::new(keycloak_jwks_uri, keycloak_issuer);

// Pre-fetch JWKS on startup
println!("Fetching JWKS from Keycloak...");
jwks_cache.fetch_jwks().await.expect("Failed to fetch JWKS");
println!("JWKS fetched successfully");
```

**Step 3: Add JWKS cache to managed state**

In the rocket build, add `.manage(jwks_cache)` after `.manage(db)`:

```rust
let _ = rocket::build()
    .configure(rocket::Config {
        address: "0.0.0.0".parse().expect("valid IP address"),
        port: 8000,
        ..rocket::Config::default()
    })
    .attach(cors)
    .manage(db)
    .manage(jwks_cache)
    // ... rest of config
```

**Step 4: Mount health endpoint**

Add health endpoint to `openapi_get_routes!` and update `generate_openapi_spec`:

```rust
// In openapi_get_routes!
.mount(
    "/",
    openapi_get_routes![
        handlers::health::health,
        handlers::sessions::create,
        handlers::sessions::read,
        handlers::sessions::list,
        handlers::sessions::update,
        handlers::sessions::delete,
    ],
)

// In generate_openapi_spec function
let spec = rocket_okapi::openapi_spec![
    handlers::health::health,
    handlers::sessions::create,
    handlers::sessions::read,
    handlers::sessions::list,
    handlers::sessions::update,
    handlers::sessions::delete,
](&settings);
```

**Step 5: Verify compilation**

```bash
cd /Users/robertwendt/workspace/prompt-backend/.worktrees/oauth
nix develop --command cargo build
```

Expected: Build succeeds

**Step 6: Commit main.rs updates**

```bash
git add src/main.rs
git commit -m "feat: initialize JWKS cache and mount health endpoint"
```

---

## Phase 7: Backend - Add Authentication to Session Handlers

### Task 7.1: Update Session Handlers with AuthenticatedUser Guard

**Files:**

- Modify: `src/handlers/sessions.rs`

**Step 1: Add AuthenticatedUser to create handler**

Find the `create` function and add `user: AuthenticatedUser` parameter:

```rust
#[openapi(tag = "Sessions")]
#[post("/sessions", data = "<input>")]
pub async fn create(
    user: AuthenticatedUser,
    db: &State<DatabaseConnection>,
    input: Json<CreateSessionInput>,
) -> OResult<CreateSessionOutput> {
    let session = session::ActiveModel {
        id: Set(Uuid::new_v4()),
        messages: Set(input.messages.clone()),
        parent: Set(input.parent.clone()),
        repo: Set(input.repo.clone()),
        target_branch: Set(input.target_branch.clone()),
        user_id: Set(user.user_id.clone()),
        inbox_status: Set(InboxStatus::Pending),
        session_status: Set(SessionStatus::Active),
        sbx_config: NotSet,
        branch: NotSet,
        title: NotSet,
        pr_url: NotSet,
        created_at: NotSet,
        updated_at: NotSet,
        deleted_at: NotSet,
    };

    let result = session.insert(db.inner()).await.map_err(|e| {
        Error::InternalServerError(format!("Failed to create session: {}", e))
    })?;

    Ok(Json(CreateSessionOutput {
        success: true,
        message: "Session created successfully".to_string(),
        id: result.id.to_string(),
    }))
}
```

**Step 2: Update list handler with user filtering**

Modify the `list` function:

```rust
#[openapi(tag = "Sessions")]
#[get("/sessions")]
pub async fn list(
    user: AuthenticatedUser,
    db: &State<DatabaseConnection>,
) -> OResult<Vec<SessionDto>> {
    let sessions = Session::find()
        .filter(session::Column::UserId.eq(&user.user_id))
        .order_by_desc(session::Column::CreatedAt)
        .all(db.inner())
        .await
        .map_err(|e| Error::InternalServerError(format!("Failed to list sessions: {}", e)))?;

    let session_dtos: Vec<SessionDto> = sessions.into_iter().map(|s| s.into()).collect();

    Ok(Json(session_dtos))
}
```

**Step 3: Update read handler with user filtering**

Modify the `read` function:

```rust
#[openapi(tag = "Sessions")]
#[get("/sessions/<id>")]
pub async fn read(
    user: AuthenticatedUser,
    db: &State<DatabaseConnection>,
    id: String,
) -> OResult<SessionDto> {
    let uuid = Uuid::parse_str(&id)
        .map_err(|_| Error::BadRequest("Invalid UUID format".to_string()))?;

    let session = Session::find_by_id(uuid)
        .filter(session::Column::UserId.eq(&user.user_id))
        .one(db.inner())
        .await
        .map_err(|e| Error::InternalServerError(format!("Failed to read session: {}", e)))?
        .ok_or_else(|| Error::NotFound("Session not found".to_string()))?;

    Ok(Json(session.into()))
}
```

**Step 4: Update update handler with user filtering**

Modify the `update` function to verify ownership:

```rust
#[openapi(tag = "Sessions")]
#[put("/sessions/<id>", data = "<input>")]
pub async fn update(
    user: AuthenticatedUser,
    db: &State<DatabaseConnection>,
    id: String,
    input: Json<UpdateSessionInput>,
) -> OResult<SessionDto> {
    let uuid = Uuid::parse_str(&id)
        .map_err(|_| Error::BadRequest("Invalid UUID format".to_string()))?;

    // Verify session belongs to user
    let session = Session::find_by_id(uuid)
        .filter(session::Column::UserId.eq(&user.user_id))
        .one(db.inner())
        .await
        .map_err(|e| Error::InternalServerError(format!("Failed to find session: {}", e)))?
        .ok_or_else(|| Error::NotFound("Session not found".to_string()))?;

    let mut session: session::ActiveModel = session.into();

    // Update fields from input
    if let Some(inbox_status) = &input.inbox_status {
        session.inbox_status = Set(inbox_status.clone());
    }
    if let Some(session_status) = &input.session_status {
        session.session_status = Set(session_status.clone());
    }
    if let Some(messages) = &input.messages {
        session.messages = Set(Some(messages.clone()));
    }
    if let Some(title) = &input.title {
        session.title = Set(Some(title.clone()));
    }
    if let Some(branch) = &input.branch {
        session.branch = Set(Some(branch.clone()));
    }
    if let Some(pr_url) = &input.pr_url {
        session.pr_url = Set(Some(pr_url.clone()));
    }

    let updated = session.update(db.inner()).await.map_err(|e| {
        Error::InternalServerError(format!("Failed to update session: {}", e))
    })?;

    Ok(Json(updated.into()))
}
```

**Step 5: Update delete handler with user filtering**

Modify the `delete` function:

```rust
#[openapi(tag = "Sessions")]
#[delete("/sessions/<id>")]
pub async fn delete(
    user: AuthenticatedUser,
    db: &State<DatabaseConnection>,
    id: String,
) -> OResult<DeleteSessionOutput> {
    let uuid = Uuid::parse_str(&id)
        .map_err(|_| Error::BadRequest("Invalid UUID format".to_string()))?;

    // Verify session belongs to user before deleting
    let session = Session::find_by_id(uuid)
        .filter(session::Column::UserId.eq(&user.user_id))
        .one(db.inner())
        .await
        .map_err(|e| Error::InternalServerError(format!("Failed to find session: {}", e)))?
        .ok_or_else(|| Error::NotFound("Session not found".to_string()))?;

    session::Entity::delete_by_id(uuid)
        .exec(db.inner())
        .await
        .map_err(|e| Error::InternalServerError(format!("Failed to delete session: {}", e)))?;

    Ok(Json(DeleteSessionOutput {
        success: true,
        message: "Session deleted successfully".to_string(),
    }))
}
```

**Step 6: Add use statement for AuthenticatedUser**

Add to imports at top of `src/handlers/sessions.rs`:

```rust
use crate::auth::AuthenticatedUser;
```

**Step 7: Verify compilation**

```bash
cd /Users/robertwendt/workspace/prompt-backend/.worktrees/oauth
nix develop --command cargo build
```

Expected: Build succeeds

**Step 8: Commit handler updates**

```bash
git add src/handlers/sessions.rs
git commit -m "feat: add JWT authentication to all session endpoints"
```

---

## Phase 8: Backend - Environment Configuration

### Task 8.1: Update .env.example with Keycloak Variables

**Files:**

- Modify: `.env` (if exists) or create `.env.example`

**Step 1: Add Keycloak configuration**

Add to `.env` or create `.env.example`:

```bash
# Keycloak OAuth Configuration
KEYCLOAK_ISSUER=https://keycloak-production-1100.up.railway.app/realms/oauth2-realm
KEYCLOAK_JWKS_URI=https://keycloak-production-1100.up.railway.app/realms/oauth2-realm/protocol/openid-connect/certs

# Existing variables
DATABASE_URL=postgresql://user:password@localhost/dbname
REDIS_URL=redis://127.0.0.1/
ROCKET_PORT=8000
```

**Step 2: Commit environment configuration**

```bash
git add .env.example
git commit -m "docs: add Keycloak environment variables to .env.example"
```

---

## Phase 9: Backend - Run Migration and Test

### Task 9.1: Run Database Migration

**Step 1: Set DATABASE_URL**

Ensure `.env` has valid `DATABASE_URL`:

```bash
DATABASE_URL=postgresql://user:password@localhost/dbname
```

**Step 2: Run migrations**

```bash
cd /Users/robertwendt/workspace/prompt-backend/.worktrees/oauth
nix develop --command cargo run -- --server
```

Expected: Migrations run successfully, "user_id" column added

**Step 3: Verify migration**

Connect to database and verify:

```sql
\d sessions
```

Should show `user_id` column

---

### Task 9.2: Manual Backend Testing with curl

**Step 1: Start backend server**

```bash
cd /Users/robertwendt/workspace/prompt-backend/.worktrees/oauth
nix develop --command cargo run -- --server
```

**Step 2: Test health endpoint (no auth required)**

```bash
curl http://localhost:8000/health
```

Expected: `{"status":"ok"}`

**Step 3: Test sessions endpoint without auth**

```bash
curl http://localhost:8000/sessions
```

Expected: 401 Unauthorized with error message

**Step 4: Verify server logs show JWKS fetched**

Check terminal output for:

```
Fetching JWKS from Keycloak...
JWKS fetched successfully
```

---

## Phase 10: Frontend - Install OIDC Dependencies

### Task 10.1: Install @axa-fr/react-oidc

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`

**Step 1: Install dependency**

```bash
cd /Users/robertwendt/workspace/Promptsubmissionui/.worktrees/oauth
npm install @axa-fr/react-oidc
```

Expected: Package installed successfully

**Step 2: Verify installation**

```bash
npm list @axa-fr/react-oidc
```

Expected: Shows installed version

**Step 3: Commit dependency**

```bash
git add package.json package-lock.json
git commit -m "chore: add @axa-fr/react-oidc dependency"
```

---

## Phase 11: Frontend - Environment Configuration

### Task 11.1: Add OIDC Environment Variables

**Files:**

- Create or modify: `.env.development`
- Create or modify: `.env.production`

**Step 1: Create .env.development**

Create `.env.development` (or add to existing):

```bash
# Keycloak OIDC Configuration
VITE_OIDC_AUTHORITY=https://keycloak-production-1100.up.railway.app/realms/oauth2-realm
VITE_OIDC_CLIENT_ID=prompt-submission-ui
VITE_OIDC_REDIRECT_URI=http://localhost:5173/authentication/callback
VITE_OIDC_SCOPE=openid profile email
VITE_OIDC_SILENT_REDIRECT_URI=http://localhost:5173/authentication/silent-callback

# Backend API
VITE_BACKEND_URL=http://localhost:8000
```

**Step 2: Create .env.production**

Create `.env.production`:

```bash
# Keycloak OIDC Configuration
VITE_OIDC_AUTHORITY=https://keycloak-production-1100.up.railway.app/realms/oauth2-realm
VITE_OIDC_CLIENT_ID=prompt-submission-ui
VITE_OIDC_REDIRECT_URI=https://your-production-domain.com/authentication/callback
VITE_OIDC_SCOPE=openid profile email
VITE_OIDC_SILENT_REDIRECT_URI=https://your-production-domain.com/authentication/silent-callback

# Backend API
VITE_BACKEND_URL=https://your-backend-domain.com
```

**Step 3: Commit environment files**

```bash
git add .env.development .env.production
git commit -m "config: add OIDC environment variables"
```

---

## Phase 12: Frontend - Authentication Callback Routes

### Task 12.1: Create Authentication Callback Components

**Files:**

- Create: `src/pages/AuthCallback.tsx`
- Create: `src/pages/SilentCallback.tsx`

**Step 1: Create AuthCallback component**

Create `src/pages/AuthCallback.tsx`:

```typescript
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // OidcProvider handles the callback automatically
    // Redirect to home after a brief delay
    const timer = setTimeout(() => {
      navigate('/');
    }, 100);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
}
```

**Step 2: Create SilentCallback component**

Create `src/pages/SilentCallback.tsx`:

```typescript
export function SilentCallback() {
  // This component is loaded in an iframe for silent token renewal
  return null;
}
```

**Step 3: Verify components compile**

```bash
cd /Users/robertwendt/workspace/Promptsubmissionui/.worktrees/oauth
npm run build
```

Expected: Build succeeds

**Step 4: Commit callback components**

```bash
git add src/pages/
git commit -m "feat: add OIDC authentication callback components"
```

---

## Phase 13: Frontend - Configure OidcProvider

### Task 13.1: Wrap App with OidcProvider

**Files:**

- Modify: `src/main.tsx`

**Step 1: Add OIDC imports**

Add to imports in `src/main.tsx`:

```typescript
import { OidcProvider } from '@axa-fr/react-oidc';
import { AuthCallback } from './pages/AuthCallback';
import { SilentCallback } from './pages/SilentCallback';
```

**Step 2: Create OIDC configuration object**

Before the ReactDOM.createRoot call, add:

```typescript
const oidcConfiguration = {
  authority: import.meta.env.VITE_OIDC_AUTHORITY,
  client_id: import.meta.env.VITE_OIDC_CLIENT_ID,
  redirect_uri: import.meta.env.VITE_OIDC_REDIRECT_URI,
  silent_redirect_uri: import.meta.env.VITE_OIDC_SILENT_REDIRECT_URI,
  scope: import.meta.env.VITE_OIDC_SCOPE,
  response_type: 'code',
  automaticSilentRenew: true,
  loadUserInfo: true,
};
```

**Step 3: Wrap app with OidcProvider**

Modify the render to wrap with OidcProvider:

```typescript
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <OidcProvider
      configuration={oidcConfiguration}
      callbackSuccessComponent={AuthCallback}
      authenticatingComponent={() => (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Authenticating...</p>
          </div>
        </div>
      )}
    >
      <BrowserRouter>
        <ApiProvider backendUrl={import.meta.env.VITE_BACKEND_URL}>
          <QueryProvider>
            <Toaster position="top-right" />
            <Routes>
              <Route path="/authentication/callback" element={<AuthCallback />} />
              <Route path="/authentication/silent-callback" element={<SilentCallback />} />
              <Route path="/*" element={<App />} />
            </Routes>
          </QueryProvider>
        </ApiProvider>
      </BrowserRouter>
    </OidcProvider>
  </React.StrictMode>
);
```

**Step 4: Verify compilation**

```bash
cd /Users/robertwendt/workspace/Promptsubmissionui/.worktrees/oauth
npm run build
```

Expected: Build succeeds

**Step 5: Commit main.tsx changes**

```bash
git add src/main.tsx
git commit -m "feat: wrap app with OidcProvider for authentication"
```

---

## Phase 14: Frontend - Update ApiProvider for Token Injection

### Task 14.1: Modify ApiProvider to Inject Tokens

**Files:**

- Modify: `src/providers/ApiProvider.tsx`

**Step 1: Add OIDC imports**

Add to imports:

```typescript
import { useOidcAccessToken } from '@axa-fr/react-oidc';
```

**Step 2: Update ApiProvider to pass token to client**

Modify the `ApiProvider` component:

```typescript
export const ApiProvider: React.FC<ApiProviderProps> = ({
  children,
  client,
  useMock = false,
  backendUrl
}) => {
  const { accessToken } = useOidcAccessToken();

  // Use provided client, or create appropriate client based on useMock flag
  const backendClient = client ?? (
    useMock
      ? new BackendClientImpl(new MockHttpClient())
      : new PromptBackendClient(backendUrl, () => accessToken)
  );

  return <ApiContext.Provider value={backendClient}>{children}</ApiContext.Provider>;
};
```

**Step 3: Update PromptBackendClient constructor**

Modify `src/services/api/promptBackendClient.ts` to accept token provider:

Find the constructor and add tokenProvider parameter:

```typescript
export class PromptBackendClient implements BackendClient {
  private baseUrl: string;
  private apiClient: DefaultApi;
  private getAccessToken: () => string | null;

  constructor(baseUrl?: string, getAccessToken?: () => string | null) {
    this.baseUrl = baseUrl || 'http://localhost:8000';
    this.getAccessToken = getAccessToken || (() => null);

    const config = new Configuration({
      basePath: this.baseUrl,
      headers: this.getAuthHeaders(),
    });

    this.apiClient = new DefaultApi(config);
  }

  private getAuthHeaders(): Record<string, string> {
    const token = this.getAccessToken();
    if (token) {
      return {
        Authorization: `Bearer ${token}`,
      };
    }
    return {};
  }

  // ... rest of methods unchanged
}
```

**Step 4: Update all API calls to include auth header**

In each method of `PromptBackendClient`, ensure fetch calls include the auth header. For example, in the `create` method of `sessions`:

```typescript
async create(data: {
  title: string;
  repo: string;
  branch: string;
  targetBranch: string;
  parentId?: string;
  sbxConfig?: any;
}): Promise<Session> {
  const response = await fetch(`${this.baseUrl}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...this.getAuthHeaders(),
    },
    body: JSON.stringify({
      // ... payload
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create session: ${response.statusText}`);
  }

  return response.json();
}
```

Apply this pattern to all methods (list, read, update, delete, archive).

**Step 5: Verify compilation**

```bash
cd /Users/robertwendt/workspace/Promptsubmissionui/.worktrees/oauth
npm run build
```

Expected: Build succeeds

**Step 6: Commit token injection changes**

```bash
git add src/providers/ApiProvider.tsx src/services/api/promptBackendClient.ts
git commit -m "feat: inject OAuth access token into API requests"
```

---

## Phase 15: Frontend - Protect Routes with OidcSecure

### Task 15.1: Wrap App Routes with OidcSecure

**Files:**

- Modify: `src/App.tsx`

**Step 1: Import OidcSecure**

Add to imports:

```typescript
import { OidcSecure } from '@axa-fr/react-oidc';
```

**Step 2: Wrap AppLayout with OidcSecure**

Modify the default export in `App.tsx`:

```typescript
export default function App() {
  return (
    <OidcSecure>
      <Routes>
        <Route path="/" element={<AppLayout />} />
        <Route path="/session/:id" element={<AppLayout />} />
      </Routes>
    </OidcSecure>
  );
}
```

**Step 3: Verify compilation**

```bash
cd /Users/robertwendt/workspace/Promptsubmissionui/.worktrees/oauth
npm run build
```

Expected: Build succeeds

**Step 4: Commit route protection**

```bash
git add src/App.tsx
git commit -m "feat: protect app routes with OidcSecure"
```

---

## Phase 16: Frontend - Add Logout Button

### Task 16.1: Add User Menu with Logout

**Files:**

- Modify: `src/App.tsx`

**Step 1: Import OIDC hooks**

Add to imports:

```typescript
import { useOidc } from '@axa-fr/react-oidc';
import { LogOut, User } from 'lucide-react';
```

**Step 2: Add user menu to AppLayout**

In the `AppLayout` component, add after the Github icon in the header:

```typescript
function AppLayout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { logout, isAuthenticated } = useOidc();
  // ... existing state

  // ... existing code

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className="w-96 border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Github className="w-5 h-5" />
              <h1>Claude Code</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setParentForNewTask(null);
                  navigate('/');
                  setIsCreatingTask(true);
                }}
                disabled={createSessionMutation.isPending}
              >
                {createSessionMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-1" />
                )}
                New Task
              </Button>
              {isAuthenticated && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => logout()}
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          {/* ... rest of header unchanged */}
```

**Step 3: Verify compilation**

```bash
cd /Users/robertwendt/workspace/Promptsubmissionui/.worktrees/oauth
npm run build
```

Expected: Build succeeds

**Step 4: Commit logout button**

```bash
git add src/App.tsx
git commit -m "feat: add logout button to header"
```

---

## Phase 17: Integration Testing

### Task 17.1: Test Full OAuth Flow

**Step 1: Start backend with Keycloak configuration**

Ensure `.env` has:

```bash
KEYCLOAK_ISSUER=https://keycloak-production-1100.up.railway.app/realms/oauth2-realm
KEYCLOAK_JWKS_URI=https://keycloak-production-1100.up.railway.app/realms/oauth2-realm/protocol/openid-connect/certs
DATABASE_URL=<your-db-url>
```

Start backend:

```bash
cd /Users/robertwendt/workspace/prompt-backend/.worktrees/oauth
nix develop --command cargo run -- --server
```

**Step 2: Start frontend**

```bash
cd /Users/robertwendt/workspace/Promptsubmissionui/.worktrees/oauth
npm run dev
```

**Step 3: Test authentication flow**

1. Open browser to http://localhost:5173
2. Should redirect to Keycloak login
3. Enter Keycloak credentials
4. Should redirect back to app
5. Should see Claude Code interface

**Step 4: Test session creation**

1. Click "New Task" button
2. Fill in task details
3. Submit
4. Verify session created (check backend logs for user_id)

**Step 5: Test user scoping**

1. Create multiple sessions as user A
2. Login as user B (different browser/incognito)
3. Verify user B cannot see user A's sessions

**Step 6: Test logout**

1. Click logout button
2. Should redirect to Keycloak logout
3. Then redirect back to app
4. Should redirect back to Keycloak login

**Step 7: Document any issues**

Create a test report documenting:

- What works
- What doesn't work
- Any error messages
- Browser console errors

---

## Phase 18: Final Cleanup

### Task 18.1: Update README Files

**Files:**

- Modify: `README.md` in backend
- Modify: `README.md` in frontend

**Step 1: Add OAuth setup instructions to backend README**

Add section to backend README:

````markdown
## OAuth Authentication

This application uses Keycloak for OAuth 2.0 authentication.

### Environment Variables

```bash
KEYCLOAK_ISSUER=https://keycloak-production-1100.up.railway.app/realms/oauth2-realm
KEYCLOAK_JWKS_URI=https://keycloak-production-1100.up.railway.app/realms/oauth2-realm/protocol/openid-connect/certs
```
````

### Protected Endpoints

All `/sessions/*` endpoints require a valid JWT Bearer token.

### Unprotected Endpoints

- `GET /health` - Health check endpoint

````

**Step 2: Add OAuth setup instructions to frontend README**

Add section to frontend README:

```markdown
## OAuth Authentication

This application uses Keycloak for authentication via OpenID Connect.

### Environment Variables

Create a `.env.development` file:

```bash
VITE_OIDC_AUTHORITY=https://keycloak-production-1100.up.railway.app/realms/oauth2-realm
VITE_OIDC_CLIENT_ID=prompt-submission-ui
VITE_OIDC_REDIRECT_URI=http://localhost:5173/authentication/callback
VITE_OIDC_SCOPE=openid profile email
VITE_BACKEND_URL=http://localhost:8000
````

### Keycloak Client Setup

Ensure your Keycloak client is configured with:

- Client Type: Public
- Valid Redirect URIs: `http://localhost:5173/authentication/callback`
- Web Origins: `http://localhost:5173`

````

**Step 3: Commit README updates**

In backend:
```bash
git add README.md
git commit -m "docs: add OAuth authentication documentation"
````

In frontend:

```bash
git add README.md
git commit -m "docs: add OAuth authentication setup instructions"
```

---

### Task 18.2: Run All Tests

**Step 1: Run frontend tests**

```bash
cd /Users/robertwendt/workspace/Promptsubmissionui/.worktrees/oauth
npm test -- --run
```

Expected: All tests pass

**Step 2: Run backend tests**

```bash
cd /Users/robertwendt/workspace/prompt-backend/.worktrees/oauth
nix develop --command cargo test
```

Expected: All tests pass

**Step 3: Update snapshot if needed**

If OpenAPI snapshot test fails:

```bash
cd /Users/robertwendt/workspace/prompt-backend/.worktrees/oauth
nix develop --command cargo insta review
```

Accept the new snapshot if changes are expected (added /health endpoint, auth to sessions).

**Step 4: Commit any test updates**

```bash
git add src/
git commit -m "test: update OpenAPI snapshot with auth changes"
```

---

## Phase 19: Create Pull Requests

### Task 19.1: Push Branches and Create PRs

**Step 1: Push backend branch**

```bash
cd /Users/robertwendt/workspace/prompt-backend/.worktrees/oauth
git push -u origin oauth
```

**Step 2: Push frontend branch**

```bash
cd /Users/robertwendt/workspace/Promptsubmissionui/.worktrees/oauth
git push -u origin oauth
```

**Step 3: Create backend PR**

```bash
cd /Users/robertwendt/workspace/prompt-backend/.worktrees/oauth
gh pr create --title "feat: add Keycloak OAuth authentication" --body "$(cat <<'EOF'
## Summary
- Add JWT token validation via Keycloak JWKS
- Add AuthenticatedUser request guard
- Protect all /sessions endpoints with authentication
- Add /health endpoint without authentication
- Add user_id column to sessions table
- Scope all session queries by authenticated user

## Testing
- Manual testing with Keycloak login flow
- curl tests for /health and protected endpoints
- Unit tests pass

## Related
- See design doc: docs/plans/2025-11-03-keycloak-oauth-integration-design.md
- Frontend PR: [link to frontend PR]
EOF
)"
```

**Step 4: Create frontend PR**

```bash
cd /Users/robertwendt/workspace/Promptsubmissionui/.worktrees/oauth
gh pr create --title "feat: add Keycloak OAuth authentication" --body "$(cat <<'EOF'
## Summary
- Integrate @axa-fr/react-oidc for OAuth authentication
- Add OIDC provider with Authorization Code + PKCE flow
- Inject JWT access tokens into all API requests
- Protect all routes with OidcSecure
- Add authentication callback routes
- Add logout functionality

## Testing
- Manual testing with Keycloak login flow
- Verify token injection in API calls
- Verify logout redirects correctly
- All existing tests pass

## Related
- See design doc: docs/plans/2025-11-03-keycloak-oauth-integration-design.md
- Backend PR: [link to backend PR]
EOF
)"
```

**Step 5: Link PRs together**

Update each PR description with link to the other PR.

---

## Completion Checklist

- [ ] Backend dependencies added (jsonwebtoken, reqwest)
- [ ] Database migration created and run (user_id column)
- [ ] Session entity updated with user_id field
- [ ] JWKS fetcher implemented and tested
- [ ] AuthenticatedUser request guard implemented
- [ ] Health endpoint added without authentication
- [ ] All session endpoints updated with AuthenticatedUser guard
- [ ] Session queries filter by user_id
- [ ] Backend environment variables configured
- [ ] Backend tests pass
- [ ] Frontend OIDC dependency installed
- [ ] Frontend environment variables configured
- [ ] Authentication callback components created
- [ ] OidcProvider configured and wrapping app
- [ ] ApiProvider updated to inject tokens
- [ ] PromptBackendClient updated to send Authorization header
- [ ] App routes protected with OidcSecure
- [ ] Logout button added
- [ ] Frontend tests pass
- [ ] Full OAuth flow tested manually
- [ ] User scoping verified (users see only their sessions)
- [ ] README files updated
- [ ] PRs created and linked

---

## Troubleshooting

### Backend Issues

**JWKS fetch fails:**

- Verify KEYCLOAK_JWKS_URI is correct
- Check network connectivity to Keycloak
- Verify Keycloak is running and accessible

**401 Unauthorized on valid token:**

- Check KEYCLOAK_ISSUER matches token issuer claim
- Verify token has not expired
- Check JWKS cache contains correct keys

**Migration fails:**

- Verify DATABASE_URL is correct
- Check database is running
- Ensure migrations haven't already run

### Frontend Issues

**Redirect loop:**

- Verify VITE_OIDC_REDIRECT_URI matches Keycloak client config
- Check VITE_OIDC_CLIENT_ID matches Keycloak client
- Verify Keycloak client is Public type

**Token not included in requests:**

- Check useOidcAccessToken returns valid token
- Verify ApiProvider passes token to client
- Check PromptBackendClient getAuthHeaders implementation

**CORS errors:**

- Verify backend CORS allows frontend origin
- Check Keycloak client Web Origins includes frontend URL

---

## Next Steps

After this implementation:

1. **Production Deployment:**
   - Update environment variables for production URLs
   - Add production redirect URIs to Keycloak client
   - Enable HTTPS for both frontend and backend

2. **Enhanced Features:**
   - Add user profile display in UI
   - Implement role-based access control
   - Add session sharing between users
   - Implement audit logging for auth events

3. **Monitoring:**
   - Add authentication metrics
   - Monitor JWKS fetch failures
   - Track token refresh failures
   - Alert on authentication errors
