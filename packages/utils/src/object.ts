/**
 * Object utilities
 */

/**
 * Strips null values from an object, converting them to undefined.
 * Useful for Zod schemas that use .optional() instead of .nullish().
 */
export function stripNulls<T extends Record<string, any>>(
  obj: T
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null) {
      result[key] = value;
    }
  }
  return result;
}
