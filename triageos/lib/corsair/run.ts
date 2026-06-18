type JsonRecord = Record<string, unknown>;

export function unwrapCorsairPayload(payload: unknown): JsonRecord {
  if (!payload || typeof payload !== "object") return {};

  const record = payload as JsonRecord;

  if (record.success === false) {
    const error = readString(record, "error") ?? "Corsair action failed.";
    throw new Error(error);
  }

  if (record.success === true && isJsonRecord(record.data)) {
    return record.data;
  }

  if (isJsonRecord(record.data)) return record.data;
  if (isJsonRecord(record.result)) return record.result;

  return record;
}

export function readString(record: JsonRecord, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : null;
}

export function isJsonRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
