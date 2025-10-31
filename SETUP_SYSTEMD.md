# 🔧 Setup MGNREGA Tracker as Systemd Service

This guide shows how to setup MGNREGA Tracker to run as a systemd service on Linux, so it automatically starts on boot and can be managed with standard systemd commands.

---

## Prerequisites

- Ubuntu 22.04 LTS or similar Debian-based Linux
- Docker and Docker Compose installed
- Sudo access
- Project deployed at `/home/username/mgnrega`

---

## Installation Steps

### Step 1: Update Paths in Service Files

First, customize the service files with your actual username and paths:

```bash
cd /home/username/mgnrega

# Replace 'user' with your actual username
sed -i 's|User=user|User='"$USER"'|g' mgnrega.service
sed -i 's|WorkingDirectory=/home/user|WorkingDirectory=/home/'"$USER"'|g' mgnrega.service
sed -i 's|/home/user/mgnrega|/home/'"$USER"'/mgnrega|g' mgnrega.service

sed -i 's|User=user|User='"$USER"'|g' mgnrega-monitor.service
sed -i 's|WorkingDirectory=/home/user|WorkingDirectory=/home/'"$USER"'|g' mgnrega-monitor.service
sed -i 's|/home/user/mgnrega|/home/'"$USER"'/mgnrega|g' mgnrega-monitor.service
```

### Step 2: Install Service Files

Copy the service files to systemd directory:

```bash
# Copy main service
sudo cp mgnrega.service /etc/systemd/system/
sudo cp mgnrega-monitor.service /etc/systemd/system/

# Verify they're in place
ls -la /etc/systemd/system/mgnrega*.service
```

### Step 3: Reload Systemd

Tell systemd to reload the service definitions:

```bash
sudo systemctl daemon-reload
```

### Step 4: Enable Services

Enable services to start automatically on boot:

```bash
# Enable main service
sudo systemctl enable mgnrega.service

# Enable monitoring service
sudo systemctl enable mgnrega-monitor.service

# Verify they're enabled
sudo systemctl is-enabled mgnrega.service
sudo systemctl is-enabled mgnrega-monitor.service
```

### Step 5: Start Services

Start the services:

```bash
# Start main application
sudo systemctl start mgnrega.service

# Start monitoring
sudo systemctl start mgnrega-monitor.service

# Check status
sudo systemctl status mgnrega.service
sudo systemctl status mgnrega-monitor.service
```

### Step 6: Verify Running

Check that everything is running:

```bash
# Check service status
sudo systemctl status mgnrega.service

# Check logs
sudo journalctl -u mgnrega.service -n 50 --follow

# Check Docker containers
docker compose ps

# Test API
curl http://localhost:3000/api/v1/health
```

---

## Management Commands

Once installed, you can use standard systemd commands:

### View Service Status
```bash
sudo systemctl status mgnrega.service
sudo systemctl status mgnrega-monitor.service
```

### View Logs
```bash
# Last 50 lines
sudo journalctl -u mgnrega.service -n 50

# Follow logs in real-time
sudo journalctl -u mgnrega.service -f

# Show logs since last boot
sudo journalctl -u mgnrega.service -b

# Show logs with timestamps
sudo journalctl -u mgnrega.service --no-pager
```

### Start/Stop Services
```bash
# Start
sudo systemctl start mgnrega.service

# Stop
sudo systemctl stop mgnrega.service

# Restart
sudo systemctl restart mgnrega.service

# Reload configuration (without restart)
sudo systemctl reload mgnrega.service
```

### Enable/Disable Auto-Start
```bash
# Enable (start on boot)
sudo systemctl enable mgnrega.service

# Disable (don't start on boot)
sudo systemctl disable mgnrega.service

# Check if enabled
sudo systemctl is-enabled mgnrega.service
```

### View Service Details
```bash
# Show service file contents
sudo systemctl cat mgnrega.service

# Show service properties
sudo systemctl show mgnrega.service

# Show dependencies
sudo systemctl list-dependencies mgnrega.service
```

---

## Troubleshooting

### Service Failed to Start

Check the logs:

```bash
# View error logs
sudo journalctl -u mgnrega.service -n 100 --no-pager

# Check if Docker is running
docker ps

# Check if .env.production exists
cat /home/$USER/mgnrega/.env.production
```

### Docker Access Issues

If you get "docker: permission denied", add your user to docker group:

```bash
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker ps
```

### Service Not Starting on Boot

Verify it's enabled:

```bash
sudo systemctl is-enabled mgnrega.service

# Should output: enabled

# If not, enable it:
sudo systemctl enable mgnrega.service
```

### Containers Not Coming Up

Check logs:

```bash
sudo journalctl -u mgnrega.service -f

# Also check Docker directly
docker compose -f /home/$USER/mgnrega/docker-compose.yml logs -f
```

