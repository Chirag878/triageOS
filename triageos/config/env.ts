type ServerEnvKey =
  | "DATABASE_URL"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "CORSAIR_DEV_KEY"
  | "CORSAIR_INSTANCE_ID"
  | "OPENAI_API_KEY"
  | "CORSAIR_WEBHOOK_SECRET";

type ClientEnvKey =
  | "NEXT_PUBLIC_APP_URL"
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY";

function readEnv(key: ServerEnvKey | ClientEnvKey) {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

export function getPublicEnv() {
  return {
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    supabaseUrl: readEnv("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}

export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function getServerEnv() {
  return {
    ...getPublicEnv(),
    databaseUrl: readEnv("DATABASE_URL"),
    supabaseServiceRoleKey: readEnv("SUPABASE_SERVICE_ROLE_KEY"),
    corsairApiKey: readEnv("CORSAIR_DEV_KEY"),
    corsairClientSecret: readEnv("CORSAIR_INSTANCE_ID"),
    corsairWebhookSecret: readEnv("CORSAIR_WEBHOOK_SECRET"),
    openaiApiKey: readEnv("OPENAI_API_KEY"),
    adminEmails: getAdminEmails(),
  };
}


export function getCorsairEnv() {
  return {
    corsairDevKey: readEnv("CORSAIR_DEV_KEY"),
    corsairInstanceId: readEnv("CORSAIR_INSTANCE_ID"),
    corsairWebhookSecret: process.env.CORSAIR_WEBHOOK_SECRET,
  };
}