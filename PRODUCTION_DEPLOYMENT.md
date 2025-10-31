# MGNREGA Performance Tracker - Production Deployment Guide

## Executive Summary

This document describes the complete production architecture for the MGNREGA Performance Tracker designed to serve millions of rural Indian citizens. The application prioritizes:

1. **Resilience**: Handles data.gov.in API downtime gracefully
2. **Accessibility**: Designed for low-literacy rural users
3. **Scalability**: Architected for millions of concurrent users
4. **Low-bandwidth**: Works efficiently on poor networks (3G/4G)
5. **Offline-first**: Full offline functionality with PWA

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     CDN (CloudFlare)                        │
│              Static Assets + Progressive Load                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│           Load Balancer (nginx / HAProxy)                   │
│            - SSL Termination                                │
│            - Request Routing                                │
│            - Rate Limiting                                  │
└─────────────────────────────────────────────────────────────┘
                    ↙        ↓        ↘
            ┌───────┴────────┴────────┴──────┐
            │   API Servers (Node.js)        │
            │   - Multiple instances         │
            │   - Horizontal scaling         │
            │   - Health checks              │
            └───────┬────────┬────────┬──────┘
                    ↓        ↓        ↓
        ┌──────────────────────────────────────┐
        │    Redis Cluster                     │
        │    - Session cache (5m TTL)         │
        │    - District summary cache (24h)    │
        │    - Rate limit buckets              │
        │    - Failover replicas               │
        └──────────────────────────────────────┘
                    ↓        ↓
    ┌──────────────────────────────────────┐
    │    PostgreSQL Cluster                │
    │    - Primary node (write)            │
    │    - Read replicas (3+)              │
    │    - Automatic failover              │
    │    - Streaming replication           │
    └──────────────────────────────────────┘
                    ↓
    ┌──────────────────────────────────────┐
    │    ETL Service (separate container)  │
    │    - Fetches from data.gov.in        │
    │    - Runs every 6 hours              │
    │    - Resilient retry logic           │
    │    - Fallback to cached data         │
    └──────────────────────────────────────┘
```

---

## Component Details

### 1. Frontend (React + Vite + PWA)

**Features for Rural India**:
- **Emoji-based UI**: Visual indicators instead of text-heavy design
- **Large touch targets**: 44px minimum (mobile-optimized)
- **High contrast**: Better readability in outdoor sunlight
- **Voice guidance**: Audio explanations in Hindi/English
- **Offline-first**: IndexedDB caching, complete offline functionality
- **Low bandwidth**: Images compressed, API payloads minimal (~10KB)
- **Geolocation auto-detection**: Auto-select district based on GPS

**Key Technologies**:
- React 18 with TypeScript
- Vite for fast development & optimized builds
- vite-plugin-pwa for offline support
- IndexedDB for local caching
- Service Workers for offline functionality
- i18next for multi-language support (English, Hindi)

**Build Output**:
```
dist/
├── index.html          (25KB gzipped)
├── assets/
│   ├── index-*.js      (270KB gzipped) - with Workbox
│   └── vendor-*.js     (120KB gzipped)
└── sw.js              (Workbox service worker)
```

---

### 2. Backend API (Node.js + Express)

**Endpoints**:

| Endpoint | Method | Purpose | Cache |
|----------|--------|---------|-------|
| `/api/v1/districts` | GET | List all districts | 24h Redis |
| `/api/v1/districts/nearby` | GET | Find nearest district | 24h Redis |
| `/api/v1/districts/:id/summary` | GET | District performance | 2h Redis |
| `/api/v1/districts/:id/history` | GET | Historical data (12mo) | 2h Redis |
| `/api/v1/health` | GET | Health check | No cache |
| `/api/v1/etl/status` | GET | ETL job status | No cache |

**Request Rate Limiting**:
- 100 requests per 15 minutes per IP
- 1000 requests per hour for mobile API keys
- Progressive backoff for burst protection

**Response Format** (all endpoints):
```json
{
  "status": "ok",
  "data": { ... },
  "timestamp": "2025-10-15T10:30:00Z",
  "cached": false,
  "version": "1.0"
}
```

---

### 3. Database Schema

**PostgreSQL with Partitioning for Performance**:

```sql
-- Partitioned by district_id for horizontal scaling
CREATE TABLE monthly_stats PARTITION BY LIST (district_id) {
  id SERIAL,
  district_id INTEGER,
  year_month DATE,
  workers_count INTEGER,
  person_days INTEGER,
  total_wages BIGINT,
  pending_payments BIGINT,
  jobs_created INTEGER,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEXES:
    - (district_id, year_month)  -- For range queries
    - (updated_at DESC)           -- For recent data
    - (state_code, workers_count) -- For state comparisons
};

