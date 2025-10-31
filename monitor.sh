#!/bin/bash

################################################################################
# MGNREGA Tracker - Health Monitoring Script
#
# This script continuously monitors the health of all services and alerts
# if any service goes down. Can be run in background.
#
# Usage: chmod +x monitor.sh && ./monitor.sh
#        Or: nohup ./monitor.sh > monitor.log 2>&1 &
################################################################################

set -e

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${PROJECT_DIR}/monitor.log"
ALERT_EMAIL="${ALERT_EMAIL:-}"  # Set environment variable if you want email alerts
CHECK_INTERVAL=60  # Check every 60 seconds
RETRY_COUNT=3
RETRY_DELAY=5

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# State tracking
declare -A SERVICE_STATUS
SERVICE_STATUS[postgres]="up"
SERVICE_STATUS[redis]="up"
SERVICE_STATUS[api]="up"
SERVICE_STATUS[nginx]="up"

################################################################################
# Logging Functions
################################################################################

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
    echo -e "${BLUE}ℹ${NC} $1"
}

log_error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" >> "$LOG_FILE"
    echo -e "${RED}✗${NC} $1"
}

log_success() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS: $1" >> "$LOG_FILE"
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1" >> "$LOG_FILE"
    echo -e "${YELLOW}⚠${NC} $1"
}

################################################################################
# Alert Functions
################################################################################

send_alert() {
    local message="$1"
    log_error "$message"
    
    # Email alert (if configured)
    if [ ! -z "$ALERT_EMAIL" ]; then
        echo "$message" | mail -s "MGNREGA Alert: $(hostname)" "$ALERT_EMAIL"
    fi
    
    # Log to syslog
    logger -t mgnrega-monitor "$message"
}

################################################################################
# Health Check Functions
################################################################################

check_postgres() {
    if docker compose -f "${PROJECT_DIR}/docker-compose.yml" exec -T postgres pg_isready -U mgnrega_user &>/dev/null; then
        return 0
    fi
    return 1
}

check_redis() {
    if docker compose -f "${PROJECT_DIR}/docker-compose.yml" exec -T redis redis-cli ping &>/dev/null | grep -q "PONG"; then
        return 0
    fi
    return 1
}

check_api() {
    if curl -f http://localhost:3000/api/v1/health &>/dev/null; then
        return 0
    fi
    return 1
}

check_nginx() {
    if curl -f http://localhost:80 &>/dev/null; then
        return 0
    fi
    return 1
}

################################################################################
# Service Restart Functions
################################################################################

restart_service() {
    local service="$1"
    log_warning "Attempting to restart $service..."
    
    docker compose -f "${PROJECT_DIR}/docker-compose.yml" restart "$service"
    
    if [ $? -eq 0 ]; then
        log_success "$service restarted successfully"
        SERVICE_STATUS[$service]="up"
        return 0
    else
        log_error "Failed to restart $service"
        SERVICE_STATUS[$service]="down"
        return 1
    fi
}

################################################################################
# Health Check with Retry Logic
################################################################################

check_service_with_retry() {
    local service="$1"
    local check_func="check_${service}"
    local retries=0
    
    while [ $retries -lt $RETRY_COUNT ]; do
        if $check_func; then
            if [ "${SERVICE_STATUS[$service]}" = "down" ]; then
                log_success "$service is back online"
                SERVICE_STATUS[$service]="up"
            fi
            return 0
        fi
        
        retries=$((retries + 1))
        if [ $retries -lt $RETRY_COUNT ]; then
            sleep $RETRY_DELAY
        fi
    done
    
    # Service is down after all retries
    if [ "${SERVICE_STATUS[$service]}" = "up" ]; then
        send_alert "$service is DOWN! Attempting automatic restart..."
        restart_service "$service"
    fi
    
    SERVICE_STATUS[$service]="down"
    return 1
}

################################################################################
# Disk Space Check
################################################################################

check_disk_space() {
    local threshold=90  # Alert if disk usage > 90%
    local usage=$(df "${PROJECT_DIR}" | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ "$usage" -gt "$threshold" ]; then
        send_alert "Disk usage is high: ${usage}% at ${PROJECT_DIR}"
    fi
}

################################################################################
# Docker Container Check
################################################################################

check_containers() {
    local stopped_containers=$(docker compose -f "${PROJECT_DIR}/docker-compose.yml" ps --services --filter "status=exited")
    
    if [ ! -z "$stopped_containers" ]; then
        send_alert "Stopped containers detected: $stopped_containers"
        log_warning "Restarting stopped containers..."
        docker compose -f "${PROJECT_DIR}/docker-compose.yml" up -d
    fi
}

################################################################################
# Status Report
################################################################################

print_status() {
    echo -e "\n${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}Health Check Report - $(date)${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}\n"
    
    for service in postgres redis api nginx; do
        if [ "${SERVICE_STATUS[$service]}" = "up" ]; then
            echo -e "${GREEN}✓${NC} $service: UP"
        else
            echo -e "${RED}✗${NC} $service: DOWN"
        fi
    done
    
    echo ""
}

################################################################################
# Database Statistics
################################################################################

get_db_stats() {
    if ! check_postgres; then
        return
    fi
    
    local row_count=$(docker compose -f "${PROJECT_DIR}/docker-compose.yml" exec -T postgres psql -U mgnrega_user mgnrega_tracker -c "SELECT COUNT(*) FROM pg_stat_user_tables;" 2>/dev/null | tail -1 | tr -d ' ')
    
    if [ ! -z "$row_count" ]; then
        log "Database contains approximately $row_count tables"
    fi
}

################################################################################
# Main Monitoring Loop
################################################################################

initialize() {
    log "MGNREGA Tracker monitoring started"
    log "Check interval: ${CHECK_INTERVAL} seconds"
    log "Project directory: ${PROJECT_DIR}"
    
    cd "$PROJECT_DIR"
}

monitor_loop() {
    while true; do
        print_status
        
        # Check all services
        check_service_with_retry "postgres"
        check_service_with_retry "redis"
        check_service_with_retry "api"
        check_service_with_retry "nginx"
        
        # Additional checks
        check_disk_space
        check_containers
        
        # Get stats periodically (every 5 checks)
        if [ $((SECONDS % 300)) -lt 60 ]; then
            get_db_stats
        fi
        
        # Wait before next check
        sleep "$CHECK_INTERVAL"
    done
}

################################################################################
# Signal Handling
################################################################################

cleanup() {
    log "Monitoring stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

################################################################################
# Main Execution
################################################################################

initialize
monitor_loop