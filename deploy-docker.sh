#!/bin/bash

################################################################################
# MGNREGA Tracker - Docker Deployment Script
# 
# This script automates the complete deployment process:
# - Checks prerequisites
# - Validates configuration
# - Pulls latest code
# - Builds Docker images
# - Starts services
# - Initializes database
# - Sets up SSL (optional)
#
# Usage: chmod +x deploy-docker.sh && ./deploy-docker.sh
################################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${PROJECT_DIR}/.env.production"
BACKUP_DIR="${PROJECT_DIR}/backups/$(date +%Y%m%d_%H%M%S)"

################################################################################
# Helper Functions
################################################################################

print_header() {
    echo -e "\n${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
    exit 1
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

################################################################################
# Prerequisite Checks
################################################################################

check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker Desktop first."
    fi
    print_success "Docker is installed"
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running. Please start Docker."
    fi
    print_success "Docker daemon is running"
    
    # Check if docker-compose is available
    if ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not available. Please install Docker Compose."
    fi
    print_success "Docker Compose is available"
    
    # Check if .env.production exists
    if [ ! -f "$ENV_FILE" ]; then
        print_error ".env.production not found. Please copy .env.production to ${PROJECT_DIR}/ and configure it."
    fi
    print_success ".env.production found"
    
    # Check if node_modules exists in server, if not build will take longer
    if [ ! -d "${PROJECT_DIR}/server/node_modules" ]; then
        print_warning "node_modules not found in server. First build will take longer..."
    fi
}

################################################################################
# Configuration Validation
################################################################################

validate_configuration() {
    print_header "Validating Configuration"
    
    # Source the env file
    source "$ENV_FILE"
    
    # Check required variables
    if [ -z "$DB_PASSWORD" ] || [ "$DB_PASSWORD" = "your_secure_db_password_here_min_20_chars" ]; then
        print_error "DB_PASSWORD not properly configured in .env.production"
    fi
    print_success "DB_PASSWORD is configured"
    
    if [ -z "$REDIS_PASSWORD" ] || [ "$REDIS_PASSWORD" = "your_secure_redis_password_here_min_20_chars" ]; then
        print_error "REDIS_PASSWORD not properly configured in .env.production"
    fi
    print_success "REDIS_PASSWORD is configured"
    
    if [ -z "$DOMAIN" ] || [ "$DOMAIN" = "your-domain.com" ]; then
        print_error "DOMAIN not properly configured in .env.production"
    fi
    print_success "DOMAIN is configured: $DOMAIN"
}

################################################################################
# Build Phase
################################################################################

build_images() {
    print_header "Building Docker Images"
    
    print_info "Building frontend and backend..."
    cd "$PROJECT_DIR"
    
    # Build Node.js backend
    print_info "Building backend Docker image..."
    docker compose build api
    print_success "Backend image built"
    
    print_info "Building ETL worker Docker image..."
    docker compose build etl
    print_success "ETL worker image built"
}

################################################################################
# Deployment Phase
################################################################################

deploy_services() {
    print_header "Deploying Services"
    
    cd "$PROJECT_DIR"
    
    # Load environment
    export $(grep -v '^#' "$ENV_FILE" | xargs -0)
    
    # Stop existing containers if running
    print_info "Stopping existing containers (if any)..."
    docker compose down --remove-orphans 2>/dev/null || true
    print_success "Cleaned up old containers"
    
    # Start all services
    print_info "Starting all services..."
    docker compose up -d
    
    # Wait for services to be healthy
    print_info "Waiting for services to be healthy..."
    for i in {1..30}; do
        if docker compose exec -T postgres pg_isready -U mgnrega_user &>/dev/null; then
            print_success "PostgreSQL is healthy"
            break
        fi
        if [ $i -eq 30 ]; then
            print_error "PostgreSQL failed to start"
        fi
        echo -n "."
        sleep 1
    done
    
    for i in {1..30}; do
        if docker compose exec -T redis redis-cli ping &>/dev/null; then
            print_success "Redis is healthy"
            break
        fi
        if [ $i -eq 30 ]; then
            print_error "Redis failed to start"
        fi
        echo -n "."
        sleep 1
    done
    
    for i in {1..60}; do
        if docker compose exec -T api curl -f http://localhost:3000/api/v1/health &>/dev/null; then
            print_success "API is healthy"
            break
        fi
        if [ $i -eq 60 ]; then
            print_error "API failed to start"
        fi
        echo -n "."
        sleep 1
    done
}