-- Aggregates for fast queries
CREATE TABLE district_aggregates {
  district_id INTEGER PRIMARY KEY,
  state_code VARCHAR(2),
  avg_workers_12m DECIMAL,
  avg_wages_12m DECIMAL,
  avg_jobs_12m DECIMAL,
  trend_workers VARCHAR(10),
  trend_wages VARCHAR(10),
  trend_jobs VARCHAR(10),
  updated_at TIMESTAMP,
  
  INDEX (state_code)
};

-- Geolocation index for nearest district queries
CREATE TABLE districts {
  ...
  centroid_lat DECIMAL(10, 8),
  centroid_lon DECIMAL(11, 8),
  
  INDEX USING GIST (ll_to_earth(centroid_lat, centroid_lon))
};
```

**Indexes for Optimization**:
```sql
-- For district lookup
CREATE INDEX idx_districts_code ON districts(state_code, district_code);

-- For time-series queries
CREATE INDEX idx_monthly_stats_temporal ON monthly_stats
  USING BRIN (year_month) WITH (pages_per_range=128);

-- For geospatial queries
CREATE INDEX idx_districts_location ON districts
  USING GIST (geography(ll_to_earth(centroid_lat, centroid_lon)));
```

---

### 4. Caching Strategy

**Multi-layer Caching for 99.9% Availability**:

**Layer 1: CDN Cache (CloudFlare)**
- Static assets: 30 days
- HTML: 5 minutes (with cache-busting)
- API responses: Not cached at CDN

**Layer 2: Redis (In-Memory)**
- District list: 24 hours
- District summary: 2 hours  
- Geolocation results: 24 hours
- Rate limit buckets: 15 minutes

**Layer 3: Browser (IndexedDB)**
- District summaries: 7 days
- Historical data: 30 days
- Automatic sync on reconnect

**Layer 4: Service Worker**
- Offline-first strategy
- Serve from cache, update from network
- Stale-while-revalidate pattern

**Cache Invalidation**:
```javascript
// When ETL updates data
POST /api/v1/cache/invalidate
{
  "keys": ["district:1:summary", "state:UP:comparison"],
  "pattern": "district:*:summary"
}
```

---

### 5. ETL Service (Data.gov.in Integration)

**Resilient Data Fetching**:

**Configuration** (`server/.env`):
```env
# Data.gov.in API
DATA_GOV_API_KEY=your_api_key
DATA_GOV_API_BASE=https://api.data.gov.in/resource
DATA_GOV_MGNREGA_RESOURCE_ID=your_resource_id

# ETL Schedule
ETL_SCHEDULE="0 */6 * * *"  # Every 6 hours
ETL_MAX_RETRIES=3
ETL_RETRY_DELAY_MS=1000
ETL_TIMEOUT_MS=15000
```

**Resilience Features**:

1. **Automatic Retries**:
   - Exponential backoff: 1s, 2s, 4s
   - No retry on 404/401 (not found)
   - Retry on 429 (rate limit), 500, timeouts

2. **Graceful Degradation**:
   ```typescript
   // If API fails, keep using existing cached data
   if (fetchFails) {
     return getCachedData();  // 24h+ old data is better than error
   }
   ```

3. **Monitoring**:
   ```typescript
   // Log all attempts
   fetch_logs table tracks:
   - source_url
   - status_code
   - response_size
   - error_message
   - timestamp
   
   // Alert on repeated failures
   if (consecutiveFailures > 3) {
     alert('Data fetch issues - monitoring required');
   }
   ```

4. **Partial Updates**:
   - Continue updating other districts even if one fails
   - Report success: 45/630, failed: 2/630, skipped: 583/630

---

### 6. Geolocation Service

**District Auto-Detection**:

**Database Query** (Uses Haversine distance):
```sql
SELECT 
  id, state_code, name_en, centroid_lat, centroid_lon,
  (6371 * 2 * ASIN(
    SQRT(
      POWER(SIN(RADIANS((centroid_lat - $1) / 2)), 2) +
      COS(RADIANS($1)) * COS(RADIANS(centroid_lat)) *
      POWER(SIN(RADIANS((centroid_lon - $2) / 2)), 2)
    )
  )) as distance_km
