
  # Prompt Submission UI

  This is a code bundle for Prompt Submission UI. The original project is available at https://www.figma.com/design/GAwtRezTz0u028dXOL6wSg/Prompt-Submission-UI.

  ## OAuth Authentication

  This application uses Keycloak for authentication via OpenID Connect (OIDC).

  ### Environment Variables

  Create a `.env.development` file in the project root:

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

  ### Keycloak Client Setup

  Ensure your Keycloak client is configured with:
  - **Client ID**: `prompt-submission-ui`
  - **Client Type**: Public (no client secret required)
  - **Valid Redirect URIs**: `http://localhost:5173/authentication/callback`
  - **Web Origins**: `http://localhost:5173`
  - **Standard Flow**: Enabled
  - **Direct Access Grants**: Disabled (we use Authorization Code + PKCE flow)

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.
