import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "./src/db/schema.ts",
    out: "./drizzle",
    dialect: "postgresql",
    dbCredentials: {
        host: process.env.PGHOST!,
        database: process.env.PGDATABASE!,
        user: process.env.PGUSER!,
        password: process.env.PGPASSWORD!,
        ssl: process.env.PGSSLMODE === "require" ? "require" : false,
    },
});
