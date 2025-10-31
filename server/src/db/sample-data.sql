-- Sample data for districts
-- Include centroid_lat and centroid_lon for nearby detection (approximate coordinates)
INSERT INTO districts (state_code, district_code, name_en, name_local, centroid_lat, centroid_lon) VALUES
('UP', '0101', 'Lucknow', 'लखनऊ', 26.8467, 80.9462),
('UP', '0102', 'Varanasi', 'वाराणसी', 25.3176, 82.9739),
('UP', '0103', 'Agra', 'आगरा', 27.1767, 78.0081),
('BH', '0201', 'Patna', 'पटना', 25.5941, 85.1376),
('BH', '0202', 'Gaya', 'गया', 24.7954, 85.0002),
('MP', '0301', 'Bhopal', 'भोपाल', 23.2599, 77.4126);

-- Sample monthly stats
INSERT INTO monthly_stats (district_id, year_month, workers_count, person_days, total_wages, pending_payments, jobs_created) VALUES
(1, '2025-10-01', 1200, 15000, 3000000, 100000, 150),
(1, '2025-09-01', 1100, 14000, 2800000, 120000, 140),
(2, '2025-10-01', 1500, 18000, 3600000, 90000, 180),
(2, '2025-09-01', 1400, 17000, 3400000, 95000, 170),
(3, '2025-10-01', 1300, 16000, 3200000, 110000, 160),
(3, '2025-09-01', 1250, 15500, 3100000, 115000, 155);

-- Sample aggregates
INSERT INTO aggregates (district_id, metric_name, time_window, value) VALUES
(1, 'avg_workers', '3m', 1150),
(1, 'avg_wages', '3m', 2900000),
(2, 'avg_workers', '3m', 1450),
(2, 'avg_wages', '3m', 3500000),
(3, 'avg_workers', '3m', 1275),
(3, 'avg_wages', '3m', 3150000);