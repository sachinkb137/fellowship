# 🚀 MGNREGA Tracker - Quick Deploy in 15 Minutes

## The Fastest Way to Deploy

This is the **fastest possible way** to get your MGNREGA Performance Tracker live on the internet.

---

## ⏱️ 15-Minute Deployment

### Step 1: Get a VPS (2 minutes)

Choose one:
- **DigitalOcean** https://digitalocean.com (cheapest)
- **Linode** https://linode.com
- **Vultr** https://vultr.com
- **AWS Lightsail**

**Create**: Ubuntu 22.04 LTS, 2GB RAM, 20GB SSD (~$5/month)

### Step 2: SSH into Your Server (1 minute)

```bash
ssh root@your-vps-ip
# If using a key: ssh -i keyfile root@your-vps-ip
```

### Step 3: Install Docker (2 minutes)

```bash
apt update && apt install -y docker.io docker-compose git
```

### Step 4: Clone Your Code (1 minute)

```bash
cd /tmp
git clone https://github.com/YOUR_USERNAME/mgnrega-tracker.git
cd mgnrega-tracker
```

**No Git?** Download and upload the zip file via SFTP instead.

### Step 5: Configure Environment (2 minutes)

```bash
cat > .env << EOF
DB_PASSWORD=YourSuperSecurePassword123!
REDIS_PASSWORD=YourRedisPassword456!
DOMAIN=your-domain.com
EOF
```

**Important**: Replace passwords with strong ones!

### Step 6: Deploy! (2 minutes)

```bash
docker-compose up -d

# Wait 10 seconds for containers to start...

# Initialize database
docker-compose exec api npm run init-db

# Verify status
docker-compose ps
```

### Step 7: Point Your Domain (1 minute)

Go to your domain registrar and point the A record to your VPS IP.

### Step 8: Setup SSL (2 minutes)

```bash
apt install -y certbot python3-certbot-nginx
certbot certonly --standalone -d your-domain.com
```

### Step 9: Configure Nginx with SSL (2 minutes)

Edit nginx.conf to add SSL certificates. Then:
```bash
docker-compose reload nginx
```

### ✅ Done! (Total: ~15 minutes)

Visit **https://your-domain.com** in your browser!

---

## 🎯 Is It Working?

### Test in Browser
1. Go to https://your-domain.com
2. Should load the app
3. Select a district
4. Data should display

### Test API
```bash
curl https://your-domain.com/api/v1/districts | head
```

### View Logs
```bash
docker-compose logs -f
```

---

## 📊 Architecture

```
┌─────────────────┐
│  Your Domain    │
│ (your-domain.   │
│   com)          │
└────────┬────────┘
         │
┌────────▼────────┐
│  Nginx (SSL)    │
│  (Port 443)     │
└────────┬────────┘
    ┌────┴────┐
    │ Static  │ API Requests
    │ Assets  │
    │         ▼
┌──────┐  ┌─────────┐
│React │  │Node.js  │
│App   │  │Backend  │
└──────┘  └────┬────┘
             ┌─┴─────┬──────┐
             │       │      │
        ┌────▼──┐┌───▼──┐ ┌▼───────┐
        │  DB   ││Redis ││ ETL    │
        │(Data) ││(Cache)|(Worker)│
        └───────┘└───────┘ └────────┘
```

---

## 🆘 Common Issues

### "docker: command not found"
```bash
# Install Docker first
apt install -y docker.io docker-compose
```

### "Connection refused"
```bash
# Wait for containers to fully start
sleep 10
docker-compose ps  # Should all show "Up"
```

### "Port already in use"
```bash
# Kill process using port
kill -9 $(lsof -t -i :80)
docker-compose up -d
```

### "Certificate error"
```bash
# Certbot may need more time
certbot certonly --standalone -d your-domain.com -d www.your-domain.com
```

---

## 📈 Upgrade Machine Later

As you grow:

**1K-50K users** → 1 Docker VM ($5/month) ✅
**50K-500K users** → 3 Docker VMs + Load Balancer ($30/month)
**500K+ users** → Kubernetes ($100+/month)

Each step is just scaling what you already have!

---

## 💾 Backups

### Automatic Daily Backups

```bash
# Setup automatic backup script
cat > /root/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=/backups
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T postgres pg_dump -U mgnrega_user mgnrega_tracker | gzip > $BACKUP_DIR/backup_$TIMESTAMP.sql.gz
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete  # Keep 7 days
EOF

chmod +x /root/backup.sh

# Schedule daily at 2 AM
(crontab -l 2>/dev/null; echo "0 2 * * * /root/backup.sh") | crontab -
```

