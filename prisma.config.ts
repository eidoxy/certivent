import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "bun prisma/seed.ts",
  },
  datasource: {
    // CLI (migrate/diff/studio) uses the Supabase SESSION pooler (port 5432).
    url: env("DIRECT_URL"),
  },
});
