import { Pool } from "pg";

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/it_support",
});
