const { Pool } = require("pg");

const connectionString =
    process.env.DATABASE_URL;

if (!connectionString) {
    console.warn(
        "⚠️ DATABASE_URL is not set. PostgreSQL persistence is disabled."
    );
}

const pool = connectionString
    ? new Pool({
        connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    })
    : null;

async function query(text, params = []) {

    if (!pool) {
        throw new Error(
            "DATABASE_URL is not configured."
        );
    }

    return pool.query(
        text,
        params
    );
}

async function testConnection() {

    if (!pool) {
        return false;
    }

    try {

        await pool.query(
            "SELECT 1"
        );

        console.log(
            "✅ PostgreSQL connection successful."
        );

        return true;

    } catch (error) {

        console.error(
            "❌ PostgreSQL connection failed:",
            error.message
        );

        return false;
    }
}

async function closeDatabase() {

    if (pool) {
        await pool.end();
    }

}

module.exports = {
    pool,
    query,
    testConnection,
    closeDatabase
};
