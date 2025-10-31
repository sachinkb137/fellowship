# 🚀 Production Deployment Checklist

## Pre-Deployment Checklist

### Infrastructure Planning
- [ ] **Choose hosting provider**
  - [ ] DigitalOcean, Linode, Vultr, AWS, or Azure
  - [ ] Select appropriate tier (2GB RAM minimum, 2 vCPU)
  - [ ] Choose Ubuntu 22.04 LTS or similar Debian-based OS
  - [ ] Select region closest to target users (India recommended)

- [ ] **Domain setup**
  - [ ] Purchase domain name
  - [ ] Domain registrar ready
  - [ ] Can update DNS records

- [ ] **Security preparation**
  - [ ] Generate strong DB password (min 32 chars)
  - [ ] Generate strong Redis password (min 32 chars)
  - [ ] Prepare SSH keys for server access
  - [ ] Backup strategy planned

### Local Development
- [ ] **Code is production-ready**
  - [ ] All unit tests passing
  - [ ] TypeScript compilation successful (zero errors)
  - [ ] ESLint checks pass
  - [ ] Build runs without warnings

- [ ] **Build verification**
  - [ ] `npm run build` completes successfully
  - [ ] `client/dist/` is generated
  - [ ] `server/dist/` is generated
  - [ ] No missing dependencies

- [ ] **Environment variables**
  - [ ] `.env.production` created locally
  - [ ] All passwords set (32+ characters)
  - [ ] DOMAIN set correctly
  - [ ] All required fields filled

- [ ] **Documentation review**
  - [ ] Read `QUICKSTART_DEPLOY.md`
  - [ ] Read `DEPLOY_DOCKER.md`
  - [ ] Understand deployment steps
  - [ ] Know backup/restore procedures

---

## Server Setup Checklist

### Initial Server Access
- [ ] **SSH connection working**
  - [ ] Can SSH into server
  - [ ] No permission issues
  - [ ] Have root or sudo access

- [ ] **System updates**
  - [ ] Run `sudo apt update && sudo apt upgrade -y`
  - [ ] Reboot if kernel updated
  - [ ] System fully patched

### Docker Installation
- [ ] **Docker installed**
  ```bash
  # Should return version info
  docker --version
  docker compose version
  ```
  - [ ] Docker version 20.10+
  - [ ] Docker Compose version 2.0+
  - [ ] Docker daemon running and enabled

- [ ] **Docker permissions**
  - [ ] User can run docker without sudo (optional but recommended)
  - [ ] Docker socket has correct permissions

### Firewall Configuration
- [ ] **Open required ports**
  - [ ] Port 80 (HTTP) - open to all
  - [ ] Port 443 (HTTPS) - open to all
  - [ ] Port 22 (SSH) - open to your IP only (security!)
  - [ ] Port 3000 (API) - closed to internet (only through Nginx)
  - [ ] Port 5432 (Database) - closed to internet
  - [ ] Port 6379 (Redis) - closed to internet

- [ ] **UFW (if using)**
  ```bash
  sudo ufw default deny incoming
  sudo ufw default allow outgoing
  sudo ufw allow 22/tcp
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw enable
  ```

### Directory Structure
- [ ] **Project directory**
  - [ ] Created `/home/username/mgnrega` (or similar)
  - [ ] Owned by current user
  - [ ] Has sufficient disk space (10GB minimum)

- [ ] **Subdirectories**
  - [ ] `./backups` - for database backups
  - [ ] `./ssl` - for SSL certificates
  - [ ] `./logs` - for application logs

---

## Application Deployment Checklist

### Upload Application
- [ ] **Transfer files to server**
  ```bash
  scp -r fellowship/ user@server:/home/user/mgnrega/
  # Or use git clone if pushing to private repo
  ```
  - [ ] All files transferred
  - [ ] Permissions correct
  - [ ] Hidden files included

- [ ] **Verify transferred files**
  - [ ] `docker-compose.yml` exists
  - [ ] `server/` directory present
  - [ ] `client/` directory present
  - [ ] `deploy-docker.sh` executable

### Configuration
- [ ] **Environment setup**
  - [ ] Copy `.env.production` to server
  - [ ] Location: `/home/user/mgnrega/.env.production`
  - [ ] Permissions: `chmod 600 .env.production`
  - [ ] Only owner can read

