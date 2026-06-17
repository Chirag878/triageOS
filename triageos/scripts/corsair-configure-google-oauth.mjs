import { createClient } from "@corsair-dev/app";

function readRequiredEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing ${name}. Set it before running this script.`);
  }

  return value;
}

const apiKey = process.env.CORSAIR_DEV_KEY || process.env.CORSAIR_API_KEY;
const instanceName =
  process.env.CORSAIR_INSTANCE_NAME ||
  process.env.CORSAIR_INSTANCE_ID ||
  "triageos";
const googleClientId = readRequiredEnv("GOOGLE_OAUTH_CLIENT_ID");
const googleClientSecret = readRequiredEnv("GOOGLE_OAUTH_CLIENT_SECRET");

if (!apiKey) {
  throw new Error("Missing CORSAIR_DEV_KEY or CORSAIR_API_KEY.");
}

const corsair = createClient({ apiKey });
const { instances } = await corsair.instances.list();
let instance = instances.find((item) => item.name === instanceName);

if (!instance) {
  instance = await corsair.instances.create({ name: instanceName });
}

const inst = corsair.instance(instance.id);
const detail = await inst.get();
const redirectUrl = detail.oauthCallbackUrl;

for (const plugin of ["gmail", "googlecalendar"]) {
  await inst.plugins.upsert(plugin, { authType: "oauth_2" });
  await inst.plugins.credentials.setRoot(plugin, "client_id", googleClientId);
  await inst.plugins.credentials.setRoot(
    plugin,
    "client_secret",
    googleClientSecret,
  );
  await inst.plugins.credentials.setRoot(plugin, "redirect_url", redirectUrl);

  console.log(`Configured ${plugin}`);
}

console.log("\nGoogle OAuth credentials configured in Corsair.");
console.log("Redirect URL used:");
console.log(redirectUrl);
