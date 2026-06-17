import { createClient } from "@corsair-dev/app";

import { loadDotEnvLocal } from "./env-loader.mjs";

loadDotEnvLocal();

const apiKey = process.env.CORSAIR_DEV_KEY || process.env.CORSAIR_API_KEY;
const instanceName =
  process.env.CORSAIR_INSTANCE_NAME ||
  process.env.CORSAIR_INSTANCE_ID ||
  "triageos";

if (!apiKey) {
  throw new Error("Missing CORSAIR_DEV_KEY or CORSAIR_API_KEY.");
}

const corsair = createClient({ apiKey });
const { instances } = await corsair.instances.list();
let instance = instances.find((item) => item.name === instanceName);

if (!instance) {
  instance = await corsair.instances.create({ name: instanceName });
}

const detail = await corsair.instance(instance.id).get();

console.log("\nCopy this URL into Google Cloud → Authorized redirect URIs:\n");
console.log(detail.oauthCallbackUrl);
console.log("\nInstance details:");
console.log(`- id: ${detail.id}`);
console.log(`- name: ${detail.name}`);
