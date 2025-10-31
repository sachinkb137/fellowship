# MGNREGA Performance Tracker - Docker Deployment Guide

## Quick Overview

This guide provides the **fastest way** to deploy the MGNREGA Performance Tracker using Docker and Docker Compose. Everything is containerized for:

- **Easy Setup**: One command startup
- **Scalability**: Easy horizontal scaling
- **Isolation**: Services don't conflict
- **Portability**: Works on any system with Docker
- **Reproducibility**: Same environment everywhere

---

## Prerequisites

### Required Software

- Docker 20.10+
- Docker Compose 2.0+
- Linux VM/VPS with Ubuntu 22.04 LTS or newer
- 2GB RAM minimum (4GB recommended)
- 20GB storage

### Install Docker & Docker Compose

```bash
# SSH into your VM/VPS
ssh root@your-vps-ip

# Update system
apt update && apt upgrade -y

# Install Docker
apt install -y docker.io docker-compose

# Add current user to docker group (avoid sudo for docker commands)
usermod -aG docker $USER

# Verify installation
docker --version
docker-compose --version
```

---

## Step 1: Prepare Your Application

```bash
# Navigate to your project root (if on your local machine)
cd /path/to/mgnrega-tracker

# Build the client application
cd client
npm run build
cd ..

# The docker-compose.yml will use the built files
```

---

## Step 2: Create `.env` File

```bash
# Create .env file in project root
cat > .env << EOF
# Database Configuration (CHANGE THESE!)
DB_PASSWORD=your_super_secure_db_password_12345
REDIS_PASSWORD=your_super_secure_redis_password_67890

# Domain Configuration
DOMAIN=your-domain.com
# Leave as localhost if testing locally
EOF
```

**Critical Security**: 
- Replace `your_super_secure_db_password_12345` with a strong password!
- Replace `your_super_secure_redis_password_67890` with a strong password!

---

## Step 3: Deploy with Docker Compose

```bash
# Upload your project to the VM (or clone from Git)
# Assuming you're in the project root directory on your VM:

# Build and start all containers
docker-compose -f docker-compose.yml up -d

# Verify all containers are running
docker-compose ps

# Expected output:
# NAME                    STATUS
# mgnrega_postgres        Up (healthy)
# mgnrega_redis           Up (healthy)
# mgnrega_api             Up (healthy)
# mgnrega_etl             Up
# mgnrega_nginx           Up
```

---

## Step 4: Initialize Database

```bash
# Wait for API to be healthy (about 10 seconds)
sleep 5

# Initialize database tables
docker-compose exec api npm run init-db

# Verify database was initialized
docker-compose exec postgres psql -U mgnrega_user -d mgnrega_tracker -c "SELECT COUNT(*) FROM districts;"
```

---

## Step 5: Setup SSL with Let's Encrypt

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate (your domain must point to this IP)
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Certificates are in: /etc/letsencrypt/live/your-domain.com/

# Copy certificates to project ssl directory
mkdir -p ./ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./ssl/
sudo chown -R $USER:$USER ./ssl

# Update nginx.conf to use HTTPS (see section below)
```

---

## Step 6: Configure Nginx with HTTPS

Update your `nginx.conf` to include SSL configuration. The basic configuration should include:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$host$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    # ... rest of configuration
}
```

---

## Step 7: Verify Deployment

### Check Container Status

```bash
# View all containers
docker-compose ps

# View container logs
docker-compose logs -f api

# View specific service logs
docker-compose logs -f nginx
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Test API

```bash
# Health check endpoint
curl http://localhost:3000/api/v1/health

# List districts
curl http://localhost:3000/api/v1/districts | jq

# Test through Nginx
curl http://localhost/api/v1/health
```

### Test in Browser

1. Navigate to: `http://your-vps-ip` (or `https://your-domain.com` if SSL is setup)
2. Select a district
3. Verify data loads

---

## Step 8: Backup Database

### Manual Backup

```bash
# Backup database to file
docker-compose exec -T postgres pg_dump -U mgnrega_user mgnrega_tracker > backup-$(date +%Y%m%d-%H%M%S).sql

# Backup with compression
docker-compose exec -T postgres pg_dump -U mgnrega_user mgnrega_tracker | gzip > backup-$(date +%Y%m%d-%H%M%S).sql.gz

# List backups
ls -lah backup-*.sql.gz
```

### Automated Daily Backups

```bash
# Create backup script
cat > backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

docker-compose exec -T postgres pg_dump -U mgnrega_user mgnrega_tracker | gzip > $BACKUP_DIR/mgnrega_$TIMESTAMP.sql.gz

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Database backup completed: $BACKUP_DIR/mgnrega_$TIMESTAMP.sql.gz"
EOF

# Make executable
chmod +x backup-db.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * $(pwd)/backup-db.sh") | crontab -
```

---

## Step 9: Update Application

### Pull Latest Changes

```bash
# Pull latest code from repository
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Verify everything is running
docker-compose ps
```

### Update Dependencies

```bash
# Rebuild containers (cleans old images)
docker-compose up -d --build --remove-orphans

# Clean up old images
docker image prune -af
```

---

## Step 10: Monitoring

### View Real-Time Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api

# Last 100 lines
docker-compose logs -f --tail 100 nginx
```

### Monitor Resource Usage

```bash
# Docker stats for all containers
docker stats

# Specific container
docker stats mgnrega_api
```

### Database Monitoring

```bash
# Connect to database
docker-compose exec postgres psql -U mgnrega_user -d mgnrega_tracker

