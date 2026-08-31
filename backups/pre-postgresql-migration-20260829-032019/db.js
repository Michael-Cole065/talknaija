const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const connectionString =
    process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error(
        "DATABASE_URL is not configured."
    );
}

const caPath =
    process.env.PG_CA_PATH ||
    path.join(__dirname, "ca.pem");

const pool = new Pool({
    connectionString,

    ssl: {
        rejectUnauthorized: true,
        ca: fs.readFileSync(
            caPath,
            "utf8"
        )
    },

    max:
        Number(process.env.PG_POOL_MAX) || 10,

    idleTimeoutMillis:
        30000,

    connectionTimeoutMillis:
        10000
});

pool.on("error", (error) => {
    console.error(
        "❌ Unexpected PostgreSQL pool error:",
        error
    );
});

async function query(
    text,
    params
) {
    return pool.query(
        text,
        params
    );
}

module.exports = {
    pool,
    query
};
