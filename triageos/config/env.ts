type ServerEnvKey =
  | "DATABASE_URL"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "CORSAIR_API_KEY"
  | "CORSAIR_DEV_KEY"
  | "CORSAIR_INSTANCE_ID"
  | "CORSAIR_INSTANCE_NAME"
  | "CORSAIR_API_BASE_URL"
  | "CORSAIR_CLIENT_SECRET"
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

export function getCorsairEnv() {
  return {
    apiKey: process.env.CORSAIR_DEV_KEY ?? process.env.CORSAIR_API_KEY ?? "",
    instanceId: process.env.CORSAIR_INSTANCE_ID ?? "",
    instanceName:
      process.env.CORSAIR_INSTANCE_NAME ??
      process.env.CORSAIR_INSTANCE_ID ??
      "triageos",
    apiBaseUrl: process.env.CORSAIR_API_BASE_URL ?? "https://api.corsair.dev",
    webhookSecret: process.env.CORSAIR_WEBHOOK_SECRET ?? "",
    driver: process.env.CORSAIR_DRIVER ?? "auto",
  };
}

export function requireCorsairEnv() {
  const env = getCorsairEnv();

  if (!env.apiKey) {
    throw new Error("Missing CORSAIR_DEV_KEY or CORSAIR_API_KEY.");
  }

  return env;
}

export function getServerEnv() {
  return {
    ...getPublicEnv(),
    databaseUrl: readEnv("DATABASE_URL"),
    supabaseServiceRoleKey: readEnv("SUPABASE_SERVICE_ROLE_KEY"),
    corsairApiKey: process.env.CORSAIR_DEV_KEY ?? readEnv("CORSAIR_API_KEY"),
    corsairInstanceId: process.env.CORSAIR_INSTANCE_ID ?? "",
    corsairInstanceName:
      process.env.CORSAIR_INSTANCE_NAME ??
      process.env.CORSAIR_INSTANCE_ID ??
      "triageos",
    corsairClientSecret: process.env.CORSAIR_CLIENT_SECRET ?? "",
    corsairWebhookSecret: process.env.CORSAIR_WEBHOOK_SECRET ?? "",
    openaiApiKey: readEnv("OPENAI_API_KEY"),
    adminEmails: getAdminEmails(),
  };
}
