import { and, type Database, eq, inArray } from "@workspace/db";
import { casbinRules } from "@workspace/db/schema";
import type { Adapter, Model } from "casbin";

function loadPolicyLine(
  ptype: string,
  rule: {
    v0: string | null;
    v1: string | null;
    v2: string | null;
    v3: string | null;
    v4: string | null;
    v5: string | null;
    v6: string | null;
  },
  model: Model
): void {
  const values = [
    rule.v0,
    rule.v1,
    rule.v2,
    rule.v3,
    rule.v4,
    rule.v5,
    rule.v6,
  ].filter((v): v is string => v !== null && v !== undefined);

  if (ptype === "p") {
    const pModel = model.model.get("p");
    if (pModel?.has("p")) {
      pModel.get("p")?.policy.push(values);
    }
  } else if (ptype === "g") {
    const gModel = model.model.get("g");
    if (gModel?.has("g")) {
      gModel.get("g")?.policy.push(values);
    }
  }
}

export class CasbinDrizzleAdapter implements Adapter {
  readonly db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Load all policies from the database into the Casbin model
   */
  async loadPolicy(model: Model): Promise<void> {
    const rules = await this.db.select().from(casbinRules);

    for (const rule of rules) {
      loadPolicyLine(rule.ptype, rule, model);
    }
  }

  /**
   * Save all policies from the Casbin model to the database using diff-based approach
   * Only inserts new policies and deletes removed ones - unchanged policies are left untouched
   * This is called when policies are modified and autoSave is enabled
   */
  async savePolicy(model: Model): Promise<boolean> {
    // 1. Load existing policies from database
    const existingRules = await this.db.select().from(casbinRules);

    // 2. Extract desired policies from Casbin model
    const desiredRules: Array<{
      ptype: string;
      v0: string | null;
      v1: string | null;
      v2: string | null;
      v3: string | null;
      v4: string | null;
      v5: string | null;
      v6: string | null;
    }> = [];

    // Extract policy rules (p)
    const pModel = model.model.get("p");
    if (pModel) {
      const pTokens = pModel.get("p");
      if (pTokens) {
        for (const rule of pTokens.policy) {
          desiredRules.push({
            ptype: "p",
            ...this.ruleToObject(rule),
          });
        }
      }
    }

    // Extract role assignment rules (g)
    const gModel = model.model.get("g");
    if (gModel) {
      const gTokens = gModel.get("g");
      if (gTokens) {
        for (const rule of gTokens.policy) {
          desiredRules.push({
            ptype: "g",
            ...this.ruleToObject(rule),
          });
        }
      }
    }

    // 3. Compute diff: what to add, what to delete
    const { toAdd, toDelete } = this.computeDiff(existingRules, desiredRules);

    // 4. Execute only necessary changes
    if (toDelete.length > 0) {
      // Delete by IDs for efficiency
      const deleteIds = toDelete.map((r) => r.id);
      await this.db
        .delete(casbinRules)
        .where(inArray(casbinRules.id, deleteIds));
    }

    if (toAdd.length > 0) {
      await this.db.insert(casbinRules).values(toAdd);
    }

    return true;
  }

  /**
   * Compute difference between existing and desired policies
   * @returns Object with toAdd (new policies) and toDelete (removed policies)
   */
  private computeDiff(
    existing: (typeof casbinRules.$inferSelect)[],
    desired: Array<{
      ptype: string;
      v0: string | null;
      v1: string | null;
      v2: string | null;
      v3: string | null;
      v4: string | null;
      v5: string | null;
      v6: string | null;
    }>
  ): {
    toAdd: typeof desired;
    toDelete: typeof existing;
  } {
    // Convert to comparable format using rule key
    const existingSet = new Set(existing.map((r) => this.ruleToKey(r)));
    const desiredSet = new Set(desired.map((r) => this.ruleToKey(r)));

    // Find rules to add (in desired but not in existing)
    const toAdd = desired.filter((r) => !existingSet.has(this.ruleToKey(r)));

    // Find rules to delete (in existing but not in desired)
    const toDelete = existing.filter((r) => !desiredSet.has(this.ruleToKey(r)));

    return { toAdd, toDelete };
  }