# Inside psql:
SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;
\quit
```

### Redis Monitoring

```bash
# Connect to Redis
docker-compose exec redis redis-cli -a ${REDIS_PASSWORD}

# Inside redis-cli:
INFO
DBSIZE
KEYS *
\q
```

---

## Useful Docker Compose Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart a service
docker-compose restart api

# View logs
docker-compose logs -f

# Execute command in container
docker-compose exec api npm run init-db

# Access shell in container
docker-compose exec api sh
docker-compose exec postgres psql -U mgnrega_user -d mgnrega_tracker

# Scale service (scale API to 3 instances)
docker-compose up -d --scale api=3

# Remove all data (WARNING: deletes databases!)
docker-compose down -v
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs api

# Check for port conflicts
netstat -tlnp | grep 3000

# Remove and recreate container
docker-compose down
docker-compose up -d
```

### Database Connection Error

```bash
# Check if database is healthy
docker-compose ps postgres

# Connect to container and test
docker-compose exec postgres psql -U mgnrega_user -d mgnrega_tracker -c "SELECT NOW();"

# View database logs
docker-compose logs postgres
```

### API Not Responding

```bash
# Check if container is running
docker-compose ps api

# Check API logs
docker-compose logs -f api

# Test API from host
docker-compose exec api curl -f http://localhost:3000/api/v1/health
```

### Out of Memory

```bash
# Check memory usage
docker stats

# View memory limits in docker-compose.yml
# Add memory limits:
# services:
#   api:
#     mem_limit: 500m
#     memswap_limit: 500m
```

---

## Backing Up & Restoring Data

### Backup Everything

```bash
# Backup database, Redis, and configs
tar -czf mgnrega-backup-$(date +%Y%m%d).tar.gz \
  docker-compose.yml \
  nginx.conf \
  .env \
  client/dist \
  backups/
```

### Restore Database

```bash
# From backup file
docker-compose exec -T postgres psql -U mgnrega_user mgnrega_tracker < backup-20240115-120000.sql

# From compressed backup
gunzip < backup-20240115-120000.sql.gz | docker-compose exec -T postgres psql -U mgnrega_user mgnrega_tracker
```

---

## Performance Tuning

### Database

```bash
# Run VACUUM and ANALYZE for optimization
docker-compose exec postgres psql -U mgnrega_user mgnrega_tracker << EOF
VACUUM ANALYZE;
REINDEX DATABASE mgnrega_tracker;
EOF
```

### Redis

```bash
# Monitor Redis memory
docker-compose exec redis redis-cli INFO memory

# Increase max memory if needed (in .env)
# REDIS_MAXMEMORY=256mb
# REDIS_MAXMEMORY_POLICY=allkeys-lru
```

### API

```bash
# Scale API to multiple instances
docker-compose up -d --scale api=3

# Check load balancing
docker-compose ps | grep api
```

---

## SSL Certificate Auto-Renewal

```bash
# Setup Certbot auto-renewal
sudo certbot renew --dry-run

# Create renewal hook to reload Nginx
sudo certbot renew --post-hook "cd $(pwd) && docker-compose reload nginx"

# Schedule renewal with crontab
# Certbot sets this up automatically at /etc/cron.d/certbot
```

---

## Production Checklist

- [ ] `.env` file created with strong passwords
- [ ] Database initialized (`npm run init-db`)
- [ ] All containers running and healthy
- [ ] SSL certificate installed
- [ ] Domain DNS pointing to server IP
- [ ] Backups scheduled daily
- [ ] Logs rotating properly
- [ ] Monitoring setup
- [ ] Firewall configured
- [ ] Database connection verified
- [ ] API endpoints responding correctly
- [ ] Frontend loading in browser
- [ ] PWA offline functionality works

---

## Quick Troubleshooting Flowchart

```
Is the app loading?
├─ YES → Select a district, does data load?
│        ├─ YES → Setup complete! ✅
│        └─ NO → Check API logs: docker-compose logs -f api
└─ NO → Check containers: docker-compose ps
        ├─ All running → Check Nginx: docker-compose logs -f nginx
        └─ Not running → Start: docker-compose up -d
```

---

## Summary of Key Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Container orchestration |
| `server/Dockerfile` | Node.js API image |
| `.env` | Configuration & secrets |
| `nginx.conf` | Web server & reverse proxy |
| `ssl/` | SSL certificates |
| `client/dist/` | Built React frontend |

---

## Estimated Deployment Time

- **Initial Setup**: 5-10 minutes
- **First Start**: 30-60 seconds
- **SSL Setup**: 5-10 minutes
- **Verification**: 5 minutes

**Total**: ~30 minutes

---

## Next Steps

1. ✅ Deploy with Docker Compose
2. ✅ Setup SSL certificates
3. ✅ Configure domain DNS
4. ✅ Test thoroughly
5. ✅ Setup monitoring
6. ✅ Setup automated backups
7. ⏳ Configure ETL data fetching
8. ⏳ Setup analytics

---

## Support Resources

- **Docker Docs**: https://docs.docker.com/
- **Docker Compose Docs**: https://docs.docker.com/compose/
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Redis Docs**: https://redis.io/documentation
- **Nginx Docs**: https://nginx.org/en/docs/

---

**That's it! Your MGNREGA Performance Tracker is now running on Docker! 🐳🚀**

For troubleshooting, check logs with: `docker-compose logs -f`