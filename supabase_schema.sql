-- supabase_schema.sql
-- Exact PostgreSQL commands to create the reports and tranco_ranks tables for Supabase

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    screenshot_url TEXT,
    og_title TEXT,
    og_description TEXT,
    favicon TEXT,
    tech_stack JSONB,
    security JSONB,
    performance JSONB,
    hosting JSONB,
    domain JSONB,
    news JSONB,
    github JSONB,
    colors JSONB,
    carbon JSONB,
    traffic JSONB,
    dns_records JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL
);

-- Create tranco_ranks table
CREATE TABLE IF NOT EXISTS tranco_ranks (
    domain TEXT PRIMARY KEY,
    rank INTEGER,
    label TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
