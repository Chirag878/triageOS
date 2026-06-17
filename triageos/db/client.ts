import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { validateDatabaseUrl } from "@/lib/db/errors";

import * as schema from "./schema";

const rawConnectionString = process.env.DATABASE_URL;
export const isDatabaseConfigured = Boolean(rawConnectionString);

// Next.js may import route modules at build time without runtime env vars.
// Use an unreachable placeholder for build-time module evaluation, then assert
// DATABASE_URL before any real query in auth/data helpers.
const connectionString = rawConnectionString
  ? validateDatabaseUrl(rawConnectionString)
  : "postgresql://postgres:postgres@127.0.0.1:65432/postgres";

const client = postgres(connectionString, {
  prepare: false,
  ssl:
    connectionString.includes("supabase.co") ||
    connectionString.includes("pooler.supabase.com")
      ? "require"
      : undefined,
});

export const db = drizzle(client, { schema });