- [ ] **Nginx configuration**
  - [ ] Update `nginx.conf` with domain name
  - [ ] Change `your-domain.com` to actual domain
  - [ ] Verify proxy settings

### Run Deployment Script
- [ ] **Make script executable**
  ```bash
  chmod +x deploy-docker.sh
  ```

- [ ] **Execute deployment**
  ```bash
  ./deploy-docker.sh
  ```
  - [ ] Script completes without errors
  - [ ] All containers start successfully
  - [ ] Database initialized
  - [ ] Backups configured
  - [ ] Monitoring ready

### Verify Services Running
- [ ] **Check containers**
  ```bash
  docker compose ps
  ```
  - [ ] `postgres` - UP
  - [ ] `redis` - UP
  - [ ] `api` - UP
  - [ ] `etl` - UP
  - [ ] `nginx` - UP

- [ ] **Check health endpoints**
  ```bash
  curl http://localhost:3000/api/v1/health
  curl http://localhost/
  ```
  - [ ] API responds with 200 OK
  - [ ] Frontend loads
  - [ ] No error messages

- [ ] **View logs**
  ```bash
  docker compose logs -f api
  docker compose logs -f postgres
  ```
  - [ ] No critical errors
  - [ ] Services initialized properly
  - [ ] Ready for traffic

---

## DNS & Domain Configuration Checklist

### Point Domain to Server
- [ ] **Get server IP address**
  ```bash
  curl ifconfig.me  # On the server
  ```
  - [ ] Public IP obtained
  - [ ] Note this IP

- [ ] **Update DNS records**
  - [ ] A record: `mgnrega.example.com` → `server-ip`
  - [ ] Or: `@` → `server-ip` (for root domain)
  - [ ] Wait for DNS propagation (5-30 minutes)
  - [ ] Verify with: `nslookup yourdomain.com`

- [ ] **Test domain access**
  ```bash
  curl http://yourdomain.com
  ```
  - [ ] Domain resolves to server
  - [ ] HTTP connection works
  - [ ] Frontend loads

---

## SSL/HTTPS Setup Checklist

### Let's Encrypt Certification
- [ ] **Install Certbot**
  ```bash
  sudo apt install certbot python3-certbot-nginx -y
  ```

- [ ] **Obtain certificate**
  ```bash
  sudo certbot certonly --standalone \
    -d yourdomain.com \
    --email admin@yourdomain.com \
    --non-interactive --agree-tos
  ```
  - [ ] Certificate issued successfully
  - [ ] Certificates stored in `/etc/letsencrypt/live/yourdomain.com/`

- [ ] **Copy certificates**
  ```bash
  sudo cp /etc/letsencrypt/live/yourdomain.com/*.pem ./ssl/
  sudo chown $USER ./ssl/*
  ```
  - [ ] Certificates copied to project
  - [ ] Permissions correct

### Nginx HTTPS Configuration
- [ ] **Update nginx.conf**
  - [ ] Uncomment SSL directives
  - [ ] Set certificate paths correctly
  - [ ] Set up HTTP → HTTPS redirect
  - [ ] Verify configuration: `docker compose exec nginx nginx -t`

- [ ] **Restart Nginx**
  ```bash
  docker compose restart nginx
  ```
  - [ ] Nginx restarts successfully
  - [ ] No errors in logs

### SSL Verification
- [ ] **Test HTTPS access**
  ```bash
  curl https://yourdomain.com
  ```
  - [ ] HTTPS works
  - [ ] No SSL errors
  - [ ] Redirects from HTTP work

- [ ] **Check SSL certificate**
  ```bash
  openssl s_client -connect yourdomain.com:443
  ```
  - [ ] Certificate valid
  - [ ] Expiration date shown
  - [ ] Trust chain complete

### Auto-Renewal
- [ ] **Setup auto-renewal**
  ```bash
  sudo crontab -e
  # Add: 0 3 * * * certbot renew --quiet
  ```
  - [ ] Cron job added
  - [ ] Test: `sudo certbot renew --dry-run`

---

## Database & Backups Checklist

### Initial Database State
- [ ] **Database initialized**
  ```bash
  docker compose exec api npm run init-db
  ```
  - [ ] Initialization completes
  - [ ] No errors in output
  - [ ] Schema created

