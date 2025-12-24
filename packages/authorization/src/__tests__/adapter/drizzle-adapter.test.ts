import type * as dbModule from "@workspace/db";
import { type Model, newModelFromString } from "casbin";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CasbinDrizzleAdapter } from "../../adapter/drizzle-adapter";

// Mock the database module
vi.mock("@workspace/db", async () => {
  const actual = await vi.importActual<typeof dbModule>("@workspace/db");
  return {
    ...actual,
    db: {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    },
  };
});

// Import after mocking
const { db } = await import("@workspace/db");

describe("Casbin Drizzle Adapter", () => {
  let adapter: CasbinDrizzleAdapter;
  let model: Model;

  beforeEach(() => {
    adapter = new CasbinDrizzleAdapter();

    // Create a basic RBAC model for testing
    const modelText = `
[request_definition]
r = sub, dom, obj, act

[policy_definition]
p = sub, dom, obj, act

[role_definition]
g = _, _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub, r.dom) && r.dom == p.dom && r.obj == p.obj && r.act == p.act
`;

    // Create model from string
    model = newModelFromString(modelText);

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe("loadPolicy", () => {
    it("should load policy rules from database", async () => {
      const mockRules = [
        {
          ptype: "p",
          v0: "admin",
          v1: "org1",
          v2: "posts",
          v3: "write",
          v4: null,
          v5: null,
        },
        {
          ptype: "p",
          v0: "editor",
          v1: "org1",
          v2: "posts",
          v3: "read",
          v4: null,
          v5: null,
        },
      ];

      vi.mocked(db.select().from).mockResolvedValue(mockRules);

      await adapter.loadPolicy(model);

      const pModel = model.model.get("p");
      const policies = pModel?.get("p")?.policy || [];

      expect(policies).toHaveLength(2);
      expect(policies[0]).toEqual(["admin", "org1", "posts", "write"]);
      expect(policies[1]).toEqual(["editor", "org1", "posts", "read"]);
    });

    it("should load role assignment rules from database", async () => {
      const mockRules = [
        {
          ptype: "g",
          v0: "user1",
          v1: "admin",
          v2: "org1",
          v3: null,
          v4: null,
          v5: null,
        },
        {
          ptype: "g",
          v0: "user2",
          v1: "editor",
          v2: "org1",
          v3: null,
          v4: null,
          v5: null,
        },
      ];

      vi.mocked(db.select().from).mockResolvedValue(mockRules);

      await adapter.loadPolicy(model);

      const gModel = model.model.get("g");
      const roles = gModel?.get("g")?.policy || [];

      expect(roles).toHaveLength(2);
      expect(roles[0]).toEqual(["user1", "admin", "org1"]);
      expect(roles[1]).toEqual(["user2", "editor", "org1"]);
    });

    it("should handle empty database", async () => {
      vi.mocked(db.select().from).mockResolvedValue([]);

      await adapter.loadPolicy(model);

      const pModel = model.model.get("p");
      const policies = pModel?.get("p")?.policy || [];

      expect(policies).toHaveLength(0);
    });
  });

  describe("savePolicy", () => {
    it("should only insert new policies (diff-based)", async () => {
      // Existing rules in database
      const existingRules = [
        {
          id: 1,
          ptype: "p",
          v0: "admin",
          v1: "org1",
          v2: "posts",
          v3: "write",
          v4: null,
          v5: null,
        },
      ];

      vi.mocked(db.select().from).mockResolvedValue(existingRules);

      // Add new policy to model
      const pModel = model.model.get("p");
      pModel?.get("p")?.policy.push(["admin", "org1", "posts", "write"]); // Existing
      pModel?.get("p")?.policy.push(["editor", "org1", "posts", "read"]); // New

      const insertMock = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.insert).mockReturnValue({ values: insertMock } as any);

      await adapter.savePolicy(model);

      // Should only insert the new policy
      expect(insertMock).toHaveBeenCalledTimes(1);
      expect(insertMock).toHaveBeenCalledWith([
        {
          ptype: "p",
          v0: "editor",
          v1: "org1",
          v2: "posts",
          v3: "read",
          v4: null,
          v5: null,
        },
      ]);
    });

    it("should only delete removed policies (diff-based)", async () => {
      // Existing rules in database
      const existingRules = [
        {
          id: 1,
          ptype: "p",
          v0: "admin",
          v1: "org1",
          v2: "posts",
          v3: "write",
          v4: null,
          v5: null,
        },
        {
          id: 2,
          ptype: "p",
          v0: "editor",
          v1: "org1",
          v2: "posts",
          v3: "read",
          v4: null,
          v5: null,
        },
      ];

      vi.mocked(db.select().from).mockResolvedValue(existingRules);

      // Model only has one policy (the other should be deleted)
      const pModel = model.model.get("p");
      pModel?.get("p")?.policy.push(["admin", "org1", "posts", "write"]);

      const whereMock = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.delete).mockReturnValue({ where: whereMock } as any);

      await adapter.savePolicy(model);

      // Should delete the removed policy
      expect(db.delete).toHaveBeenCalled();
      expect(whereMock).toHaveBeenCalled();
    });

    it("should handle no changes efficiently", async () => {
      // Existing rules match desired rules exactly
      const existingRules = [
        {
          id: 1,
          ptype: "p",
          v0: "admin",
          v1: "org1",
          v2: "posts",
          v3: "write",
          v4: null,
          v5: null,
        },
      ];

      vi.mocked(db.select().from).mockResolvedValue(existingRules);

      const pModel = model.model.get("p");
      pModel?.get("p")?.policy.push(["admin", "org1", "posts", "write"]);

      await adapter.savePolicy(model);

      // Should not call insert or delete
      expect(db.insert).not.toHaveBeenCalled();
      expect(db.delete).not.toHaveBeenCalled();
    });
  });

  describe("addPolicy", () => {
    it("should add a single policy rule", async () => {
      const insertMock = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.insert).mockReturnValue({ values: insertMock } as any);

      await adapter.addPolicy("p", "p", ["admin", "org1", "posts", "write"]);

      expect(insertMock).toHaveBeenCalledWith({
        ptype: "p",
        v0: "admin",
        v1: "org1",
        v2: "posts",
        v3: "write",
        v4: null,
        v5: null,
      });
    });

    it("should add a role assignment rule", async () => {
      const insertMock = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.insert).mockReturnValue({ values: insertMock } as any);

      await adapter.addPolicy("g", "g", ["user1", "admin", "org1"]);

      expect(insertMock).toHaveBeenCalledWith({
        ptype: "g",
        v0: "user1",
        v1: "admin",
        v2: "org1",
        v3: null,
        v4: null,
        v5: null,
      });
    });
  });

  describe("removePolicy", () => {
    it("should remove a single policy rule", async () => {
      const whereMock = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.delete).mockReturnValue({ where: whereMock } as any);

      await adapter.removePolicy("p", "p", ["admin", "org1", "posts", "write"]);

      expect(db.delete).toHaveBeenCalled();
      expect(whereMock).toHaveBeenCalled();
    });
  });

  describe("addPolicies", () => {
    it("should add multiple policies at once", async () => {
      const insertMock = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.insert).mockReturnValue({ values: insertMock } as any);

      const result = await adapter.addPolicies("p", "p", [
        ["admin", "org1", "posts", "write"],
        ["editor", "org1", "posts", "read"],
      ]);

      expect(result).toBe(true);
      expect(insertMock).toHaveBeenCalledWith([
        {
          ptype: "p",
          v0: "admin",
          v1: "org1",
          v2: "posts",
          v3: "write",
          v4: null,
          v5: null,
        },
        {
          ptype: "p",
          v0: "editor",
          v1: "org1",
          v2: "posts",
          v3: "read",
          v4: null,
          v5: null,
        },
      ]);
    });

    it("should handle empty array", async () => {
      const result = await adapter.addPolicies("p", "p", []);

      expect(result).toBe(true);
      expect(db.insert).not.toHaveBeenCalled();
    });
  });

  describe("removePolicies", () => {
    it("should remove multiple policies", async () => {
      const whereMock = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.delete).mockReturnValue({ where: whereMock } as any);

      const result = await adapter.removePolicies("p", "p", [
        ["admin", "org1", "posts", "write"],
        ["editor", "org1", "posts", "read"],
      ]);

      expect(result).toBe(true);
      expect(db.delete).toHaveBeenCalledTimes(2);
    });
  });

  describe("removeFilteredPolicy", () => {
    it("should remove policies matching filter", async () => {
      const whereMock = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.delete).mockReturnValue({ where: whereMock } as any);

      // Remove all policies for org1
      await adapter.removeFilteredPolicy("p", "p", 1, "org1");

      expect(db.delete).toHaveBeenCalled();
      expect(whereMock).toHaveBeenCalled();
    });

    it("should handle multiple filter values", async () => {
      const whereMock = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.delete).mockReturnValue({ where: whereMock } as any);

      // Remove all policies for org1 + posts resource
      await adapter.removeFilteredPolicy("p", "p", 1, "org1", "posts");

      expect(db.delete).toHaveBeenCalled();
      expect(whereMock).toHaveBeenCalled();
    });
  });
});
