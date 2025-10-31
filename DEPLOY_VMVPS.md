# MGNREGA Performance Tracker - VM/VPS Deployment Guide

## Quick Overview

This guide provides step-by-step instructions to deploy the MGNREGA Performance Tracker on a Linux VM/VPS with:
- **Frontend**: React app served by Nginx
- **Backend**: Node.js API with PM2 process manager
- **Database**: PostgreSQL with own database
- **Caching**: Redis for performance
- **SSL**: Free Let's Encrypt certificates
- **Monitoring**: PM2 monitoring and health checks

---

## Prerequisites

### Infrastructure Requirements

- **VM/VPS**: Ubuntu 22.04 LTS or newer
- **Resources**: Minimum 2 CPU, 2GB RAM (4GB+ recommended)
- **Storage**: 20GB SSD minimum
- **Network**: Open ports 80, 443, 3000 (backend), 5432 (database - internal only)
- **SSH Access**: Root or sudo permissions

### Required Software (we'll install these)

- Node.js 18+
- npm 9+
- PostgreSQL 15+
- Redis 7+
- Nginx
- PM2
- Certbot (Let's Encrypt)

---

## Step 1: SSH into Your VM/VPS

```bash
ssh root@your-vps-ip
# or if using a key
ssh -i /path/to/key root@your-vps-ip
```

---

## Step 2: System Update & Base Setup

```bash
# Update system packages
apt update
apt upgrade -y

# Install essential tools
apt install -y curl wget git build-essential software-properties-common

# Add NodeSource repository for Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js and npm
apt install -y nodejs

# Verify installation
node -v  # should show v18.x.x
npm -v   # should show 9.x.x
```

---

## Step 3: Install PostgreSQL

```bash
# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Verify PostgreSQL is running
systemctl status postgresql

# Switch to postgres user and create app database
sudo -u postgres psql << EOF
CREATE ROLE mgnrega_user WITH PASSWORD 'your_secure_password_here' LOGIN;
CREATE DATABASE mgnrega_tracker OWNER mgnrega_user;
GRANT ALL PRIVILEGES ON DATABASE mgnrega_tracker TO mgnrega_user;
\q
EOF

# Verify database was created
sudo -u postgres psql -l
```

**Important**: Replace `'your_secure_password_here'` with a strong password!

---

## Step 4: Install Redis

```bash
# Install Redis
apt install -y redis-server

# Start and enable Redis
systemctl start redis-server
systemctl enable redis-server

# Verify Redis is running
redis-cli ping
# Should respond with: PONG

# (Optional) Secure Redis with password
# Edit /etc/redis/redis.conf
# Uncomment and set: requirepass your_redis_password
# Then restart: systemctl restart redis-server
```

---

## Step 5: Install Nginx

```bash
# Install Nginx
apt install -y nginx

# Start and enable Nginx
systemctl start nginx
systemctl enable nginx

# Verify Nginx is running
systemctl status nginx
```

---

## Step 6: Install PM2 for Process Management

```bash
# Install PM2 globally
npm install -g pm2

# Enable PM2 startup (runs on boot)
pm2 startup

# Save PM2 configuration
pm2 save
```

---

## Step 7: Clone Application Repository

```bash
# Create application directory
mkdir -p /var/www/mgnrega-tracker
cd /var/www/mgnrega-tracker

# Clone your repository (update URL as needed)
git clone https://github.com/yourusername/mgnrega-tracker.git .

# Or if you have a git repo:
# git clone https://your-repo-url.git .

# Navigate to directory
cd /var/www/mgnrega-tracker
```

If you don't have Git setup, create the following directory structure:

```bash
# Copy your built files manually
# You'll upload your client/dist and server/dist folders via SFTP or scp
```

---

## Step 8: Setup Application Configuration

```bash
# Navigate to server directory
cd /var/www/mgnrega-tracker/server

# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

### Configure `.env` File (server/.env)

```env
# Server
PORT=3000
NODE_ENV=production

# Database Configuration (CRITICAL - UPDATE WITH YOUR PASSWORD)
DATABASE_URL=postgres://mgnrega_user:your_secure_password_here@localhost:5432/mgnrega_tracker

# Redis Configuration
REDIS_MOCK=false
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
# REDIS_PASSWORD=your_redis_password  # Uncomment if Redis is password-protected

# API Configuration
API_RATE_LIMIT=100
API_RATE_WINDOW_MS=900000
CACHE_TTL=86400

# Data Refresh Configuration
ETL_SCHEDULE="0 */6 * * *"  # Every 6 hours
DATA_RETENTION_DAYS=365

# AWS/S3 (Optional - only if using)
# AWS_ACCESS_KEY_ID=your_key
# AWS_SECRET_ACCESS_KEY=your_secret
# AWS_REGION=ap-south-1
# S3_BUCKET=mgnrega-data
```

**Critical**: Update `DATABASE_URL` and `REDIS_PASSWORD` with your actual values!

---

## Step 9: Install Dependencies & Build

```bash
# Go back to root directory
cd /var/www/mgnrega-tracker

# Install root dependencies
npm install

# Build both client and server
npm run build

# Verify builds were successful
ls -la client/dist/
ls -la server/dist/

# Run database initialization
cd server
npm run init-db
```

---

## Step 10: Configure Nginx as Reverse Proxy

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/mgnrega-tracker
```

### Paste this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Redirect HTTP to HTTPS (after SSL is setup)
    # return 301 https://$host$request_uri;

    root /var/www/mgnrega-tracker/client/dist;
    index index.html;

    # API Proxy to Node.js backend
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Frontend static files
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "public, max-age=0, must-revalidate";
    }

    # Cache static assets
    location /assets {
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/rss+xml application/javascript application/json;
}
```

**Important**: Replace `your-domain.com` with your actual domain!

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/mgnrega-tracker /etc/nginx/sites-enabled/

# Disable default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## Step 11: Setup SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate (requires domain to point to this IP)
sudo certbot certonly --nginx -d your-domain.com -d www.your-domain.com

# Certbot will create certificates in: /etc/letsencrypt/live/your-domain.com/

# Update Nginx config to use HTTPS
sudo nano /etc/nginx/sites-available/mgnrega-tracker
```

