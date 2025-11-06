// Domains that will receive automatic access token injection via Service Worker
// Access tokens will be automatically injected into requests to these domains
const trustedDomains = {
  default: {
    oidcDomains: [
      'http://localhost:8080',
      'https://keycloak-production-1100.up.railway.app',
    ], // Keycloak authority
    accessTokenDomains: [
      'http://localhost:8000',
      'https://prompt-backend-production.up.railway.app',
    ], // Backend API
  },
};
