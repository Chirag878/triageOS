const SUPABASE_DB_HINT = `Check DATABASE_URL. For Supabase it should look like one of these:\n- Direct: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?sslmode=require\n- Pooler: postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require`;

export function validateDatabaseUrl(connectionString: string | undefined) {
  if (!connectionString) {
    throw new Error(`Missing DATABASE_URL. ${SUPABASE_DB_HINT}`);
  }

  let url: URL;

  try {
    url = new URL(connectionString);
  } catch {
    throw new Error(`Invalid DATABASE_URL format. ${SUPABASE_DB_HINT}`);
  }

  if (!url.protocol.startsWith("postgres")) {
    throw new Error(
      `DATABASE_URL must start with postgresql:// or postgres://. ${SUPABASE_DB_HINT}`,
    );
  }

  const host = url.hostname;
  const looksLikeIncompleteSupabaseHost =
    (host.startsWith("postgres.") || host.startsWith("db.")) &&
    !host.endsWith(".supabase.co") &&
    !host.endsWith(".pooler.supabase.com");

  if (looksLikeIncompleteSupabaseHost) {
    throw new Error(
      `DATABASE_URL host looks incomplete: "${host}". Supabase hosts must include the full domain, for example db.[PROJECT_REF].supabase.co. ${SUPABASE_DB_HINT}`,
    );
  }

  return connectionString;
}

export function explainDatabaseError(error: unknown) {
  if (!(error instanceof Error)) {
    return new Error(`Database operation failed. ${SUPABASE_DB_HINT}`);
  }

  const message = error.message;

  if (message.includes("ENOTFOUND") || message.includes("getaddrinfo")) {
    return new Error(
      `${message}\n\nThe database hostname cannot be resolved. Your DATABASE_URL is likely missing the full Supabase host domain. ${SUPABASE_DB_HINT}`,
      { cause: error },
    );
  }

  if (message.includes("password authentication failed")) {
    return new Error(
      `${message}\n\nThe database password in DATABASE_URL is incorrect. Use the database password from Supabase project settings.`,
      {
        cause: error,
      },
    );
  }

  if (message.includes("does not exist") && message.includes("profiles")) {
    return new Error(
      `${message}\n\nYour database migrations have not been applied yet. Run the initial schema migration before signing in.`,
      {
        cause: error,
      },
    );
  }

  return error;
}

export function assertDatabaseConfigured(isConfigured: boolean) {
  if (!isConfigured) {
    throw new Error(`Missing DATABASE_URL. ${SUPABASE_DB_HINT}`);
  }
}
