const { Pool } = require("pg");

let pool;

const connectPostgresDB = async () => {
    try {
        pool = new Pool(
            process.env.DATABASE_URL
                ? {
                    connectionString: process.env.DATABASE_URL,
                    ssl:
                        process.env.DB_SSL === "true"
                            ? { rejectUnauthorized: false }
                            : false,
                }
                : {
                    host: process.env.DB_HOST,
                    port: process.env.DB_PORT,
                    user: process.env.DB_USER,
                    password: process.env.DB_PASSWORD,
                    database: process.env.DB_NAME,
                }
        );

        // Test connection
        const client = await pool.connect();
        await client.query("SELECT 1");
        client.release();

        console.log("PostgreSQL connected");
    } catch (err) {
        console.error("PostgreSQL connection error:", err.message);
        process.exit(1);
    }
};

const getPool = () => {
    if (!pool) {
        throw new Error("Database not initialized. Call connectPostgresDB first.");
    }
    return pool;
};

module.exports = {
    connectPostgresDB,
    getPool,
};