### Update Nginx config with SSL (replace the `server` block):

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

    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    root /var/www/mgnrega-tracker/client/dist;
    index index.html;

    # API Proxy to Node.js backend
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Frontend static files
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "public, max-age=0, must-revalidate";
    }

    # Cache static assets
    location /assets {
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/rss+xml application/javascript application/json;
}
```

```bash
# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx

# Setup auto-renewal of SSL certificate
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Verify auto-renewal is working
sudo systemctl status certbot.timer
```

---

## Step 12: Start Application with PM2

```bash
# Navigate to server directory
cd /var/www/mgnrega-tracker/server

# Start application using PM2 config
pm2 start ../ecosystem.config.js --env production

# Save PM2 configuration to restart on reboot
pm2 save

# View logs
pm2 logs

# View status
pm2 status

# (Optional) Setup PM2 monitoring dashboard
# pm2 web  # Runs on http://localhost:9615
```

### Verify Application is Running

```bash
# Check if port 3000 is listening
netstat -tlnp | grep 3000

# Check if Nginx is listening
netstat -tlnp | grep 80
netstat -tlnp | grep 443

# Check API response
curl http://localhost:3000/api/v1/health

# Check if Redis is accessible
redis-cli ping

# Check database connection
psql -U mgnrega_user -d mgnrega_tracker -h localhost -c "SELECT 1;"
```

---

## Step 13: Verify Everything is Working

### Test Frontend

```bash
curl http://your-domain.com
# Should return HTML of the React app
```

### Test API

```bash
curl http://your-domain.com/api/v1/districts
# Should return JSON with districts list
```

### Test in Browser

1. Open: https://your-domain.com
2. Wait for page to load
3. Select a district
4. Verify data loads

---

## Step 14: Setup Monitoring & Logs

### View Application Logs

```bash
# View all logs
pm2 logs

# View specific app logs
pm2 logs mgnrega-api

# View ETL logs
pm2 logs mgnrega-etl

# Check error logs
pm2 logs --err
```

### Monitor System Resources

```bash
# Install PM2 monitoring
pm2 install pm2-logrotate

# View real-time monitoring
pm2 monit

# Get system info
pm2 info mgnrega-api
```

### Database Backups

```bash
# Create daily backup script
sudo nano /usr/local/bin/backup-mgnrega-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/mgnrega"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

pg_dump -U mgnrega_user mgnrega_tracker | gzip > $BACKUP_DIR/mgnrega_$TIMESTAMP.sql.gz

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Database backup completed: $BACKUP_DIR/mgnrega_$TIMESTAMP.sql.gz"
```

```bash
# Make backup script executable
sudo chmod +x /usr/local/bin/backup-mgnrega-db.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
# Add line: 0 2 * * * /usr/local/bin/backup-mgnrega-db.sh
```

---

## Step 15: Setup Firewall (Optional but Recommended)

```bash
# Install UFW firewall
apt install -y ufw

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check firewall status
sudo ufw status

# Note: Do NOT open port 3000 or 5432 to outside world
# They're only accessible from localhost
```

---

## Step 16: Continuous Updates & Maintenance

### Pull Latest Code Updates

```bash
cd /var/www/mgnrega-tracker

# Pull latest code
git pull origin main

# Rebuild if needed
npm run build

# Restart application
pm2 restart ecosystem.config.js
```

### Update System Packages

```bash
# Monthly security updates
apt update
apt upgrade -y

# Update Node.js (monthly)
# npm install -g npm@latest

# Update application dependencies
cd /var/www/mgnrega-tracker
npm update
```

---

## Troubleshooting

### Port 3000 Already in Use

```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Restart PM2
pm2 restart all
```

### Database Connection Error

```bash
# Test database connection
psql -U mgnrega_user -d mgnrega_tracker -h localhost -c "SELECT NOW();"

