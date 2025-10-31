CREATE TABLE districts (
    id SERIAL PRIMARY KEY,
    state_code VARCHAR(2) NOT NULL,
    district_code VARCHAR(4) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    name_local VARCHAR(100),
    centroid_lat DECIMAL(10, 8),
    centroid_lon DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(state_code, district_code)
);

CREATE TABLE monthly_stats (
    id SERIAL PRIMARY KEY,
    district_id INTEGER REFERENCES districts(id),
    year_month DATE NOT NULL,
    workers_count INTEGER,
    person_days INTEGER,
    total_wages BIGINT,
    pending_payments BIGINT,
    jobs_created INTEGER,
    raw_json_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(district_id, year_month)
);

CREATE TABLE aggregates (
    id SERIAL PRIMARY KEY,
    district_id INTEGER REFERENCES districts(id),
    metric_name VARCHAR(50) NOT NULL,
    time_window VARCHAR(10) NOT NULL,
    value DECIMAL(15, 2),
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(district_id, metric_name, time_window)
);

CREATE TABLE fetch_logs (
    id SERIAL PRIMARY KEY,
    source_url TEXT NOT NULL,
    status_code INTEGER,
    response_size INTEGER,
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    error_message TEXT
);

-- Indexes
CREATE INDEX idx_monthly_stats_district_date ON monthly_stats(district_id, year_month);
CREATE INDEX idx_aggregates_district_metric ON aggregates(district_id, metric_name);
CREATE INDEX idx_districts_codes ON districts(state_code, district_code);

-- Note: Auto-update of updated_at timestamp is handled at the application level
-- to ensure cross-platform compatibility