- [ ] **Database verification**
  ```bash
  docker compose exec postgres psql -U mgnrega_user -d mgnrega_tracker -c "\dt"
  ```
  - [ ] Tables listed
  - [ ] Schema looks correct

### Backup System
- [ ] **Backup script working**
  ```bash
  chmod +x backup.sh
  ./backup.sh
  ```
  - [ ] Backup completes
  - [ ] Files created in `backups/`
  - [ ] Gzip files present

- [ ] **Test restore capability**
  ```bash
  # Note backup directory name
  ./restore.sh backups/backup_YYYYMMDD_HHMMSS
  ```
  - [ ] Restore completes successfully
  - [ ] Data intact after restore

- [ ] **Automated backups**
  ```bash
  crontab -e
  # Add backup job (e.g., daily at 2 AM)
  # 0 2 * * * /home/user/mgnrega/backup.sh
  ```
  - [ ] Cron entry created
  - [ ] Backup runs automatically

### Data Refresh (ETL)
- [ ] **ETL service running**
  ```bash
  docker compose logs etl
  ```
  - [ ] Service started
  - [ ] No errors
  - [ ] Scheduled correctly

---

## Monitoring & Alerts Checklist

### Health Monitoring
- [ ] **Monitoring script running**
  ```bash
  chmod +x monitor.sh
  nohup ./monitor.sh > monitor.log 2>&1 &
  ```
  - [ ] Script executes without errors
  - [ ] Outputs to log file
  - [ ] Runs in background

- [ ] **Monitor logs**
  ```bash
  tail -f monitor.log
  ```
  - [ ] Shows service status
  - [ ] No alerts immediately
  - [ ] Checks happen regularly

### Email Alerts (Optional)
- [ ] **Setup email alerts**
  ```bash
  export ALERT_EMAIL="admin@yourdomain.com"
  nohup ./monitor.sh > monitor.log 2>&1 &
  ```
  - [ ] Environment variable set
  - [ ] Test alert (optional)

---

## Performance & Optimization Checklist

### Caching
- [ ] **Redis working**
  ```bash
  docker compose exec redis redis-cli ping
  ```
  - [ ] Returns "PONG"
  - [ ] Connection working

- [ ] **Cache configured**
  - [ ] CACHE_TTL set in .env.production
  - [ ] API using Redis cache
  - [ ] Check with: `docker compose logs api | grep cache`

### Database Optimization
- [ ] **Indexes created**
  ```bash
  docker compose exec postgres psql -U mgnrega_user -d mgnrega_tracker \
    -c "SELECT * FROM pg_indexes WHERE tablename NOT LIKE 'pg_%';"
  ```
  - [ ] Multiple indexes listed
  - [ ] On performance_metrics table

- [ ] **Query optimization**
  - [ ] Slow queries logged
  - [ ] No N+1 queries
  - [ ] Response times < 100ms

### Asset Optimization
- [ ] **Gzip compression working**
  ```bash
  curl -I http://yourdomain.com | grep -i encoding
  ```
  - [ ] Returns: `content-encoding: gzip`

- [ ] **Browser caching**
  ```bash
  curl -I http://yourdomain.com/assets/ | grep -i cache
  ```
  - [ ] Long cache headers for assets

---

## Testing & Validation Checklist

### Functionality Testing
- [ ] **Frontend loads**
  - [ ] Home page loads
  - [ ] All components render
  - [ ] No console errors
  - [ ] Responsive on mobile

- [ ] **Language switching**
  - [ ] English works
  - [ ] Hindi works (if applicable)
  - [ ] Text displays correctly
  - [ ] No missing translations

- [ ] **Data display**
  - [ ] Districts load
  - [ ] Metrics display
  - [ ] Charts render
  - [ ] Comparisons work

- [ ] **User interactions**
  - [ ] Geolocation works (if enabled)
  - [ ] Voice control works (if enabled)
  - [ ] Read-aloud works (if enabled)
  - [ ] Filters functional

### API Testing
- [ ] **API endpoints working**
  ```bash
  curl http://yourdomain.com/api/v1/health
  curl http://yourdomain.com/api/v1/districts
  ```
  - [ ] All major endpoints respond
  - [ ] Return valid data
  - [ ] Proper error handling

- [ ] **Performance testing**
  - [ ] Response time < 100ms
  - [ ] No timeouts
  - [ ] Handles concurrent requests

