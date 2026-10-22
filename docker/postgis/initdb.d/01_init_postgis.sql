-- Khởi tạo PostGIS Extension và các extension liên quan
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Log thông tin phiên bản kiểm chứng khi container bootstrap
DO $$
BEGIN
    RAISE NOTICE 'PostGIS Extension initialized successfully: %', PostGIS_Full_Version();
END $$;
