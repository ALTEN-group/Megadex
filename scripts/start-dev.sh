#!/bin/bash

# Start Development Environment Script
# This script starts all services using docker-compose in development mode

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Starting development environment...${NC}"

# The swagger container hard-`require`s megadex.openapi.json at boot. Stub it from the
# checked-in example on first run so start-dev succeeds before setup-mocks.sh has run.
# setup-mocks.sh regenerates it with real credentials and restarts swagger.
if [[ ! -f swagger/src/megadex.openapi.json ]]; then
  cp swagger/src/megadex.openapi.example.json swagger/src/megadex.openapi.json
fi

# Ensure bind-mount directories exist before Docker tries to mount them
mkdir -p node_modules admin/node_modules

# Build and start services
docker compose -f docker/docker-compose.yml --env-file docker/conf/.env.dev up --build -d

echo -e "${GREEN}✅ Development environment started!${NC}"

# Dev user passwords live in Foxnox's pwd table but are created at runtime by
# setup-mocks.sh, not by Liquibase — so a fresh postgres volume comes up with no
# credentials. Seeding here keeps that from being a manual step people forget.
echo -e ""
if ! ./scripts/setup-mocks.sh --if-missing; then
  echo -e ""
  echo -e "${RED}✗ Dev password seeding failed.${NC} The stack is up, but logins will fail"
  echo -e "  until you run: ${YELLOW}scripts/setup-mocks.sh${NC}"
fi

echo -e ""
echo -e "Run 'docker-compose logs -f' to view logs"