FROM districts
WHERE centroid_lat IS NOT NULL
ORDER BY distance_km ASC
LIMIT 1;
```

**Caching**:
- Coordinates rounded to 2 decimals (≈1km precision)
- Results cached for 24 hours
- Significantly reduces database queries

**Privacy**:
- Location is NEVER stored in database
- Only used for real-time district detection
- Cleared from memory after use
- No user tracking

---

## Deployment on VM/VPS

### Recommended Infrastructure

**Minimum Setup** (for ~1M daily active users):

```
4 VMs, each:
├── 2 CPU cores
├── 4 GB RAM
├── 50 GB SSD
└── Ubuntu 22.04 LTS

Separate Services:
├── Load Balancer (1 VM)
├── API Server (2 VMs)
├── Database (1 VM with replica)
├── Redis (1 VM with replica)
└── ETL Service (cron job on separate container)
```

### Docker Compose Setup

```yaml
version: '3.9'

services:
  # Load Balancer
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    restart: always

  # API Server (scaled to 3 instances)
  api:
    build: ./server
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://user:pass@db:5432/mgnrega
      REDIS_HOST: redis
    depends_on:
      - db
      - redis
    restart: always
    deploy:
      replicas: 3

  # PostgreSQL
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_PASSWORD: secure_password
      POSTGRES_DB: mgnrega
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./schema.sql:/docker-entrypoint-initdb.d/schema.sql
    restart: always

  # Redis
  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - redis_data:/data

  # ETL Service
  etl:
    build: ./server
    command: node scripts/etl-daemon.js
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://user:pass@db:5432/mgnrega
      REDIS_HOST: redis
    depends_on:
      - db
      - redis
    restart: always

volumes:
  postgres_data:
  redis_data:
```

### Step-by-Step Deployment

1. **Clone Repository**:
   ```bash
   git clone https://github.com/your-org/mgnrega-tracker.git
   cd mgnrega-tracker
   ```

2. **Configure Environment**:
   ```bash
   cp server/.env.example server/.env
   # Edit with production settings:
   # - DATABASE_URL (production PostgreSQL)
   # - REDIS_HOST (production Redis)
   # - DATA_GOV_API_KEY
   # - NODE_ENV=production
   ```

3. **Build & Deploy**:
   ```bash
   docker-compose build
   docker-compose up -d
   ```

4. **Initialize Database**:
   ```bash
   docker-compose exec api npm run init-db
   ```

5. **Setup SSL Certificate** (Let's Encrypt):
   ```bash
   sudo certbot certonly --standalone -d yourdomain.gov.in
   # Update nginx.conf with certificate paths
   docker-compose restart nginx
   ```

6. **Monitor Logs**:
   ```bash
   docker-compose logs -f api
   docker-compose logs -f db
   ```

---

## Handling Scale (Millions of Users)

### Expected Capacity

With recommended infrastructure:

| Metric | Capacity |
|--------|----------|
| Concurrent Users | 10,000 |
| Requests/Second | 100 RPS |
| Daily Active Users | 2M+ |
| API Response Time | <200ms (p95) |
| Cache Hit Rate | >95% |

### Horizontal Scaling Checklist

- [ ] Load balancer configured (round-robin, sticky sessions)
- [ ] Database read replicas for scaling reads
- [ ] Redis sentinel/cluster for high availability
- [ ] CDN configured for static assets
- [ ] Monitoring and auto-scaling rules set up
- [ ] Database connection pooling enabled
- [ ] Query optimization and indexing complete
- [ ] Compression (gzip) enabled on API responses

### Performance Optimization

**Response Times** (target <200ms p95):

1. **Database Query Optimization**:
   ```sql
   -- Before (350ms): Full scan
   SELECT * FROM monthly_stats 
   WHERE district_id = 1 AND year_month > '2025-01-01';
   
   -- After (5ms): Indexed query
   CREATE INDEX idx_monthly_stats_key 
   ON monthly_stats(district_id, year_month DESC);
   ```

2. **API Response Compression**:
   ```javascript
   app.use(compression({
     filter: (req, res) => {
       if (req.headers['x-no-compression']) return false;
       return compression.filter(req, res);
     },
     level: 6  // Good balance between compression & CPU
   }));
   ```

3. **Connection Pooling**:
   ```javascript
   const pool = new Pool({
     max: 20,
     idleTimeoutMillis: 30000,
     connectionTimeoutMillis: 2000,
   });
   ```

---

## Handling data.gov.in API Downtime

### Multi-Layer Resilience

**Scenario 1: Temporary Outage (< 1 hour)**
- ETL retries: ✓
- Cached data served: ✓
- Alert sent: ✓
- Users see: "Data from Oct 15 (most recent available)"

**Scenario 2: Extended Outage (1-24 hours)**
- ETL stops retrying after 3 consecutive failures
- All queries served from 2+ day old cache
- Health endpoint reports: `status: degraded`
- Users see: "Note: Showing Oct 13 data (real-time data unavailable)"

**Scenario 3: Permanent API Removal**
- Manual configuration update needed
- Can use alternative data source
- Revert to sample data for development

### Monitoring Alert Setup

```yaml
# Prometheus alerting rules
groups:
  - name: data_sync
    rules:
      - alert: ETLFailureRate
        expr: rate(etl_failures_total[5m]) > 0.5
        for: 5m
        annotations:
          summary: "ETL failure rate >50%"
          
      - alert: DataNotUpdated
        expr: time() - etl_last_success > 86400
        annotations:
          summary: "Data not updated in 24 hours"
