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

type SdkModule = {
  createClient?: (options: { apiKey: string }) => {
    instance: (instanceId: string) => {
      tenant: (tenantId: string) => SdkTenant;
    };
  };
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
  private readonly instanceId: string;
  private readonly driver: CorsairDriver;

  constructor() {
    const env = requireCorsairEnv();
    this.baseUrl = normalizeBaseUrl(env.apiBaseUrl);
    this.apiKey = env.apiKey;
    this.instanceId = env.instanceId;
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
        this.tenantPath(input.tenantId, "connect-link"),
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
        this.tenantPath(input.tenantId, "run"),
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
      this.request<JsonRecord>("GET", this.tenantPath(tenantId, "status"))
    );
  }

  private tenantPath(tenantId: string, action: string) {
    return `/instances/${encodeURIComponent(this.instanceId)}/tenants/${encodeURIComponent(tenantId)}/${action}`;
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
      throw new CorsairError(
        getErrorMessage(payload) ??
          `Corsair REST request failed with status ${response.status}. If this is a 404, install @corsair-dev/app and set CORSAIR_DRIVER=sdk, or update lib/corsair/client.ts to match Corsair's current REST path.`,
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

    if (!sdk?.createClient) {
      if (this.driver === "sdk") {
        throw new CorsairError(
          `CORSAIR_DRIVER=sdk but @corsair-dev/app could not be loaded for Corsair ${operation}. Install @corsair-dev/app or set CORSAIR_DRIVER=rest.`,
        );
      }

      return null;
    }

    const corsair = sdk.createClient({ apiKey: this.apiKey });
    const tenant = corsair.instance(this.instanceId).tenant(tenantId);

    return callback(tenant);
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

function tryParseJson(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text };
  }
}

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;

  const record = payload as JsonRecord;
  const message = record.message ?? record.error ?? record.detail;

  return typeof message === "string" ? message : null;
}
