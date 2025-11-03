// Domains that will receive automatic access token injection via Service Worker
// Access tokens will be automatically injected into requests to these domains
const trustedDomains = {
  default: {
    oidcDomains: ['http://localhost:8080'], // Keycloak authority
    accessTokenDomains: ['http://localhost:8000'], // Backend API
  },
};
