# OIDC Service Worker Configuration

## Overview

This application uses the `@axa-fr/react-oidc` Service Worker pattern for automatic access token injection. The Service Worker intercepts network requests to configured trusted domains and automatically adds Bearer tokens to the Authorization header.

## How It Works

1. **Service Worker Registration**: On app load, `OidcProvider` registers `/OidcServiceWorker.js`
2. **Request Interception**: Service Worker intercepts all `fetch()` requests
3. **Domain Matching**: Checks if request URL matches `trustedDomains` in `OidcTrustedDomains.js`
4. **Token Injection**: If matched, adds `Authorization: Bearer <access_token>` header
5. **Token Refresh**: Service Worker automatically handles token refresh when expired

## Configuration Files

### `/public/OidcServiceWorker.js`

The Service Worker implementation from `@axa-fr/react-oidc`. This file should not be modified.

### `/public/OidcTrustedDomains.js`

Configures which domains receive access tokens:

```javascript
const trustedDomains = {
  default: {
    oidcDomains: ['http://localhost:8080'], // Keycloak
    accessTokenDomains: ['http://localhost:8000'], // Backend API
  },
};
```

**Important:**

- `oidcDomains`: Must include your OIDC provider's URL
- `accessTokenDomains`: Add any API endpoints that need authentication
- For production, update these to production URLs

## Security Benefits

- **XSS Protection**: Tokens never accessible to JavaScript (when `service_worker_only: true`)
- **Automatic Refresh**: Service Worker handles token refresh without app code
- **Centralized Auth**: All authenticated requests go through one place
- **CORS Friendly**: Works with cross-origin requests when configured

## Debugging

### Service Worker Not Registering

Check browser console for errors:

- "Service Worker registration failed" → Check that `/OidcServiceWorker.js` is accessible
- "SecurityError" → Service Workers require HTTPS in production (localhost is exempt)

### Tokens Not Being Injected

1. **Verify Service Worker is active**: DevTools → Application → Service Workers
2. **Check trusted domains**: Ensure your API URL is in `accessTokenDomains`
3. **Hard refresh**: Ctrl+Shift+R to reload Service Worker
4. **Check Network tab**: Look for Authorization header in request headers

### 401 Unauthorized Errors

If you still get 401 errors after Service Worker setup:

1. Check that backend URL in `accessTokenDomains` matches actual request URLs
2. Verify user is authenticated (check OidcProvider state)
3. Check backend logs for JWT validation errors
4. Ensure Keycloak realm and client are configured correctly

## Development vs Production

### Development (localhost)

```javascript
const trustedDomains = {
  default: {
    oidcDomains: ['http://localhost:8080'],
    accessTokenDomains: ['http://localhost:8000'],
  },
};
```

### Production

```javascript
const trustedDomains = {
  default: {
    oidcDomains: ['https://auth.yourdomain.com'],
    accessTokenDomains: ['https://api.yourdomain.com'],
  },
};
```

**Note:** You may want to use environment variables to configure these domains dynamically.

## References

- [@axa-fr/react-oidc Documentation](https://github.com/AxaFrance/oidc-client)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [OIDC Authorization Code Flow](https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowAuth)
