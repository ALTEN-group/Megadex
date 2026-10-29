#!/bin/bash

# Cleanup Megadex Service Script
# This script removes only the Megadex service container, image, and volume
# (Does not affect postgres, traefik, migration, or other services)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${RED}🗑️  Cleaning up Megadex service...${NC}"
echo -e ""

# Load environment variables
if [[ -f docker/conf/.env.dev ]]; then
  source "$(dirname "${BASH_SOURCE[0]}")/lib/load-env.sh"
  load_env_file docker/conf/.env.dev
  echo -e "${BLUE}ℹ${NC}  Loaded environment variables from docker/conf/.env.dev"
else
  echo -e "${YELLOW}⚠${NC}  Environment file not found, using defaults"
fi

# Set defaults if not loaded
APP_NAME=${APP_NAME:-megadex}
NODE_ENV=${NODE_ENV:-development}
ENV_NAME=${ENV_NAME:-local}

# Define the specific Megadex service container name
MEGADEX_CONTAINER="${APP_NAME}-megadex-${ENV_NAME}"

echo -e "${BLUE}ℹ${NC}  Target container: $MEGADEX_CONTAINER"
echo -e ""

# =====================
# STOP AND REMOVE CONTAINER
# =====================
echo -e "${YELLOW}📦 Stopping and removing Megadex container...${NC}"

docker rm -f "$MEGADEX_CONTAINER" 2>/dev/null && echo -e "${GREEN}✓${NC} Removed container: $MEGADEX_CONTAINER" || echo -e "${YELLOW}⚠${NC}  Container $MEGADEX_CONTAINER not found"

echo -e ""

# =====================
# REMOVE IMAGE
# =====================
echo -e "${YELLOW}🖼️  Removing Megadex image...${NC}"

MEGADEX_IMAGE="megadex:${NODE_ENV}"
docker rmi -f "$MEGADEX_IMAGE" 2>/dev/null && echo -e "${GREEN}✓${NC} Removed image: $MEGADEX_IMAGE" || echo -e "${YELLOW}⚠${NC}  Image $MEGADEX_IMAGE not found"

echo -e ""

# =====================
# REMOVE VOLUME
# =====================
echo -e "${YELLOW}💾 Checking for Megadex node_modules volume...${NC}"

# Look for the specific megadex_node_modules volume
MEGADEX_VOLUME="${APP_NAME}_megadex_node_modules"

if docker volume inspect "$MEGADEX_VOLUME" >/dev/null 2>&1; then
  docker volume rm "$MEGADEX_VOLUME" 2>/dev/null && echo -e "${GREEN}✓${NC} Removed volume: $MEGADEX_VOLUME" || echo -e "${RED}✗${NC} Failed to remove volume: $MEGADEX_VOLUME"
else
  echo -e "${YELLOW}⚠${NC}  Volume $MEGADEX_VOLUME not found"
fi

echo -e ""
echo -e "${GREEN}✅ Cleanup complete!${NC}"
echo -e "${BLUE}ℹ${NC}  The Megadex service container, image and volume have been removed."
echo -e "${BLUE}ℹ${NC}  Other services (postgres, traefik, etc.) remain untouched."

# Restart all services
echo -e ""
./scripts/start-dev.sh