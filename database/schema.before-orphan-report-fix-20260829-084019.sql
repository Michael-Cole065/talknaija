-- ============================================================
-- TALKNAIJA 1.0 — POSTGRESQL SCHEMA
-- Safe migration target. Does not modify legacy JSON data.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- USERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    uuid TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'guest',
    is_premium BOOLEAN NOT NULL DEFAULT FALSE,

    first_seen TIMESTAMPTZ,
    last_active TIMESTAMPTZ,

    connection_count INTEGER NOT NULL DEFAULT 0,
    visit_count INTEGER NOT NULL DEFAULT 0,
    report_count INTEGER NOT NULL DEFAULT 0,

    banned BOOLEAN NOT NULL DEFAULT FALSE,
    report_cycle_started_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- USER IP HISTORY
-- Already HMAC-hashed by the application.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_ip_history (
    id BIGSERIAL PRIMARY KEY,
    user_uuid TEXT NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
    ip_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_uuid, ip_hash)
);

-- ------------------------------------------------------------
-- USER AGENT HISTORY
-- Already HMAC-hashed by the application.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_agent_history (
    id BIGSERIAL PRIMARY KEY,
    user_uuid TEXT NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
    user_agent_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_uuid, user_agent_hash)
);

-- ------------------------------------------------------------
-- BAN HISTORY
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ban_history (
    id BIGSERIAL PRIMARY KEY,
    user_uuid TEXT NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- REPORTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,

    reporter_uuid TEXT NOT NULL REFERENCES users(uuid),
    reported_uuid TEXT NOT NULL REFERENCES users(uuid),

    status TEXT NOT NULL DEFAULT 'pending',
    blocked BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reports_reported
    ON reports(reported_uuid);

CREATE INDEX IF NOT EXISTS idx_reports_reporter
    ON reports(reporter_uuid);

CREATE INDEX IF NOT EXISTS idx_reports_created
    ON reports(created_at);

-- ------------------------------------------------------------
-- CALL HISTORY
-- Complete history is retained.
-- UI/service layer continues enforcing 5 / 15 viewing limits.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS call_history (
    id BIGSERIAL PRIMARY KEY,

    user_uuid TEXT NOT NULL REFERENCES users(uuid),
    partner_uuid TEXT NOT NULL REFERENCES users(uuid),

    timestamp TIMESTAMPTZ NOT NULL,

    callback_status TEXT NOT NULL DEFAULT 'available',
    decline_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_call_history_user
    ON call_history(user_uuid);

CREATE INDEX IF NOT EXISTS idx_call_history_partner
    ON call_history(partner_uuid);

CREATE INDEX IF NOT EXISTS idx_call_history_timestamp
    ON call_history(timestamp DESC);

-- ------------------------------------------------------------
-- ADMIN ACTIONS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_actions (
    id TEXT PRIMARY KEY,

    type TEXT NOT NULL,

    user_uuid TEXT REFERENCES users(uuid),
    report_id TEXT REFERENCES reports(id),

    reason TEXT,
    details TEXT,

    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_user
    ON admin_actions(user_uuid);

CREATE INDEX IF NOT EXISTS idx_admin_actions_created
    ON admin_actions(created_at DESC);

-- ------------------------------------------------------------
-- SUPPORT TICKETS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS support_tickets (
    id TEXT PRIMARY KEY,

    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'open',

    created_at TIMESTAMPTZ NOT NULL,
    last_replied_at TIMESTAMPTZ
);

-- ------------------------------------------------------------
-- SUPPORT REPLIES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS support_replies (
    id TEXT PRIMARY KEY,

    ticket_id TEXT NOT NULL
        REFERENCES support_tickets(id)
        ON DELETE CASCADE,

    message TEXT NOT NULL,
    sender TEXT NOT NULL DEFAULT 'admin',

    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_support_replies_ticket
    ON support_replies(ticket_id);

-- ------------------------------------------------------------
-- DONATIONS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS donations (
    id TEXT PRIMARY KEY,

    reference TEXT NOT NULL UNIQUE,

    email TEXT,

    amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'NGN',

    status TEXT NOT NULL,
    paid_at TIMESTAMPTZ,

    channel TEXT,

    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_donations_created
    ON donations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_donations_status
    ON donations(status);

-- ------------------------------------------------------------
-- TRAFFIC
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS traffic (
    id TEXT PRIMARY KEY,

    uuid TEXT REFERENCES users(uuid),

    type TEXT NOT NULL DEFAULT 'guest',
    is_premium BOOLEAN NOT NULL DEFAULT FALSE,

    timestamp TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_traffic_uuid
    ON traffic(uuid);

CREATE INDEX IF NOT EXISTS idx_traffic_timestamp
    ON traffic(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_traffic_type
    ON traffic(type);

-- ------------------------------------------------------------
-- MIGRATION METADATA
-- Useful for tracking future migrations.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS migration_metadata (
    id SERIAL PRIMARY KEY,
    migration_name TEXT NOT NULL UNIQUE,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
