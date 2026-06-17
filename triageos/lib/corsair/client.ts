import { requireCorsairEnv } from "@/config/env";

type JsonRecord = Record<string, unknown>;
type CorsairDriver = "auto" | "sdk" | "rest";

type SdkTenant = {
  connectLink?: {
    create: (input?: JsonRecord) => Promise<unknown>;
  };
  run?: (path: string, input?: JsonRecord) => Promise<unknown>;
  status?: () => Promise<unknown>;
};

type SdkInstanceSummary = {
  id: string;
  name: string;
};

type SdkClient = {
  instances?: {
    list: () => Promise<{ instances?: SdkInstanceSummary[] }>;
    create: (input: { name: string }) => Promise<{ id: string; name: string }>;
  };
  instance: (instanceId: string) => {
    tenant: (tenantId: string) => SdkTenant;
  };
};

type SdkCreateClient = (options: { apiKey: string }) => SdkClient;

type SdkModule = {
  createClient?: SdkCreateClient;
  Corsair?: new (options: { apiKey: string }) => ReturnType<SdkCreateClient>;
  default?:
    | SdkCreateClient
    | {
        createClient?: SdkCreateClient;
      }
    | (new (options: { apiKey: string }) => ReturnType<SdkCreateClient>);
};

export class CorsairError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "CorsairError";
  }
}

export type CorsairConnectLinkResponse = {
  url: string;
  expiresAt?: string;
};

export type CorsairRunResult<TData = unknown> =
  | { success: true; data: TData }
  | { success: false; error?: string; signInLink?: string; details?: unknown };

function normalizeBaseUrl(url: string) {
  return url.replace(/\/$/, "");
}

function readUrl(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;

  const record = payload as JsonRecord;
  const candidates = [
    record.url,
    record.signInLink,
    record.connectUrl,
    record.connect_link_url,
  ];
  const found = candidates.find((value) => typeof value === "string");

  return typeof found === "string" ? found : null;
}

export function getCorsairTenantId(userId: string) {
  // Keep tenant ids deterministic: one Supabase user maps to one Corsair tenant.
  // This avoids tenant creation race conditions and prevents duplicate Corsair users.
  return userId;
}

