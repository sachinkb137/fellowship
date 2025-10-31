-- ============================================================================
-- MGNREGA Tracker - PostgreSQL Schema Initialization
-- ============================================================================
-- This script initializes the PostgreSQL database with all required tables,
-- indexes, and configurations for production use.
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "earthdistance";
CREATE EXTENSION IF NOT EXISTS "cube";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ============================================================================
-- Districts Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS districts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(10) UNIQUE NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    name_hi VARCHAR(255) NOT NULL,
    state_code VARCHAR(5) NOT NULL,
    state_name_en VARCHAR(255) NOT NULL,
    state_name_hi VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    population BIGINT,
    area_sq_km DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for districts
CREATE INDEX IF NOT EXISTS idx_districts_code ON districts(code);
CREATE INDEX IF NOT EXISTS idx_districts_state ON districts(state_code);
CREATE INDEX IF NOT EXISTS idx_districts_location ON districts USING GIST (
    ll_to_earth(latitude, longitude)
);

-- ============================================================================
-- Performance Metrics Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    district_id UUID NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_workers BIGINT,
    completed_work_days BIGINT,
    average_wage DECIMAL(10, 2),
    completion_percentage DECIMAL(5, 2),
    wage_payment_percentage DECIMAL(5, 2),
    total_employment BIGINT,
    female_workers BIGINT,
    sc_workers BIGINT,
    st_workers BIGINT,
    other_workers BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(district_id, date)
);

-- Create indexes for performance metrics
CREATE INDEX IF NOT EXISTS idx_metrics_district ON performance_metrics(district_id);
CREATE INDEX IF NOT EXISTS idx_metrics_date ON performance_metrics(date);
CREATE INDEX IF NOT EXISTS idx_metrics_district_date ON performance_metrics(district_id, date DESC);