### Restart Loop

If the service keeps restarting, check:

```bash
# View logs
sudo journalctl -u mgnrega.service -n 100

# Check if containers are crashing
docker ps -a

# Check individual container logs
docker logs mgnrega_api
docker logs mgnrega_postgres
```

---

## Monitoring

### Monitor Service Health

The monitoring service will automatically:
- Check if services are running
- Restart failed services
- Send alerts (if configured)
- Log everything to systemd journal

View monitoring logs:

```bash
# View monitoring logs
sudo journalctl -u mgnrega-monitor.service -f

# Check monitor alert status
docker compose logs -f --grep "monitoring"
```

### Setup Email Alerts (Optional)

Export alert email before starting:

```bash
# Set email for alerts
export ALERT_EMAIL="admin@yourdomain.com"

# Update .env.production
echo "ALERT_EMAIL=admin@yourdomain.com" >> /home/$USER/mgnrega/.env.production

# Restart monitoring service
sudo systemctl restart mgnrega-monitor.service
```

---

## Automatic Updates & Backups

### Add Backup Cron Job

```bash
sudo crontab -e

# Add this line to run backups daily at 2 AM:
0 2 * * * /home/$USER/mgnrega/backup.sh >> /home/$USER/mgnrega/backups/backup.log 2>&1
```

### Add SSL Renewal Cron Job

```bash
sudo crontab -e

# Add this line to renew SSL certificates daily at 3 AM:
0 3 * * * /home/$USER/mgnrega/renew-ssl.sh >> /var/log/ssl-renewal.log 2>&1
```

### Add Log Cleanup Cron Job

```bash
sudo crontab -e

# Add this line to clean old logs weekly:
0 4 * * 0 docker compose -f /home/$USER/mgnrega/docker-compose.yml exec postgres psql -U mgnrega_user -d mgnrega_tracker -c "SELECT cleanup_old_api_logs(90);" >> /var/log/cleanup.log 2>&1
```

---

## Testing

### After Installation

Verify everything works:

```bash
# 1. Services running
sudo systemctl status mgnrega.service

# 2. Containers up
docker compose ps

# 3. API responding
curl http://localhost:3000/api/v1/health

# 4. Frontend loads
curl http://localhost/ | head -20

# 5. Monitor active
sudo systemctl status mgnrega-monitor.service
```

### Simulate Failure

Test that monitoring works:

```bash
# Stop a container
docker compose stop postgres

# Wait for monitoring to detect
# Check logs
sudo journalctl -u mgnrega-monitor.service -f

# Monitoring should attempt restart
# Check status
docker compose ps

# Stop should be complete
sudo journalctl -u mgnrega-monitor.service -n 20
```

---

## Restart After Server Reboot

Services will automatically start because they're enabled. Verify:

```bash
# Reboot server
sudo reboot

# After reboot, connect again and check:
sudo systemctl status mgnrega.service
docker ps
curl http://localhost:3000/api/v1/health
```

---

## Log Rotation

To prevent logs from consuming all disk space, setup log rotation:

```bash
sudo tee /etc/logrotate.d/mgnrega > /dev/null << 'EOF'
/var/log/mgnrega*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 root root
    sharedscripts
    postrotate
        systemctl reload rsyslog > /dev/null 2>&1 || true
    endscript
}
EOF

# Verify
sudo logrotate -d /etc/logrotate.d/mgnrega
```

---

## Useful One-Liners

```bash
# Quick status check
sudo systemctl status mgnrega.service && docker ps

# View everything
sudo journalctl -u mgnrega.service -f

# Restart everything
sudo systemctl restart mgnrega.service && sleep 5 && docker ps

# Stop everything
sudo systemctl stop mgnrega.service && docker compose down

# Clean logs
sudo journalctl --vacuum=500M

# Monitor in real-time
watch -n 1 'systemctl status mgnrega.service | head -20'

# Check resource usage
docker stats mgnrega_api mgnrega_postgres

# View all systemd logs
sudo journalctl --since=today -xe
```

---

## Remove Systemd Service

If you need to remove the systemd service:

```bash
# Stop the service
sudo systemctl stop mgnrega.service

# Disable it
sudo systemctl disable mgnrega.service

# Remove service files
sudo rm /etc/systemd/system/mgnrega.service
sudo rm /etc/systemd/system/mgnrega-monitor.service

# Reload systemd
sudo systemctl daemon-reload

# Verify removed
sudo systemctl list-units | grep mgnrega
```

---

## Next Steps

1. ✅ Services running as systemd services
2. ✅ Automatic restart on failure
3. ✅ Automatic start on boot
4. ✅ Logs in systemd journal
5. Next: Monitor performance and plan upgrades

---

**Last Updated**: January 2025  
**Status**: Ready for Production  
**Tested On**: Ubuntu 22.04 LTS with Docker 20.10+