### Security Testing
- [ ] **HTTPS enforced**
  - [ ] HTTP redirects to HTTPS
  - [ ] SSL certificate valid
  - [ ] No mixed content warnings

- [ ] **Security headers present**
  ```bash
  curl -I https://yourdomain.com | grep -i "X-"
  ```
  - [ ] X-Frame-Options set
  - [ ] X-Content-Type-Options set
  - [ ] CSP header present

- [ ] **Rate limiting working**
  - [ ] Excessive requests blocked
  - [ ] Returns 429 status
  - [ ] Limits reset correctly

### Offline Functionality (PWA)
- [ ] **Service Worker installed**
  - [ ] Check DevTools → Application → Service Workers
  - [ ] Status shows "activated and running"

- [ ] **Offline mode works**
  - [ ] Disconnect internet
  - [ ] App still loads from cache
  - [ ] Offline banner shows
  - [ ] Data available offline

---

## Post-Deployment Checklist

### Documentation
- [ ] **Update documentation**
  - [ ] Record actual domain used
  - [ ] Record server details
  - [ ] Update admin contact info
  - [ ] Save credentials securely

- [ ] **Team notifications**
  - [ ] Notify team of deployment
  - [ ] Share live URL
  - [ ] Document access procedures
  - [ ] Share troubleshooting info

### Monitoring & Maintenance
- [ ] **Setup ongoing monitoring**
  - [ ] Health checks running
  - [ ] Backups automated
  - [ ] SSL renewal automated
  - [ ] Logs being collected

- [ ] **Setup maintenance schedule**
  - [ ] Weekly: Check backups
  - [ ] Monthly: Review logs
  - [ ] Quarterly: Security audit
  - [ ] Annually: Update dependencies

### Performance Baseline
- [ ] **Record baseline metrics**
  - [ ] API response times
  - [ ] Database query times
  - [ ] Service availability
  - [ ] Resource usage

- [ ] **Setup performance monitoring**
  - [ ] Monitor CPU usage
  - [ ] Monitor memory usage
  - [ ] Monitor disk usage
  - [ ] Monitor network usage

---

## Troubleshooting Quick Reference

### Service Won't Start
```bash
# Check logs
docker compose logs api
docker compose ps
docker compose up -d api

# Check health
curl http://localhost:3000/api/v1/health
```

### Database Connection Issues
```bash
# Check container
docker compose ps postgres

# Test connection
docker compose exec postgres psql -U mgnrega_user -d mgnrega_tracker -c "SELECT 1"

# Check logs
docker compose logs postgres
```

### Redis Connection Issues
```bash
# Check container
docker compose ps redis

# Test connection
docker compose exec redis redis-cli ping

# Check logs
docker compose logs redis
```

### SSL Certificate Issues
```bash
# Check certificate
sudo openssl x509 -in /etc/letsencrypt/live/yourdomain.com/fullchain.pem -text

# Test SSL
openssl s_client -connect yourdomain.com:443

# Verify in Nginx
docker compose exec nginx nginx -T
```

---

## Success Criteria

✅ **Deployment successful when:**

1. All containers running and healthy
2. Domain accessible via HTTP and HTTPS
3. SSL certificate valid
4. API responds with correct data
5. Frontend loads without errors
6. Language switching works
7. Offline mode functional
8. Database initialized with data
9. Backups configured and working
10. Monitoring active
11. Response times acceptable
12. No critical errors in logs
13. Mobile interface responsive
14. All features functional

---

## Rollback Plan

If deployment fails, follow these steps:

```bash
# 1. Stop all services
docker compose down

# 2. Restore from backup
./restore.sh backups/backup_YYYYMMDD_HHMMSS

# 3. Restart services
docker compose up -d

# 4. Verify
docker compose ps
curl http://localhost:3000/api/v1/health
```

---

## Support & Issues

If you encounter issues:

1. **Check logs**: `docker compose logs -f <service>`
2. **Review documentation**: `DEPLOY_DOCKER.md`
3. **Check common issues**: See troubleshooting section above
4. **Backup important data** before making changes
5. **Test in development** before production changes

---

**Last Updated**: January 2025  
**Status**: Ready for Production Deployment  
**Estimated Deployment Time**: 30-45 minutes