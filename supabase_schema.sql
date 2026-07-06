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

-- Enterprise: Organizations for multi-tenant isolation
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enterprise: Users with role-based access
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    organization_id TEXT REFERENCES organizations(id),
    role TEXT NOT NULL DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enterprise: Organization membership join table
CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    role TEXT NOT NULL DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enterprise: Audit logging for compliance tracking
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    action TEXT NOT NULL,
    resource TEXT,
    details TEXT,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