export class CorsairClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly configuredInstanceId: string;
  private readonly instanceName: string;
  private readonly driver: CorsairDriver;
  private resolvedInstanceIdPromise: Promise<string> | null = null;

  constructor() {
    const env = requireCorsairEnv();
    const instanceName = sanitizeInstanceName(env.instanceName);

    this.baseUrl = normalizeBaseUrl(env.apiBaseUrl);
    this.apiKey = env.apiKey;
    this.configuredInstanceId = shouldTreatInstanceIdAsName(
      env.instanceId,
      instanceName,
    )
      ? ""
      : env.instanceId;
    this.instanceName = instanceName;
    this.driver = parseDriver(env.driver);
  }

  async createConnectLink(input: {
    tenantId: string;
    plugins: readonly string[];
    returnUrl: string;
  }): Promise<CorsairConnectLinkResponse> {
    const sdkPayload = await this.trySdk(
      "connect-link",
      async (tenant) => {
        if (!tenant.connectLink?.create) {
          throw new CorsairError(
            "Installed Corsair SDK does not expose tenant.connectLink.create().",
          );
        }

        return tenant.connectLink.create({
          plugins: input.plugins,
          returnUrl: input.returnUrl,
        });
      },
      input.tenantId,
    );

    const payload =
      sdkPayload ??
      (await this.request<JsonRecord>(
        "POST",
        await this.tenantPath(input.tenantId, "connect-link"),
        {
          plugins: input.plugins,
          returnUrl: input.returnUrl,
        },
      ));

    const url = readUrl(payload);

    if (!url) {
      throw new CorsairError(
        "Corsair did not return a connect URL.",
        undefined,
        payload,
      );
    }

    return {
      url,
      expiresAt:
        typeof (payload as JsonRecord).expiresAt === "string"
          ? ((payload as JsonRecord).expiresAt as string)
          : undefined,
    };
  }

  async run<TData = unknown>(input: {
    tenantId: string;
    path: string;
    payload?: JsonRecord;
  }): Promise<CorsairRunResult<TData>> {
    const sdkPayload = await this.trySdk(
      "run",
      async (tenant) => {
        if (!tenant.run) {
          throw new CorsairError(
            "Installed Corsair SDK does not expose tenant.run().",
          );
        }

        return tenant.run(input.path, input.payload ?? {});
      },
      input.tenantId,
    );

    return (sdkPayload ??
      (await this.request<CorsairRunResult<TData>>(
        "POST",
        await this.tenantPath(input.tenantId, "run"),
        {
          path: input.path,
          input: input.payload ?? {},
        },
      ))) as CorsairRunResult<TData>;
  }

  async getTenantStatus(tenantId: string) {
    const sdkPayload = await this.trySdk(
      "status",
      async (tenant) => {
        if (!tenant.status) {
          throw new CorsairError(
            "Installed Corsair SDK does not expose tenant.status().",
          );
        }

        return tenant.status();
      },
      tenantId,
    );

    return (
      sdkPayload ??
      this.request<JsonRecord>("GET", await this.tenantPath(tenantId, "status"))
    );
  }

  private async tenantPath(tenantId: string, action: string) {
    const instanceId = await this.resolveInstanceId();

    return `/instances/${encodeURIComponent(instanceId)}/tenants/${encodeURIComponent(tenantId)}/${action}`;
  }

  private async request<TResponse>(
    method: "GET" | "POST",
    path: string,
    body?: JsonRecord,
  ): Promise<TResponse> {
    if (this.driver === "sdk") {
      throw new CorsairError(
        "CORSAIR_DRIVER=sdk but @corsair-dev/app is not installed or failed to load. Install the SDK or set CORSAIR_DRIVER=rest.",
      );
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

    const text = await response.text();
    const payload = text ? tryParseJson(text) : null;

    if (!response.ok) {
      const instanceId = await this.resolveInstanceId();

      throw new CorsairError(
        explainCorsairHttpError(response.status, payload, instanceId),
        response.status,
        payload,
      );
    }

    return payload as TResponse;
  }

  private async trySdk<TPayload>(
    operation: string,
    callback: (tenant: SdkTenant) => Promise<TPayload>,
    tenantId: string,
  ) {
    if (this.driver === "rest") return null;

    const sdk = await loadCorsairSdk();

    const createClient = sdk ? resolveSdkCreateClient(sdk) : null;

    if (!createClient) {
      if (this.driver === "sdk") {
        throw new CorsairError(
          `CORSAIR_DRIVER=sdk but @corsair-dev/app could not be loaded or did not expose a supported client factory for Corsair ${operation}. Export keys: ${sdk ? Object.keys(sdk).join(", ") || "none" : "package not found"}.`,
        );
      }

      return null;
    }

    try {
      const corsair = createClient({ apiKey: this.apiKey });
      const instanceId = await this.resolveInstanceId(corsair);
      const tenant = corsair.instance(instanceId).tenant(tenantId);

      return await callback(tenant);
    } catch (error) {
      if (this.driver === "auto" && isSdkShapeError(error)) {
        return null;
      }

      throw explainSdkError(
        error,
        operation,
        this.configuredInstanceId || this.instanceName,
      );
    }
  }

  private resolveInstanceId(sdkClient?: SdkClient) {
    if (this.configuredInstanceId) {
      return Promise.resolve(this.configuredInstanceId);
    }

    this.resolvedInstanceIdPromise ??= this.findOrCreateInstance(sdkClient);

    return this.resolvedInstanceIdPromise;
  }

  private async findOrCreateInstance(sdkClient?: SdkClient) {
    if (this.driver !== "rest") {
      const client = sdkClient ?? (await this.createSdkClient());

      if (client?.instances?.list && client.instances.create) {
        const { instances = [] } = await client.instances.list();
        const existing = instances.find(
          (instance) => instance.name === this.instanceName,
        );

        if (existing?.id) return existing.id;

        const created = await client.instances.create({
          name: this.instanceName,
        });

        if (created.id) return created.id;
      }

      if (this.driver === "sdk") {
        throw new CorsairError(
          "CORSAIR_INSTANCE_ID is empty and the installed Corsair SDK does not expose instances.list/create. Set CORSAIR_INSTANCE_ID manually or update @corsair-dev/app.",
        );
      }
    }

    const { instances = [] } = await this.rawRequest<{
      instances?: SdkInstanceSummary[];
    }>("GET", "/instances");
    const existing = instances.find(
      (instance) => instance.name === this.instanceName,
    );

    if (existing?.id) return existing.id;

    const created = await this.rawRequest<{ id?: string }>(
      "POST",
      "/instances",
      {
        name: this.instanceName,
      },
    );

    if (!created.id) {
      throw new CorsairError(
        "Corsair created/listed an instance but did not return an instance id.",
        undefined,
        created,
      );
    }

    return created.id;
  }

  private async createSdkClient() {
    const sdk = await loadCorsairSdk();
    const createClient = sdk ? resolveSdkCreateClient(sdk) : null;

    if (!createClient) return null;

    return createClient({ apiKey: this.apiKey });
  }

  private async rawRequest<TResponse>(
    method: "GET" | "POST",
    path: string,
    body?: JsonRecord,
  ) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

    const text = await response.text();
    const payload = text ? tryParseJson(text) : null;

    if (!response.ok) {
      throw new CorsairError(
        explainCorsairHttpError(
          response.status,
          payload,
          this.configuredInstanceId || this.instanceName,
        ),
        response.status,
        payload,
      );
    }

    return payload as TResponse;
  }
}

