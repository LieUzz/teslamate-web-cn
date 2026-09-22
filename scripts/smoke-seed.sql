TRUNCATE charges, charging_processes, drives, positions, states, updates, addresses, geofences, cars, car_settings RESTART IDENTITY CASCADE;
-- 合成数据：全部是虚构坐标 (0.1x, 0.2x)，与任何真实车辆无关
INSERT INTO settings (id, inserted_at, updated_at, preferred_range) VALUES (1, now(), now(), 'rated') ON CONFLICT (id) DO UPDATE SET preferred_range='rated';
INSERT INTO car_settings (id, lfp_battery) VALUES (1, true);
INSERT INTO cars (id, eid, vid, vin, name, model, trim_badging, marketing_name, efficiency, settings_id, inserted_at, updated_at, display_priority)
  VALUES (1, 1, 1, 'TESTVIN0000000001', 'TestCar', 'Y', '50', 'SR', 0.150, 1, now(), now(), 1);
INSERT INTO geofences (id, name, latitude, longitude, radius, inserted_at, updated_at) VALUES (1, 'Home', 0.10, 0.20, 50, now(), now());
INSERT INTO addresses (id, name, road, city, display_name, inserted_at, updated_at) VALUES
  (1, NULL, 'A Road', 'X City', 'A Road, X City', now(), now()),
  (2, NULL, 'B Road', 'X City', 'B Road, X City', now(), now());

-- positions: id, date(UTC), lat, lng, car, drive_id, battery, rated range, odometer, elevation, speed, power, outside_temp
INSERT INTO positions (id, date, latitude, longitude, car_id, drive_id, battery_level, rated_battery_range_km, ideal_battery_range_km, odometer, elevation, speed, power, outside_temp, tpms_pressure_fl, tpms_pressure_fr, tpms_pressure_rl, tpms_pressure_rr) VALUES
  (1, '2026-08-31 23:30', 0.10, 0.20, 1, NULL, 75, 300, 310, 50000, 100, 0, 0, 25, 2.9, 2.9, 2.8, 2.8),
  (2, '2026-08-31 23:45', 0.11, 0.21, 1, NULL, 72, 285, 295, 50010, NULL, 60, 20, 25, NULL, NULL, NULL, NULL),
  (3, '2026-09-01 00:00', 0.12, 0.22, 1, NULL, 68, 270, 280, 50020, 120, 0, 0, 25, NULL, NULL, NULL, NULL),
  (4, '2026-09-01 00:05', 0.12, 0.22, 1, NULL, 68, 270, 280, 50020, 120, 0, 0, 25, NULL, NULL, NULL, NULL),
  (5, '2026-09-01 00:20', 0.10, 0.20, 1, NULL, 65, 258, 268, 50030, 100, 0, 0, 25, NULL, NULL, NULL, NULL),
  (6, '2026-09-01 10:20', 0.10, 0.20, 1, NULL, 64, 255, 265, 50030, 100, 0, 0, 5, NULL, NULL, NULL, NULL),
  (7, '2026-09-01 11:20', 0.12, 0.22, 1, NULL, 20, 190, 200, 50080, 400, 0, 0, 5, NULL, NULL, NULL, NULL),
  (8, '2026-09-01 12:00', 0.12, 0.22, 1, NULL, 20, 190, 200, 50080, NULL, 0, 0, 5, NULL, NULL, NULL, NULL),
  (9, '2026-09-01 18:00', 0.12, 0.22, 1, NULL, 80, 320, 330, 50080, NULL, 0, 0, 10, NULL, NULL, NULL, NULL),
  (10,'2026-09-01 18:20', 0.10, 0.20, 1, NULL, 75, 300, 310, 50095, NULL, 0, 0, 10, NULL, NULL, NULL, NULL),
  (11,'2026-09-02 02:00', 0.10, 0.20, 1, NULL, 74, 298, 308, 50095, NULL, NULL, 0, 12, 2.7, 2.7, 2.6, 2.6);
