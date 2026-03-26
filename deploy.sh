#!/usr/bin/env bash
# =============================================================================
# OpenMAIC Production Deployment Script
#
# Deploys OpenMAIC with Cloudflare Tunnel for public HTTPS access.
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh setup    # First-time setup (interactive)
#   ./deploy.sh start    # Start services
#   ./deploy.sh stop     # Stop services
#   ./deploy.sh restart  # Rebuild and restart
#   ./deploy.sh logs     # Tail logs
#   ./deploy.sh status   # Show service status
# =============================================================================

set -euo pipefail

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.local"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

check_deps() {
  for cmd in docker; do
    if ! command -v "$cmd" &>/dev/null; then
      error "$cmd is not installed"
      exit 1
    fi
  done
  # Check docker compose (v2 plugin)
  if ! docker compose version &>/dev/null; then
    error "docker compose plugin is not installed"
    exit 1
  fi
}

setup() {
  info "Starting OpenMAIC setup..."

  # Create .env.local if missing
  if [ ! -f "$ENV_FILE" ]; then
    cp .env.example "$ENV_FILE"
    info "Created $ENV_FILE from .env.example"
  fi

  # Check for Cloudflare Tunnel token
  if ! grep -q "^CLOUDFLARE_TUNNEL_TOKEN=" "$ENV_FILE" 2>/dev/null; then
    echo "" >> "$ENV_FILE"
    echo "# --- Cloudflare Tunnel ---" >> "$ENV_FILE"
    echo "CLOUDFLARE_TUNNEL_TOKEN=" >> "$ENV_FILE"
  fi

  if grep -q "^CLOUDFLARE_TUNNEL_TOKEN=$" "$ENV_FILE"; then
    warn "Cloudflare Tunnel token not set."
    echo ""
    echo "To get a token:"
    echo "  1. Go to https://one.dash.cloudflare.com"
    echo "  2. Navigate to: Networks → Tunnels → Create a tunnel"
    echo "  3. Choose 'Cloudflared' connector"
    echo "  4. Copy the tunnel token"
    echo "  5. In the tunnel config, add a public hostname:"
    echo "     - Subdomain: your-app (e.g., maic.yourdomain.com)"
    echo "     - Service: http://openmaic:3000"
    echo ""
    read -rp "Enter your Cloudflare Tunnel token (or press Enter to skip): " token
    if [ -n "$token" ]; then
      sed -i "s|^CLOUDFLARE_TUNNEL_TOKEN=.*|CLOUDFLARE_TUNNEL_TOKEN=$token|" "$ENV_FILE"
      info "Token saved to $ENV_FILE"
    else
      warn "Skipped. Edit $ENV_FILE later to add the token."
    fi
  fi

  echo ""
  info "Setup complete. Edit $ENV_FILE to configure your API keys, then run:"
  echo "  ./deploy.sh start"
}

start() {
  check_deps

  if [ ! -f "$ENV_FILE" ]; then
    error "$ENV_FILE not found. Run './deploy.sh setup' first."
    exit 1
  fi

  # Check if tunnel token is set
  if grep -q "^CLOUDFLARE_TUNNEL_TOKEN=$" "$ENV_FILE" 2>/dev/null; then
    warn "Cloudflare Tunnel token not set — starting without tunnel."
    warn "The app will only be accessible locally. Run './deploy.sh setup' to configure."
    # Fall back to dev compose (with port mapping)
    docker compose up -d --build
    info "OpenMAIC started at http://localhost:3000"
  else
    docker compose -f "$COMPOSE_FILE" up -d --build
    info "OpenMAIC started behind Cloudflare Tunnel."
    info "Check your Cloudflare dashboard for the public URL."
  fi
}

stop() {
  check_deps
  docker compose -f "$COMPOSE_FILE" down 2>/dev/null || docker compose down 2>/dev/null
  info "Services stopped."
}

restart() {
  stop
  start
}

logs() {
  docker compose -f "$COMPOSE_FILE" logs -f --tail=100 2>/dev/null || \
    docker compose logs -f --tail=100 2>/dev/null
}

status() {
  check_deps
  echo ""
  docker compose -f "$COMPOSE_FILE" ps 2>/dev/null || docker compose ps 2>/dev/null
  echo ""
  # Health check
  if curl -sf http://localhost:3000/api/health >/dev/null 2>&1; then
    info "Health check: OK"
    curl -s http://localhost:3000/api/health | python3 -m json.tool 2>/dev/null || \
      curl -s http://localhost:3000/api/health
  else
    warn "Health check: App not reachable on localhost:3000 (may be behind tunnel only)"
  fi
}

# --- Main ---
case "${1:-help}" in
  setup)   setup   ;;
  start)   start   ;;
  stop)    stop    ;;
  restart) restart ;;
  logs)    logs    ;;
  status)  status  ;;
  *)
    echo "Usage: $0 {setup|start|stop|restart|logs|status}"
    echo ""
    echo "  setup    First-time setup (creates .env.local, configures tunnel)"
    echo "  start    Build and start services"
    echo "  stop     Stop all services"
    echo "  restart  Rebuild and restart"
    echo "  logs     Tail service logs"
    echo "  status   Show service status and health"
    ;;
esac
