/**
 * Flatten a nested config object to dotted-path key-value pairs.
 * Values are JSON-encoded strings.
 *
 * Example: { editor: { fontSize: 13 } } → { "editor.fontSize": "13" }
 */
export function flattenConfig(
  config: Record<string, unknown>,
  prefix = "",
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(config)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (
      value !== null &&
      value !== undefined &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      Object.assign(
        result,
        flattenConfig(value as Record<string, unknown>, fullKey),
      );
    } else {
      result[fullKey] = JSON.stringify(value);
    }
  }

  return result;
}

/**
 * Unflatten dotted-path key-value pairs back into a nested object.
 * Values are JSON-decoded.
 *
 * Example: { "editor.fontSize": "13" } → { editor: { fontSize: 13 } }
 */
export function unflattenConfig(
  flat: Record<string, string>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, jsonValue] of Object.entries(flat)) {
    const parts = key.split(".");
    let current = result;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current) || typeof current[parts[i]] !== "object") {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }

    try {
      current[parts[parts.length - 1]] = JSON.parse(jsonValue);
    } catch {
      current[parts[parts.length - 1]] = jsonValue;
    }
  }

  return result;
}