INSERT INTO drives (id, car_id, start_date, end_date, distance, duration_min, start_km, end_km, start_rated_range_km, end_rated_range_km, start_ideal_range_km, end_ideal_range_km,
                    start_position_id, end_position_id, start_geofence_id, end_geofence_id, start_address_id, end_address_id, outside_temp_avg, speed_max, power_max, power_min, ascent, descent) VALUES
  (1, 1, '2026-08-31 23:30', '2026-09-01 00:00', 20, 30, 50000, 50020, 300, 270, 310, 280, 1, 3, 1, NULL, 1, 2, 25, 80, 100, -30, 20, 0),
  (2, 1, '2026-09-01 00:05', '2026-09-01 00:20', 10, 15, 50020, 50030, 270, 258, 280, 268, 4, 5, NULL, 1, 2, 1, 25, 70, 90, -20, 0, 20),
  (3, 1, '2026-09-01 10:20', '2026-09-01 11:20', 50, 60, 50030, 50080, 255, 190, 265, 200, 6, 7, 1, NULL, 1, 2, 5, 120, 150, -60, 300, 0),
  (4, 1, '2026-09-01 18:00', '2026-09-01 18:20', 15, 20, 50080, 50095, 320, 300, 330, 310, 9, 10, NULL, 1, 2, 1, 10, 90, 110, -40, 0, 300);
UPDATE positions SET drive_id=1 WHERE id=1;
UPDATE positions SET drive_id=1 WHERE id=2;
UPDATE positions SET drive_id=1 WHERE id=3;
UPDATE positions SET drive_id=2 WHERE id=4;
UPDATE positions SET drive_id=2 WHERE id=5;
UPDATE positions SET drive_id=3 WHERE id=6;
UPDATE positions SET drive_id=3 WHERE id=7;
UPDATE positions SET drive_id=4 WHERE id=9;
UPDATE positions SET drive_id=4 WHERE id=10;
INSERT INTO charging_processes (id, car_id, position_id, address_id, start_date, end_date, duration_min, charge_energy_added, charge_energy_used, start_battery_level, end_battery_level,
                                start_rated_range_km, end_rated_range_km, start_ideal_range_km, end_ideal_range_km, cost) VALUES
  (1, 1, 8, 2, '2026-09-01 12:00', '2026-09-01 17:30', 330, 36, 40, 20, 80, 190, 320, 200, 330, NULL);
INSERT INTO charges (date, charging_process_id, battery_level, charge_energy_added, charger_power, charger_voltage, charger_actual_current, ideal_battery_range_km, rated_battery_range_km, fast_charger_present, outside_temp) VALUES
  ('2026-09-01 12:00', 1, 20, 0, 7, 220, 32, 200, 190, false, 6),
  ('2026-09-01 15:00', 1, 50, 18, 7, 220, 32, 265, 255, false, 7),
  ('2026-09-01 17:30', 1, 80, 36, 0, 220, 0, 330, 320, false, 8);
INSERT INTO states (car_id, state, start_date, end_date) VALUES
  (1, 'online', '2026-08-31 23:00', '2026-09-01 01:00'),
  (1, 'asleep', '2026-09-01 01:00', '2026-09-01 09:00'),
  (1, 'online', '2026-09-01 09:00', '2026-09-02 02:00'),
  (1, 'offline', '2026-09-02 02:00', now() AT TIME ZONE 'UTC' - interval '31 hours');
INSERT INTO updates (car_id, start_date, end_date, version) VALUES (1, '2026-08-01 00:00', '2026-08-01 00:30', '2026.1.1');