# Check PostgreSQL is running
systemctl status postgresql

# Check PostgreSQL logs
tail -f /var/log/postgresql/postgresql-*.log
```

### Nginx 502 Bad Gateway

```bash
# Check if backend is running
netstat -tlnp | grep 3000

# Check Nginx logs
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log

# Test Nginx config
sudo nginx -t
```

### SSL Certificate Issues

```bash
# Check certificate expiration
sudo certbot certificates

# Renew certificate manually
sudo certbot renew --dry-run

# Renew now
sudo certbot renew
```

### High Memory Usage

```bash
# Check what's using memory
ps aux --sort=-%mem | head

# Check PM2 memory usage
pm2 monit

# Increase PM2 max memory
pm2 start ecosystem.config.js --max-memory-restart 500M
```

---

## Important Security Checklist

- [ ] Change default database password
- [ ] Change Redis password (if set)
- [ ] Setup firewall rules
- [ ] Use strong SSH passwords or SSH keys
- [ ] Disable SSH root login (after setup)
- [ ] Enable SSL/HTTPS
- [ ] Setup regular backups
- [ ] Monitor logs for suspicious activity
- [ ] Keep system packages updated
- [ ] Use environment variables for secrets

---

## Performance Tuning Tips

### Database Optimization

```sql
-- Run VACUUM and ANALYZE periodically
VACUUM ANALYZE;

-- Check query performance
EXPLAIN ANALYZE SELECT * FROM monthly_stats WHERE district_id = 1;
```

### Redis Optimization

```bash
# Monitor Redis memory
redis-cli info memory

# Check slow queries
redis-cli --latency

# Persist data to disk
# Edit /etc/redis/redis.conf
# Uncomment: save 900 1
# Uncomment: appendonly yes
```

### Nginx Performance

```nginx
# Add to Nginx config for better performance
worker_processes auto;
worker_connections 2048;
keepalive_timeout 65;
client_max_body_size 50M;
```

---

## Monitoring & Alerting

### Setup Email Alerts

```bash
# Install mail utilities
apt install -y mailutils

# Test email
echo "Test" | mail -s "Test Email" your-email@example.com

# Add to PM2 error handler for alerts
# pm2 start app.js --error /var/log/pm2-error.log
```

### Monitor Disk Space

```bash
# Check disk usage
df -h

# Setup warning script
# Create /usr/local/bin/check-disk.sh
```

```bash
#!/bin/bash
USAGE=$(df / | grep / | awk '{print $5}' | sed 's/%//g')
if [ $USAGE -gt 80 ]; then
    echo "Disk usage is ${USAGE}%" | mail -s "ALERT: High disk usage" your-email@example.com
fi
```

---

## Rollback Plan

If something goes wrong:

```bash
# Check backup databases
ls -la /var/backups/mgnrega/

# Stop application
pm2 stop all

# Restore database from backup
gunzip < /var/backups/mgnrega/mgnrega_YYYYMMDD_HHMMSS.sql.gz | psql -U mgnrega_user mgnrega_tracker

# Restart application
pm2 start all
```

---

## Next Steps

1. **Domain Setup**: Point your domain to this VM's IP address
2. **SSL Certificates**: Setup Let's Encrypt (Step 11)
3. **ETL Configuration**: Configure data.gov.in API credentials
4. **Monitoring**: Setup monitoring dashboard
5. **Backups**: Verify backup system is working
6. **Load Testing**: Test with load to find bottlenecks

---

## Support & Resources

- **PM2 Docs**: https://pm2.keymetrics.io/docs
- **Nginx Docs**: https://nginx.org/en/docs/
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Let's Encrypt**: https://letsencrypt.org/docs/
- **Redis Docs**: https://redis.io/documentation

---

## Quick Deployment Checklist

- [ ] VM/VPS ready with Ubuntu 22.04 LTS
- [ ] SSH access verified
- [ ] System updated (apt update && apt upgrade)
- [ ] Node.js 18+ installed
- [ ] PostgreSQL installed and database created
- [ ] Redis installed
- [ ] Nginx installed
- [ ] PM2 installed globally
- [ ] Application cloned/copied to `/var/www/mgnrega-tracker`
- [ ] `.env` file configured with passwords
- [ ] Dependencies installed (`npm install`)
- [ ] Application built (`npm run build`)
- [ ] Database initialized (`npm run init-db`)
- [ ] Nginx configured and tested
- [ ] SSL certificate installed
- [ ] PM2 started application
- [ ] Application verified working in browser
- [ ] Backups setup
- [ ] Monitoring setup
- [ ] Firewall configured

---

**Estimated Deployment Time**: 30-45 minutes

**Support**: For issues, check logs with `pm2 logs` and review troubleshooting section.

Good luck! Your MGNREGA Performance Tracker is now live! 🚀