  /**
   * Convert rule to a comparable key string
   * Used for diff computation
   */
  private ruleToKey(
    rule:
      | typeof casbinRules.$inferSelect
      | {
          ptype: string;
          v0: string | null;
          v1: string | null;
          v2: string | null;
          v3: string | null;
          v4: string | null;
          v5: string | null;
          v6: string | null;
        }
  ): string {
    return `${rule.ptype}|${rule.v0 ?? ""}|${rule.v1 ?? ""}|${rule.v2 ?? ""}|${rule.v3 ?? ""}|${rule.v4 ?? ""}|${rule.v5 ?? ""}|${rule.v6 ?? ""}`;
  }

  /**
   * Add a single policy to the database
   */
  async addPolicy(_sec: string, ptype: string, rule: string[]): Promise<void> {
    await this.db.insert(casbinRules).values({
      ptype,
      ...this.ruleToObject(rule),
    });
  }

  /**
   * Remove a single policy from the database
   */
  async removePolicy(
    _sec: string,
    ptype: string,
    rule: string[]
  ): Promise<void> {
    const conditions = this.buildWhereConditions(ptype, rule);
    await this.db.delete(casbinRules).where(and(...conditions));
  }

  /**
   * Add multiple policies to the database
   */
  async addPolicies(
    _sec: string,
    ptype: string,
    rules: string[][]
  ): Promise<boolean> {
    const values = rules.map((rule) => ({
      ptype,
      ...this.ruleToObject(rule),
    }));

    if (values.length > 0) {
      await this.db.insert(casbinRules).values(values);
    }

    return true;
  }

  /**
   * Remove multiple policies from the database
   */
  async removePolicies(
    sec: string,
    ptype: string,
    rules: string[][]
  ): Promise<boolean> {
    for (const rule of rules) {
      await this.removePolicy(sec, ptype, rule);
    }

    return true;
  }

  /**
   * Convert rule array to object with v0-v6 fields
   */
  private ruleToObject(rule: string[]) {
    return {
      v0: rule[0] ?? null,
      v1: rule[1] ?? null,
      v2: rule[2] ?? null,
      v3: rule[3] ?? null,
      v4: rule[4] ?? null,
      v5: rule[5] ?? null,
      v6: rule[6] ?? null,
    };
  }

  /**
   * Remove policies matching a filter pattern
   * Used by Casbin for batch deletions
   */
  async removeFilteredPolicy(
    _sec: string,
    ptype: string,
    fieldIndex: number,
    ...fieldValues: string[]
  ): Promise<void> {
    const fields = [
      casbinRules.v0,
      casbinRules.v1,
      casbinRules.v2,
      casbinRules.v3,
      casbinRules.v4,
      casbinRules.v5,
      casbinRules.v6,
    ];

    const conditions = [eq(casbinRules.ptype, ptype)];

    for (let i = 0; i < fieldValues.length; i++) {
      const value = fieldValues[i];
      const field = fields[fieldIndex + i];
      if (value && field) {
        conditions.push(eq(field, value));
      }
    }

    await this.db.delete(casbinRules).where(and(...conditions));
  }

  /**
   * Build where conditions for matching a rule
   */
  private buildWhereConditions(ptype: string, rule: string[]) {
    const conditions = [eq(casbinRules.ptype, ptype)];

    if (rule[0]) {
      conditions.push(eq(casbinRules.v0, rule[0]));
    }
    if (rule[1]) {
      conditions.push(eq(casbinRules.v1, rule[1]));
    }
    if (rule[2]) {
      conditions.push(eq(casbinRules.v2, rule[2]));
    }
    if (rule[3]) {
      conditions.push(eq(casbinRules.v3, rule[3]));
    }
    if (rule[4]) {
      conditions.push(eq(casbinRules.v4, rule[4]));
    }
    if (rule[5]) {
      conditions.push(eq(casbinRules.v5, rule[5]));
    }
    if (rule[6]) {
      conditions.push(eq(casbinRules.v6, rule[6]));
    }

    return conditions;
  }
}
