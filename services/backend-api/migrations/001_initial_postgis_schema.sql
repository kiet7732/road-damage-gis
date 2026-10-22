-- =============================================================================
-- Migration 001: Initial PostGIS Production Schema
-- Road Damage GIS - Database Schema for PostgreSQL 16 + PostGIS 3.4
-- SRID: 4326 (WGS84 Lat/Lon Geographic Coordinates)
-- =============================================================================

-- 1. Kích hoạt PostGIS Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Bảng users: Quản lý người dùng và phân quyền (RBAC)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(32),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL,
    managed_district VARCHAR(128),
    managed_ward VARCHAR(128),
    auth_revoked_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- 3. Bảng reports: Quản lý báo cáo hư hỏng mặt đường chuẩn PostGIS
CREATE TABLE IF NOT EXISTS reports (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    image_path TEXT NOT NULL,
    geom geometry(Point, 4326) NOT NULL,
    gps_accuracy REAL,
    location_source VARCHAR(32),
    location_recorded_at TIMESTAMPTZ,
    note TEXT,
    ai_status VARCHAR(32) NOT NULL DEFAULT 'completed',
    status VARCHAR(32) NOT NULL DEFAULT 'new',
    ai_message TEXT,
    detections_json JSONB NOT NULL DEFAULT '{"detections": []}'::jsonb,
    admin_note TEXT,
    corrected_damage_type VARCHAR(16),
    is_ai_overridden BOOLEAN DEFAULT FALSE,
    road_name VARCHAR(255),
    ward VARCHAR(128),
    district VARCHAR(128),
    province VARCHAR(128),
    formatted_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_engineer_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    claimed_by_engineer_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    claimed_at TIMESTAMPTZ,
    claim_expires_at TIMESTAMPTZ,
    claim_status VARCHAR(32),
    claim_source VARCHAR(32),
    field_status VARCHAR(32),
    survey_started_at TIMESTAMPTZ,
    survey_completed_at TIMESTAMPTZ,
    field_verified_damage_type VARCHAR(16),
    field_severity VARCHAR(16),
    field_priority VARCHAR(16),
    field_note TEXT,
    field_checked_in_geom geometry(Point, 4326),
    field_checked_in_accuracy REAL,
    field_checked_in_distance_meters REAL,
    field_checked_in_at TIMESTAMPTZ
);

-- 4. Bảng geocoding_cache: Bộ nhớ đệm địa chỉ đảo ngược với Không gian
CREATE TABLE IF NOT EXISTS geocoding_cache (
    id VARCHAR(64) PRIMARY KEY,
    geom geometry(Point, 4326) NOT NULL,
    road_name VARCHAR(255),
    ward VARCHAR(128),
    district VARCHAR(128),
    province VARCHAR(128),
    formatted_address TEXT NOT NULL,
    hit_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Bảng refresh_tokens: Quản lý phiên xác thực JWT
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    replaced_by_token_id VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- 6. Bảng report_engineer_actions: Lịch sử tương tác khảo sát của kỹ sư
CREATE TABLE IF NOT EXISTS report_engineer_actions (
    id VARCHAR(64) PRIMARY KEY,
    report_id VARCHAR(64) NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    engineer_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(64) NOT NULL,
    action_payload_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_actions_report_created ON report_engineer_actions(report_id, created_at);

-- 7. Hệ thống Chỉ mục Tối ưu Hiệu năng (Spatial & GIN Indexes)
-- Chỉ mục không gian GiST trên toạ độ báo cáo hư hỏng
CREATE INDEX IF NOT EXISTS idx_reports_geom_gist ON reports USING GIST(geom);

-- Chỉ mục không gian GiST trên toạ độ check-in hiện trường của kỹ sư
CREATE INDEX IF NOT EXISTS idx_reports_field_checked_in_geom_gist ON reports USING GIST(field_checked_in_geom);

-- Chỉ mục không gian GiST cho geocoding cache
CREATE INDEX IF NOT EXISTS idx_geocoding_cache_geom_gist ON geocoding_cache USING GIST(geom);

-- Chỉ mục GIN trên trường kết quả nhận diện AI (JSONB)
CREATE INDEX IF NOT EXISTS idx_reports_detections_jsonb ON reports USING GIN(detections_json);

-- Chỉ mục B-Tree trên các trường lọc nghiệp vụ và phân cấp địa giới
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at_desc ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_district_ward ON reports(district, ward);
CREATE INDEX IF NOT EXISTS idx_reports_road_name ON reports(road_name);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_field_status ON reports(field_status);
CREATE INDEX IF NOT EXISTS idx_reports_assigned_engineer ON reports(assigned_engineer_id);
CREATE INDEX IF NOT EXISTS idx_reports_claimed_engineer ON reports(claimed_by_engineer_id);

-- 8. Cột phát sinh (Stored Generated Columns) hỗ trợ tương thích ngược
ALTER TABLE reports ADD COLUMN IF NOT EXISTS latitude REAL GENERATED ALWAYS AS (ST_Y(geom)) STORED;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS longitude REAL GENERATED ALWAYS AS (ST_X(geom)) STORED;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS field_checked_in_latitude REAL GENERATED ALWAYS AS (ST_Y(field_checked_in_geom)) STORED;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS field_checked_in_longitude REAL GENERATED ALWAYS AS (ST_X(field_checked_in_geom)) STORED;
ALTER TABLE geocoding_cache ADD COLUMN IF NOT EXISTS latitude REAL GENERATED ALWAYS AS (ST_Y(geom)) STORED;
ALTER TABLE geocoding_cache ADD COLUMN IF NOT EXISTS longitude REAL GENERATED ALWAYS AS (ST_X(geom)) STORED;

-- 9. Hàm json_extract tương thích với các biểu thức SQL dùng chung
CREATE OR REPLACE FUNCTION json_extract(doc jsonb, path_expr text)
RETURNS text AS '
BEGIN
    IF path_expr = ''$.detections[0].damage_type'' THEN
        RETURN doc->''detections''->0->>''damage_type'';
    ELSIF path_expr = ''$.detections[0].confidence'' THEN
        RETURN doc->''detections''->0->>''confidence'';
    ELSE
        RETURN NULL;
    END IF;
END;
' LANGUAGE plpgsql IMMUTABLE;
