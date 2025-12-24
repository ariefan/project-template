export type MockUser = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
};

let userCounter = 0;

/**
 * Create a mock user with realistic defaults
 *
 * @example
 * const user = createUser(); // All defaults
 * const admin = createUser({ name: "Admin", email: "admin@test.com" });
 */
export function createUser(overrides: Partial<MockUser> = {}): MockUser {
  userCounter++;
  const id = overrides.id ?? `user_${userCounter}`;

  return {
    id,
    email: `user${userCounter}@test.com`,
    name: `Test User ${userCounter}`,
    emailVerified: true,
    image: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

/**
 * Reset the user counter (call in beforeEach for predictable IDs)
 */
export function resetUserCounter(): void {
  userCounter = 0;
}