export function createCorsairClient() {
  return new CorsairClient();
}

function parseDriver(value: string): CorsairDriver {
  return value === "sdk" || value === "rest" || value === "auto"
    ? value
    : "auto";
}

function sanitizeInstanceName(value: string) {
  const sanitized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return sanitized || "triageos";
}

function shouldTreatInstanceIdAsName(value: string, instanceName: string) {
  if (!value) return false;
  if (looksLikeOpaqueInstanceId(value)) return false;

  return sanitizeInstanceName(value) === instanceName;
}

function looksLikeOpaqueInstanceId(value: string) {
  return (
    /^(inst|ins|instance)_[a-z0-9_-]+$/i.test(value) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

async function loadCorsairSdk(): Promise<SdkModule | null> {
  try {
    const dynamicImport = new Function(
      "specifier",
      "return import(specifier)",
    ) as (specifier: string) => Promise<SdkModule>;

    return await dynamicImport("@corsair-dev/app");
  } catch {
    return null;
  }
}

function resolveSdkCreateClient(sdk: SdkModule): SdkCreateClient | null {
  if (typeof sdk.createClient === "function") return sdk.createClient;

  if (
    sdk.default &&
    typeof sdk.default === "object" &&
    "createClient" in sdk.default
  ) {
    const maybeCreateClient = sdk.default.createClient;
    if (typeof maybeCreateClient === "function") return maybeCreateClient;
  }

  if (typeof sdk.default === "function") {
    return (options) => {
      try {
        return (sdk.default as SdkCreateClient)(options);
      } catch {
        const Constructor = sdk.default as new (constructorOptions: {
          apiKey: string;
        }) => ReturnType<SdkCreateClient>;
        return new Constructor(options);
      }
    };
  }

  if (typeof sdk.Corsair === "function") {
    return (options) => new sdk.Corsair!(options);
  }

  return null;
}

function isSdkShapeError(error: unknown) {
  return (
    error instanceof CorsairError && error.message.includes("does not expose")
  );
}

function explainSdkError(
  error: unknown,
  operation: string,
  instanceId: string,
) {
  if (error instanceof CorsairError) return error;

  if (error instanceof Error) {
    const lowerMessage = error.message.toLowerCase();

    if (
      lowerMessage.includes("instance") &&
      lowerMessage.includes("not found")
    ) {
      return new CorsairError(
        `${error.message}\n\nYour CORSAIR_INSTANCE_ID is currently "${instanceId}". Use the real instance ID from Corsair dashboard, not the display name. Also verify CORSAIR_DEV_KEY belongs to that same workspace.`,
        404,
        { operation },
      );
    }

    return new CorsairError(
      `${error.message}\n\nCorsair SDK operation failed while running ${operation}.`,
      undefined,
      { operation },
    );
  }

  return new CorsairError(
    `Corsair SDK operation failed while running ${operation}.`,
    undefined,
    { operation, error },
  );
}

function tryParseJson(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text };
  }
}

function explainCorsairHttpError(
  status: number,
  payload: unknown,
  instanceId: string,
) {
  const message = getErrorMessage(payload);
  const lowerMessage = message?.toLowerCase() ?? "";

  if (
    status === 404 &&
    lowerMessage.includes("instance") &&
    lowerMessage.includes("not found")
  ) {
    return `${message}

Your CORSAIR_INSTANCE_ID is currently "${instanceId}". This must be the real Corsair instance ID from the Corsair dashboard, not the display name/app name. Also make sure CORSAIR_DEV_KEY belongs to the same Corsair workspace that owns that instance.`;
  }

  if (status === 401 || status === 403) {
    return `${message ?? `Corsair request failed with status ${status}.`}

Check CORSAIR_DEV_KEY. It must be a valid developer key with access to CORSAIR_INSTANCE_ID.`;
  }

  if (status === 404) {
    return `${message ?? "Corsair REST endpoint was not found."}

If you installed @corsair-dev/app, set CORSAIR_DRIVER=sdk. If using REST, update lib/corsair/client.ts to match Corsair's current REST path.`;
  }

  return message ?? `Corsair request failed with status ${status}.`;
}

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;

  const record = payload as JsonRecord;
  const message = record.message ?? record.error ?? record.detail;

  return typeof message === "string" ? message : null;
}
