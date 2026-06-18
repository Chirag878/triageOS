import { updateCorsairConnectionStatus } from "@/lib/corsair/tenant";

type JsonRecord = Record<string, unknown>;

export type ResolvedCorsairStatus = {
  gmailConnected: boolean | null;
  calendarConnected: boolean | null;
  gmailConnectionId: string | null;
  calendarConnectionId: string | null;
};

const GMAIL_MARKERS = ["gmail", "googlemail"];
const CALENDAR_MARKERS = ["googlecalendar", "google_calendar", "calendar"];
const CONNECTED_MARKERS = [
  "connected",
  "enabled",
  "active",
  "authenticated",
  "authorized",
  "installed",
  "ready",
  "success",
];
const DISCONNECTED_MARKERS = [
  "disconnected",
  "disabled",
  "inactive",
  "unauthenticated",
  "unauthorized",
  "not_connected",
  "not connected",
  "missing",
  "failed",
  "error",
];

export function resolveCorsairStatus(
  remoteStatus: unknown,
): ResolvedCorsairStatus {
  const resolved: ResolvedCorsairStatus = {
    gmailConnected: null,
    calendarConnected: null,
    gmailConnectionId: null,
    calendarConnectionId: null,
  };

  visitStatusNodes(remoteStatus, (node) => {
    const searchable = flattenPrimitiveValues(node).join(" ").toLowerCase();
    const directPlugin = readString(node, "pluginId") ?? readString(node, "plugin");
    const directProvider =
      readString(node, "provider") ?? readString(node, "name");
    const pluginText = `${directPlugin ?? ""} ${directProvider ?? ""} ${searchable}`;
    const connectionId =
      readString(node, "connectionId") ??
      readString(node, "id") ??
      readString(node, "accountId");
    const connected = readConnectedState(node, searchable);

    if (matchesAny(pluginText, GMAIL_MARKERS)) {
      resolved.gmailConnectionId ??= connectionId;
      resolved.gmailConnected = mergeState(resolved.gmailConnected, connected);
    }

    if (matchesAny(pluginText, CALENDAR_MARKERS)) {
      resolved.calendarConnectionId ??= connectionId;
      resolved.calendarConnected = mergeState(
        resolved.calendarConnected,
        connected,
      );
    }
  });

  return resolved;
}

export async function reconcileCorsairStatus(input: {
  userId: string;
  remoteStatus: unknown;
}) {
  const resolved = resolveCorsairStatus(input.remoteStatus);

  console.info("[corsair.status] resolved remote connection status", {
    userId: input.userId,
    resolved,
    remoteStatus: input.remoteStatus,
  });

  if (
    resolved.gmailConnected === null &&
    resolved.calendarConnected === null &&
    !resolved.gmailConnectionId &&
    !resolved.calendarConnectionId
  ) {
    return { resolved, connection: null };
  }

  const connection = await updateCorsairConnectionStatus({
    userId: input.userId,
    gmailConnected: resolved.gmailConnected ?? undefined,
    calendarConnected: resolved.calendarConnected ?? undefined,
    gmailConnectionId: resolved.gmailConnectionId,
    calendarConnectionId: resolved.calendarConnectionId,
  });

  console.info("[corsair.status] updated corsair_connections", {
    userId: input.userId,
    gmailConnected: connection?.gmailConnected ?? null,
    calendarConnected: connection?.calendarConnected ?? null,
    gmailConnectionId: connection?.gmailConnectionId ?? null,
    calendarConnectionId: connection?.calendarConnectionId ?? null,
  });

  return { resolved, connection };
}

function visitStatusNodes(value: unknown, visit: (node: JsonRecord) => void) {
  if (Array.isArray(value)) {
    value.forEach((item) => visitStatusNodes(item, visit));
    return;
  }

  if (!isJsonRecord(value)) return;

  visit(value);

  for (const child of Object.values(value)) {
    if (Array.isArray(child) || isJsonRecord(child)) {
      visitStatusNodes(child, visit);
    }
  }
}

function readConnectedState(node: JsonRecord, searchable: string) {
  const booleanKeys = [
    "connected",
    "isConnected",
    "enabled",
    "active",
    "authenticated",
    "authorized",
  ];

  for (const key of booleanKeys) {
    const value = node[key];
    if (typeof value === "boolean") return value;
  }

  const statusText = [
    readString(node, "status"),
    readString(node, "state"),
    readString(node, "connectionStatus"),
    searchable,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (matchesAny(statusText, CONNECTED_MARKERS)) return true;
  if (matchesAny(statusText, DISCONNECTED_MARKERS)) return false;

  return null;
}

function mergeState(current: boolean | null, next: boolean | null) {
  if (next === true) return true;
  if (current === true) return true;
  if (next === false) return false;
  return current;
}

function flattenPrimitiveValues(value: unknown): string[] {
  if (typeof value === "string" || typeof value === "number") {
    return [String(value)];
  }

  if (typeof value === "boolean") {
    return [value ? "true" : "false"];
  }

  if (Array.isArray(value)) return value.flatMap(flattenPrimitiveValues);
  if (!isJsonRecord(value)) return [];

  return Object.values(value).flatMap(flattenPrimitiveValues);
}

function matchesAny(value: string, markers: string[]) {
  return markers.some((marker) => value.includes(marker));
}

function readString(record: JsonRecord, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