-- 近期停车样本 (相对当前时间，覆盖"本周 / 本月"页签)：三段停车的待机功率分别落在 偏高 / 正常 / 已休眠 三档
--   停车 A: 2 h 掉 6 km   → 0.9 kWh / 2 h   = 450 W
--   停车 B: 24.5 h 掉 27 km → 4.05 kWh / 24.5 h ≈ 165 W
--   当前停车: 1.5 h 掉 0.5 km → 0.075 kWh / 1.5 h = 50 W
INSERT INTO positions (id, date, latitude, longitude, car_id, drive_id, battery_level, rated_battery_range_km, ideal_battery_range_km, odometer, elevation, speed, power, outside_temp) VALUES
  (20, now() AT TIME ZONE 'UTC' - interval '30 hours',   0.13, 0.23, 1, NULL, 70, 280, 290, 50095, 100, 0, 0, 20),
  (21, now() AT TIME ZONE 'UTC' - interval '29.5 hours', 0.10, 0.20, 1, NULL, 68, 272, 282, 50105, 100, 0, 0, 20),
  (22, now() AT TIME ZONE 'UTC' - interval '27.5 hours', 0.10, 0.20, 1, NULL, 66, 266, 276, 50105, 100, 0, 0, 20),
  (23, now() AT TIME ZONE 'UTC' - interval '27 hours',   0.13, 0.23, 1, NULL, 65, 262, 272, 50112, 100, 0, 0, 20),
  (24, now() AT TIME ZONE 'UTC' - interval '2.5 hours',  0.13, 0.23, 1, NULL, 58, 235, 245, 50112, 100, 0, 0, 22),
  (25, now() AT TIME ZONE 'UTC' - interval '2 hours',    0.10, 0.20, 1, NULL, 57, 231, 241, 50120, 100, 0, 0, 22),
  (26, now() AT TIME ZONE 'UTC' - interval '30 minutes', 0.10, 0.20, 1, NULL, 57, 230.5, 240.5, 50120, 100, 0, 0, 22);
INSERT INTO drives (id, car_id, start_date, end_date, distance, duration_min, start_km, end_km, start_rated_range_km, end_rated_range_km, start_ideal_range_km, end_ideal_range_km,
                    start_position_id, end_position_id, start_geofence_id, end_geofence_id, start_address_id, end_address_id, outside_temp_avg, speed_max, power_max, power_min, ascent, descent) VALUES
  (5, 1, now() AT TIME ZONE 'UTC' - interval '30 hours',   now() AT TIME ZONE 'UTC' - interval '29.5 hours', 10, 30, 50095, 50105, 280, 272, 290, 282, 20, 21, NULL, 1, 2, 1, 20, 70, 90, -20, 10, 10),
  (6, 1, now() AT TIME ZONE 'UTC' - interval '27.5 hours', now() AT TIME ZONE 'UTC' - interval '27 hours',   7, 30, 50105, 50112, 266, 262, 276, 272, 22, 23, 1, NULL, 1, 2, 20, 60, 80, -20, 10, 10),
  (7, 1, now() AT TIME ZONE 'UTC' - interval '2.5 hours',  now() AT TIME ZONE 'UTC' - interval '2 hours',    8, 30, 50112, 50120, 235, 231, 245, 241, 24, 25, NULL, 1, 2, 1, 22, 65, 85, -25, 10, 10);
UPDATE positions SET drive_id=5 WHERE id IN (20, 21);
UPDATE positions SET drive_id=6 WHERE id IN (22, 23);
UPDATE positions SET drive_id=7 WHERE id IN (24, 25);
-- 状态：一段休眠横跨"本周"起点 (取决于运行日期)，在线时长里含 1.5 h 行驶
INSERT INTO states (car_id, state, start_date, end_date) VALUES
  (1, 'online', now() AT TIME ZONE 'UTC' - interval '31 hours', now() AT TIME ZONE 'UTC' - interval '26 hours'),
  (1, 'asleep', now() AT TIME ZONE 'UTC' - interval '26 hours', now() AT TIME ZONE 'UTC' - interval '3 hours'),
  (1, 'online', now() AT TIME ZONE 'UTC' - interval '3 hours', NULL);
