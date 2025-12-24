export type MockOrganization = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  createdAt: Date;
  metadata: Record<string, unknown> | null;
};

let orgCounter = 0;

/**
 * Create a mock organization with realistic defaults
 *
 * @example
 * const org = createOrganization();
 * const acme = createOrganization({ name: "Acme Corp", slug: "acme" });
 */
export function createOrganization(
  overrides: Partial<MockOrganization> = {}
): MockOrganization {
  orgCounter += 1;
  const id = overrides.id ?? `org_${orgCounter}`;
  const name = overrides.name ?? `Test Org ${orgCounter}`;

  return {
    id,
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    logo: null,
    createdAt: new Date("2024-01-01"),
    metadata: null,
    ...overrides,
  };
}

/**
 * Reset the organization counter (call in beforeEach for predictable IDs)
 */
export function resetOrgCounter(): void {
  orgCounter = 0;
}
