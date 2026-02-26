-- Initialize PostgreSQL database for Police Department Management System

-- Create database if it doesn't exist
SELECT 'Creating database if not exists' as status;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS public;

-- Create cache table (for Django caching)
CREATE TABLE IF NOT EXISTS django_cache (
    cache_key varchar(300) PRIMARY KEY,
    cache_value longtext,
    expires datetime NOT NULL
);

-- Log initialization
SELECT 'Database initialized successfully' as status;
