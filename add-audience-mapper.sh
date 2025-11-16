#!/bin/bash
set -e

# Get admin token
TOKEN=$(curl -s -X POST "http://localhost:8080/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin" \
  -d "password=admin" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | jq -r ".access_token")

echo "Got admin token"

# Get client UUID
CLIENT_UUID=$(curl -s -X GET "http://localhost:8080/admin/realms/oauth2-realm/clients?clientId=prompt-submission-ui" \
  -H "Authorization: Bearer $TOKEN" | jq -r ".[0].id")

echo "Client UUID: $CLIENT_UUID"

# Add protocol mapper
curl -s -X POST "http://localhost:8080/admin/realms/oauth2-realm/clients/$CLIENT_UUID/protocol-mappers/models" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "audience-mapper",
    "protocol": "openid-connect",
    "protocolMapper": "oidc-audience-mapper",
    "consentRequired": false,
    "config": {
      "included.client.audience": "prompt-backend",
      "id.token.claim": "false",
      "access.token.claim": "true"
    }
  }'

echo ""
echo "Protocol mapper added successfully!"
