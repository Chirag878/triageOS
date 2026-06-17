import { createClient } from "@corsair-dev/app";

import { getCorsairEnv } from "@/config/env";

export function createCorsairClient() {
  const env = getCorsairEnv();

  return createClient({
    apiKey: env.corsairDevKey,
  });
}

export function getCorsairInstance() {
  const env = getCorsairEnv();
  const corsair = createCorsairClient();

  return corsair.instance(env.corsairInstanceId);
}