-- Create partitions for time-series data (by year)
CREATE TABLE IF NOT EXISTS performance_metrics_2024 PARTITION OF performance_metrics
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE IF NOT EXISTS performance_metrics_2025 PARTITION OF performance_metrics
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- ============================================================================
-- Historical Data Table (for tracking changes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS metric_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_id UUID NOT NULL REFERENCES performance_metrics(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by VARCHAR(255),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_metric_history_metric ON metric_history(metric_id);
CREATE INDEX IF NOT EXISTS idx_metric_history_date ON metric_history(changed_at);

-- ============================================================================
-- Cache Table (for frequently accessed data)
-- ============================================================================
CREATE TABLE IF NOT EXISTS cache_data (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB NOT NULL,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache_data(expires_at);

-- ============================================================================
-- API Usage Logs Table (for monitoring)
-- ============================================================================
CREATE TABLE IF NOT EXISTS api_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    ip_address INET,
    user_agent TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Partition API logs by month
CREATE TABLE IF NOT EXISTS api_logs_2025_01 PARTITION OF api_logs
    FOR VALUES FROM ('2025-01-01'::timestamp) TO ('2025-02-01'::timestamp);

CREATE INDEX IF NOT EXISTS idx_api_logs_date ON api_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_logs_ip ON api_logs(ip_address);

-- ============================================================================
-- Sessions Table (for tracking user sessions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_data JSONB,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ============================================================================
-- ETL Logs Table (for tracking data updates)
-- ============================================================================
CREATE TABLE IF NOT EXISTS etl_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    records_processed BIGINT,
    records_failed BIGINT,
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_etl_logs_job ON etl_logs(job_name);
CREATE INDEX IF NOT EXISTS idx_etl_logs_date ON etl_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_etl_logs_status ON etl_logs(status);

-- ============================================================================
-- Views for Common Queries
-- ============================================================================

-- Latest metrics by district
CREATE OR REPLACE VIEW latest_district_metrics AS
SELECT
    d.*,
    pm.date,
    pm.total_workers,
    pm.completed_work_days,
    pm.average_wage,
    pm.completion_percentage,
    pm.wage_payment_percentage,
    pm.total_employment,
    pm.female_workers,
    pm.sc_workers,
    pm.st_workers,
    pm.other_workers
FROM districts d
LEFT JOIN performance_metrics pm ON d.id = pm.district_id
WHERE pm.date = (
    SELECT MAX(date) FROM performance_metrics WHERE district_id = d.id
);

-- Monthly comparison view
CREATE OR REPLACE VIEW monthly_comparison AS
SELECT
    d.id,
    d.name_en,
    d.name_hi,
    DATE_TRUNC('month', pm.date) AS month,
    AVG(pm.total_workers) AS avg_workers,
    AVG(pm.completed_work_days) AS avg_work_days,
    AVG(pm.average_wage) AS avg_wage,
    AVG(pm.completion_percentage) AS avg_completion
FROM districts d
JOIN performance_metrics pm ON d.id = pm.district_id
GROUP BY d.id, d.name_en, d.name_hi, DATE_TRUNC('month', pm.date);

-- Performance trends view
CREATE OR REPLACE VIEW performance_trends AS
SELECT
    d.id,
    d.name_en,
    d.name_hi,
    COUNT(DISTINCT pm.date) AS data_points,
    MIN(pm.date) AS first_date,
    MAX(pm.date) AS last_date,
    AVG(pm.completion_percentage) AS avg_completion,
    AVG(pm.wage_payment_percentage) AS avg_wage_payment,
    (MAX(pm.completion_percentage) - MIN(pm.completion_percentage)) AS completion_trend
FROM districts d
JOIN performance_metrics pm ON d.id = pm.district_id
GROUP BY d.id, d.name_en, d.name_hi;

-- ============================================================================
-- Functions
-- ============================================================================

-- Function to calculate distance between coordinates
CREATE OR REPLACE FUNCTION get_nearby_districts(
    p_latitude DECIMAL,
    p_longitude DECIMAL,
    p_radius_km DECIMAL DEFAULT 50
)
RETURNS TABLE(
    id UUID,
    name_en VARCHAR,
    name_hi VARCHAR,
    latitude DECIMAL,
    longitude DECIMAL,
    distance_km DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.name_en,
        d.name_hi,
        d.latitude,
        d.longitude,
        ROUND(
            CAST(
                earth_distance(
                    ll_to_earth(p_latitude, p_longitude),
                    ll_to_earth(d.latitude, d.longitude)
                ) / 1000 AS NUMERIC
            ), 2
        )::DECIMAL
    FROM districts d
    WHERE earth_distance(
        ll_to_earth(p_latitude, p_longitude),
        ll_to_earth(d.latitude, d.longitude)
    ) / 1000 <= p_radius_km
    ORDER BY earth_distance(
        ll_to_earth(p_latitude, p_longitude),
        ll_to_earth(d.latitude, d.longitude)
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get district by proximity
CREATE OR REPLACE FUNCTION get_closest_district(
    p_latitude DECIMAL,
    p_longitude DECIMAL
)
RETURNS TABLE(
    id UUID,
    name_en VARCHAR,
    name_hi VARCHAR,
    distance_km DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.name_en,
        d.name_hi,
        ROUND(
            CAST(
                earth_distance(
                    ll_to_earth(p_latitude, p_longitude),
                    ll_to_earth(d.latitude, d.longitude)
                ) / 1000 AS NUMERIC
            ), 2
        )::DECIMAL
    FROM districts d
    ORDER BY earth_distance(
        ll_to_earth(p_latitude, p_longitude),
        ll_to_earth(d.latitude, d.longitude)
    )
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Maintenance Functions
-- ============================================================================

-- Function to clean up old API logs
CREATE OR REPLACE FUNCTION cleanup_old_api_logs(p_days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM api_logs
    WHERE created_at < NOW() - INTERVAL '1 day' * p_days_old;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM cache_data
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_districts_timestamp
BEFORE UPDATE ON districts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_metrics_timestamp
BEFORE UPDATE ON performance_metrics
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Permissions (for security)
-- ============================================================================

-- Create read-only role for API
CREATE ROLE mgnrega_readonly NOINHERIT;
GRANT CONNECT ON DATABASE mgnrega_tracker TO mgnrega_readonly;
GRANT USAGE ON SCHEMA public TO mgnrega_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO mgnrega_readonly;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO mgnrega_readonly;

-- ============================================================================
-- Statistics and Vacuum Configuration
-- ============================================================================

-- Autovacuum configuration for high-traffic tables
ALTER TABLE performance_metrics SET (
    autovacuum_vacuum_scale_factor = 0.01,
    autovacuum_analyze_scale_factor = 0.005
);

ALTER TABLE api_logs SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.025
);

-- ============================================================================
-- Sample Data (commented out - uncomment to populate with test data)
-- ============================================================================

/*
-- Insert sample districts
INSERT INTO districts (code, name_en, name_hi, state_code, state_name_en, state_name_hi, latitude, longitude, population)
VALUES
    ('DL01', 'North Delhi', 'उत्तरी दिल्ली', 'DL', 'Delhi', 'दिल्ली', 28.7041, 77.1025, 1000000),
    ('DL02', 'South Delhi', 'दक्षिणी दिल्ली', 'DL', 'Delhi', 'दिल्ली', 28.5355, 77.1970, 900000)
ON CONFLICT (code) DO NOTHING;

-- Insert sample metrics
INSERT INTO performance_metrics (district_id, date, total_workers, completed_work_days, average_wage, completion_percentage, wage_payment_percentage, total_employment)
SELECT id, CURRENT_DATE, 50000, 25000, 200.00, 85.5, 95.0, 25000
FROM districts LIMIT 1
ON CONFLICT (district_id, date) DO NOTHING;
*/

-- ============================================================================
-- Initialization Complete
-- ============================================================================
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mgnrega_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mgnrega_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO mgnrega_user;

-- Notify that schema is ready
SELECT 'MGNREGA Tracker schema initialized successfully' AS status;