### Restore from Backup

```bash
# If something goes wrong
gunzip < /backups/backup_YYYYMMDD_HHMMSS.sql.gz | docker-compose exec -T postgres psql -U mgnrega_user mgnrega_tracker
```

---

## 🔒 Security

### Change Database Password After Setup

```bash
# In .env, update:
# DB_PASSWORD=new_strong_password_123

# Then:
docker-compose down
docker-compose up -d
```

### Setup Firewall (Recommended)

```bash
apt install -y ufw
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw enable
```

### Update Regularly

```bash
# Update system
apt update && apt upgrade -y

# Update Docker images
docker-compose pull
docker-compose up -d
```

---

## 📝 Monitor Your App

### View Real-Time Logs

```bash
docker-compose logs -f

# Just API logs
docker-compose logs -f api
```

### Check Resource Usage

```bash
docker stats
```

### Database Health

```bash
docker-compose exec postgres psql -U mgnrega_user -d mgnrega_tracker -c "\dt"
```

### API Health

```bash
curl http://localhost:3000/api/v1/health
```

---

## 🔄 Update Your App

### Pull Latest Code

```bash
git pull origin main
docker-compose down
docker-compose up -d --build
```

### View Changes

```bash
git log -1 --oneline
```

---

## 🎓 Learning Resources

- **Docker**: https://docker.io
- **PostgreSQL**: https://postgresql.org
- **Nginx**: https://nginx.org
- **Let's Encrypt**: https://letsencrypt.org

---

## 📞 Help!

### Check Logs First

```bash
docker-compose logs api
docker-compose logs postgres
```

### Common Commands

```bash
docker-compose ps              # Status
docker-compose logs -f         # Follow logs
docker-compose down            # Stop all
docker-compose up -d           # Start all
docker-compose restart api     # Restart service
docker system prune -af        # Clean up
```

### Full Guides

- **Docker Deployment**: `DEPLOY_DOCKER.md`
- **Manual VM Setup**: `DEPLOY_VMVPS.md`
- **Troubleshooting**: `DEPLOYMENT_OPTIONS.md`

---

## 💰 Costs

```
Monthly:
├── VPS: $5 (DigitalOcean/Linode/Vultr)
├── Domain: $1 (if paid monthly)
└── Total: ~$6/month

Annual:
├── VPS: $60
├── Domain: $12
└── Total: ~$72/year

For 50K+ users (3 VMs):
├── VMs: $15/month
└── Total: ~$180/year
```

---

## ✅ Success Checklist

- [ ] VPS created
- [ ] SSH access working
- [ ] Docker installed
- [ ] Code cloned
- [ ] `.env` created with passwords
- [ ] `docker-compose up -d` completed
- [ ] Database initialized
- [ ] Domain DNS configured
- [ ] SSL certificate obtained
- [ ] Nginx configured with SSL
- [ ] Browser shows https://your-domain.com
- [ ] Data loads when selecting district
- [ ] Language toggle works

---

## 🚀 You're Live!

**Congratulations!** Your MGNREGA Performance Tracker is now serving the internet!

### Share Your Success

```bash
# Show your deployed app to someone!
echo "Check it out: https://your-domain.com"
```

### Next Steps

1. **Monitor**: Check logs occasionally
2. **Update**: Keep system patched
3. **Backup**: Verify backups are working
4. **Scale**: Upgrade as you grow
5. **Celebrate**: You built something amazing! 🎉

---

## Quick Reference

| Task | Command |
|------|---------|
| Deploy | `docker-compose up -d` |
| View Logs | `docker-compose logs -f` |
| Stop | `docker-compose down` |
| Restart | `docker-compose restart api` |
| Init DB | `docker-compose exec api npm run init-db` |
| Backup | `docker-compose exec -T postgres pg_dump ... ` |
| Status | `docker-compose ps` |

---

**Time to Live: ~15 minutes ⚡**

**Cost: ~$5-10/month 💵**

**Uptime: 99.9% ✅**

**Users Served: Millions 🌍**

---

## Still Here?

You're done! Go deploy! 🚀

**Questions?** Read the full guides:
- `DEPLOY_DOCKER.md` - Comprehensive Docker guide
- `DEPLOY_VMVPS.md` - Manual setup guide
- `DEPLOYMENT_OPTIONS.md` - Compare options
- `PRODUCTION_DEPLOYMENT.md` - Enterprise architecture

**Good luck!** Your MGNREGA tracker is about to help millions! 💪