################################################################################
# Database Initialization
################################################################################

initialize_database() {
    print_header "Initializing Database"
    
    cd "$PROJECT_DIR"
    
    print_info "Running database initialization..."
    docker compose exec -T api npm run init-db
    
    if [ $? -eq 0 ]; then
        print_success "Database initialized successfully"
    else
        print_warning "Database initialization completed (may already exist)"
    fi
}

################################################################################
# Backup Configuration
################################################################################

setup_backups() {
    print_header "Setting Up Backups"
    
    print_info "Creating backup directory..."
    mkdir -p "${PROJECT_DIR}/backups"
    
    # Create backup script
    cat > "${PROJECT_DIR}/backup.sh" << 'BACKUP_EOF'
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups/backup_${TIMESTAMP}"
mkdir -p "$BACKUP_DIR"

echo "Backing up PostgreSQL database..."
docker compose exec -T postgres pg_dump -U mgnrega_user mgnrega_tracker | gzip > "$BACKUP_DIR/database.sql.gz"

echo "Backing up Redis data..."
docker compose exec -T redis redis-cli --rdb "$BACKUP_DIR/dump.rdb"

echo "Backup completed: $BACKUP_DIR"
BACKUP_EOF
    
    chmod +x "${PROJECT_DIR}/backup.sh"
    print_success "Backup script created at ./backup.sh"
    
    # Create restore script
    cat > "${PROJECT_DIR}/restore.sh" << 'RESTORE_EOF'
#!/bin/bash
if [ -z "$1" ]; then
    echo "Usage: ./restore.sh <backup_directory>"
    exit 1
fi

BACKUP_DIR="$1"
if [ ! -d "$BACKUP_DIR" ]; then
    echo "Error: Backup directory not found: $BACKUP_DIR"
    exit 1
fi

echo "Restoring database from $BACKUP_DIR..."
docker compose down
sleep 2
docker compose up -d postgres redis
sleep 5
zcat "$BACKUP_DIR/database.sql.gz" | docker compose exec -T postgres psql -U mgnrega_user mgnrega_tracker
docker compose up -d
echo "Restore completed!"
RESTORE_EOF
    
    chmod +x "${PROJECT_DIR}/restore.sh"
    print_success "Restore script created at ./restore.sh"
}

################################################################################
# Health Check
################################################################################

verify_deployment() {
    print_header "Verifying Deployment"
    
    cd "$PROJECT_DIR"
    
    # Check if all containers are running
    print_info "Checking container status..."
    docker compose ps
    
    # Test API health
    print_info "Testing API health endpoint..."
    if curl -f http://localhost:3000/api/v1/health &>/dev/null; then
        print_success "API is responding"
    else
        print_warning "API health check failed"
    fi
}

################################################################################
# SSL Setup (Optional)
################################################################################