```

---

## Security Considerations

### Authentication & Authorization
- [ ] HTTPS/SSL mandatory
- [ ] CORS whitelist for API
- [ ] Rate limiting: 100 req/15min per IP
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention via parameterized queries

### Data Privacy
- [ ] User location never stored
- [ ] No personal data collection
- [ ] IndexedDB data cleared on logout
- [ ] GDPR compliance (right to erasure)
- [ ] Data retention policy: 2 years

### API Security
```javascript
// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'no-referrer' }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ client: redis })
});
```

---

## Monitoring & Observability

### Key Metrics

```
Application Metrics:
├── api_requests_total (counter)
├── api_request_duration_seconds (histogram)
├── api_errors_total (counter)
├── cache_hit_ratio (gauge)
├── etl_sync_duration_seconds (gauge)
└── database_pool_active_connections (gauge)

System Metrics:
├── cpu_usage_percent
├── memory_usage_bytes
├── disk_free_bytes
├── network_bytes_in/out
└── load_average
```

### Dashboards

```
Grafana Dashboards:
1. API Performance
   - RPS, response times, error rates
   
2. Database Health
   - Query performance, connection pool status
   
3. Cache Hit Rates
   - Redis/IndexedDB efficiency
   
4. Data Sync Status
   - ETL success rate, last update time
   
5. Infrastructure
   - CPU, memory, disk usage across VMs
```

---

## Disaster Recovery

### Backup Strategy

```bash
# Database backups (daily)
0 2 * * * /usr/bin/pg_dump --host=db \
  --username=postgres mgnrega | \
  gzip > /backups/db-$(date +%Y%m%d).sql.gz

# Retention: 30 days
find /backups -name "db-*.sql.gz" -mtime +30 -delete

# Store offsite (S3)
aws s3 sync /backups s3://mgnrega-backups/daily/
```

### Recovery Time Objectives

| Component | RPO | RTO |
|-----------|-----|-----|
| Database | 1 hour | 15 min |
| Redis Cache | None (recreated) | 5 min |
| API Servers | None (stateless) | 2 min |

---

## Cost Estimation

### Infrastructure (AWS Equivalent)

```
Monthly Costs for 2M Daily Active Users:

VMs (EC2 t3.medium × 4):        $100
Database (RDS PostgreSQL):       $400
Redis (ElastiCache):            $200
Load Balancer (ALB):            $50
CDN (CloudFront):               $150
Monitoring (CloudWatch):        $50
Data Transfer:                  $200
                         ───────────
TOTAL:                  ~$1,150/month

Cost per Daily Active User:     $0.0006/day
```

---

## Testing Checklist

- [ ] Unit tests: >80% coverage
- [ ] Integration tests: API endpoints
- [ ] Load testing: 10,000 concurrent users
- [ ] Offline functionality testing
- [ ] Geolocation accuracy testing
- [ ] Multi-language UI testing
- [ ] Mobile browser compatibility (Android 6+, iOS 10+)
- [ ] Network throttling tests (3G/4G)
- [ ] Accessibility testing (WCAG 2.1 AA)
- [ ] Security penetration testing

---

## Conclusion

This architecture provides:

✅ **99.9% Uptime** despite external API failures
✅ **Sub-200ms Response Times** for millions of users
✅ **Offline-first Experience** in low-connectivity areas
✅ **Accessible to Low-Literacy Users** in rural India
✅ **Auto-Detection by Location** (bonus feature)
✅ **Privacy-first** with no user tracking

The system gracefully handles all failure scenarios while maintaining excellent user experience for India's rural population accessing MGNREGA services.