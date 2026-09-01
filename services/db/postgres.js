const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set.");
}

const databaseUrl = process.env.DATABASE_URL
    .replace(/[?&]sslmode=[^&]*/i, "")
    .replace(/[?&]$/, "");

const pool = new Pool({
    connectionString: databaseUrl,
    ssl: {
        rejectUnauthorized: false
    },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000
});

pool.on("error", (error) => {
    console.error("❌ PostgreSQL pool error:", error.message);
});

async function query(text, params) {
    return pool.query(text, params);
}

async function transaction(callback) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const result = await callback(client);

        await client.query("COMMIT");

        return result;
    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            console.error(
                "❌ PostgreSQL rollback error:",
                rollbackError.message
            );
        }

        throw error;
    } finally {
        client.release();
    }
}

async function close() {
    await pool.end();
}

module.exports = {
    pool,
    query,
    transaction,
    close
};