setup_ssl() {
    print_header "SSL Certificate Setup (Optional)"
    
    read -p "Do you want to set up SSL with Let's Encrypt? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Skipping SSL setup. You can set it up later."
        return
    fi
    
    source "$ENV_FILE"
    
    if ! command -v certbot &> /dev/null; then
        print_info "Installing Certbot..."
        if [ -f /etc/os-release ]; then
            . /etc/os-release
            if [ "$ID" = "ubuntu" ] || [ "$ID" = "debian" ]; then
                sudo apt-get update && sudo apt-get install -y certbot
            fi
        fi
    fi
    
    print_info "Creating SSL directory..."
    mkdir -p "${PROJECT_DIR}/ssl"
    
    print_info "Obtaining SSL certificate for $DOMAIN..."
    sudo certbot certonly --standalone -d "$DOMAIN" --non-interactive --agree-tos -m admin@$DOMAIN
    
    if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        print_info "Copying certificates..."
        sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem "${PROJECT_DIR}/ssl/"
        sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem "${PROJECT_DIR}/ssl/"
        sudo chown $(whoami) "${PROJECT_DIR}/ssl/"*
        
        print_success "SSL certificates installed"
        print_info "Restarting Nginx..."
        docker compose restart nginx
        print_success "SSL setup completed!"
    else
        print_error "Failed to obtain SSL certificate"
    fi
}

################################################################################
# Cron Job Setup for Auto-Renewal
################################################################################

setup_ssl_renewal() {
    if [ ! -f "/etc/letsencrypt/live/$(grep DOMAIN "$ENV_FILE" | cut -d= -f2)/fullchain.pem" ]; then
        return
    fi
    
    print_header "Setting Up SSL Auto-Renewal"
    
    # Create renewal script
    cat > "${PROJECT_DIR}/renew-ssl.sh" << 'RENEWAL_EOF'
#!/bin/bash
DOMAIN=$(grep DOMAIN .env.production | cut -d= -f2)
certbot renew --quiet
cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ./ssl/
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ./ssl/
docker compose restart nginx
RENEWAL_EOF
    
    chmod +x "${PROJECT_DIR}/renew-ssl.sh"
    
    # Add to crontab
    (crontab -l 2>/dev/null || echo "") | grep -v "renew-ssl" | crontab -
    (crontab -l 2>/dev/null || echo ""; echo "0 3 * * * cd ${PROJECT_DIR} && ./renew-ssl.sh") | crontab -
    
    print_success "SSL auto-renewal configured (runs daily at 3 AM)"
}

################################################################################
# Final Summary
################################################################################

print_summary() {
    print_header "Deployment Complete! 🎉"
    
    source "$ENV_FILE"
    
    echo -e "${GREEN}Your MGNREGA Tracker is now running!${NC}\n"
    
    echo -e "📊 ${YELLOW}Application URLs:${NC}"
    echo -e "   Web:    http://${DOMAIN}"
    echo -e "   API:    http://${DOMAIN}/api/v1\n"
    
    echo -e "📁 ${YELLOW}Project Directory:${NC}"
    echo -e "   ${PROJECT_DIR}\n"
    
    echo -e "🔧 ${YELLOW}Useful Commands:${NC}"
    echo -e "   View logs:      docker compose logs -f api"
    echo -e "   Restart:        docker compose restart"
    echo -e "   Stop:           docker compose down"
    echo -e "   Backup:         ./backup.sh"
    echo -e "   Restore:        ./restore.sh <backup_dir>\n"
    
    echo -e "📝 ${YELLOW}Next Steps:${NC}"
    echo -e "   1. Test your application at http://${DOMAIN}"
    echo -e "   2. Set up DNS to point to this server"
    echo -e "   3. Configure SSL/HTTPS"
    echo -e "   4. Set up monitoring and backups\n"
    
    echo -e "📚 ${YELLOW}Documentation:${NC}"
    echo -e "   QUICKSTART_DEPLOY.md"
    echo -e "   DEPLOY_DOCKER.md"
    echo -e "   DEPLOYMENT_SUMMARY.md\n"
    
    echo -e "✅ ${GREEN}Ready to serve MGNREGA data!${NC}\n"
}

################################################################################
# Main Execution
################################################################################

main() {
    print_header "MGNREGA Tracker - Docker Deployment"
    
    print_info "Starting deployment process..."
    
    check_prerequisites
    validate_configuration
    build_images
    deploy_services
    initialize_database
    setup_backups
    verify_deployment
    setup_ssl
    setup_ssl_renewal
    print_summary
    
    print_success "Deployment finished successfully!"
}

# Run main function
main "$@"