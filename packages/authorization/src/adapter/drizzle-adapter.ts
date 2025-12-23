import { and, db, eq } from "@workspace/db";
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
  },
  model: Model
): void {
  const values = [rule.v0, rule.v1, rule.v2, rule.v3, rule.v4, rule.v5].filter(
    (v): v is string => v !== null && v !== undefined
  );

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
  /**
   * Load all policies from the database into the Casbin model
   */
  async loadPolicy(model: Model): Promise<void> {
    const rules = await db.select().from(casbinRules);

    for (const rule of rules) {
      loadPolicyLine(rule.ptype, rule, model);
    }
  }

  /**
   * Save all policies from the Casbin model to the database
   * This is called when policies are modified and autoSave is enabled
   */
  async savePolicy(model: Model): Promise<boolean> {
    // Delete all existing rules
    await db.delete(casbinRules);

    const allRules: Array<{
      ptype: string;
      v0: string | null;
      v1: string | null;
      v2: string | null;
      v3: string | null;
      v4: string | null;
      v5: string | null;
    }> = [];

    // Extract policy rules (p)
    const pModel = model.model.get("p");
    if (pModel) {
      const pTokens = pModel.get("p");
      if (pTokens) {
        for (const rule of pTokens.policy) {
          allRules.push({
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
          allRules.push({
            ptype: "g",
            ...this.ruleToObject(rule),
          });
        }
      }
    }

    // Insert all rules
    if (allRules.length > 0) {
      await db.insert(casbinRules).values(allRules);
    }

    return true;
  }

  /**
   * Add a single policy to the database
   */
  async addPolicy(_sec: string, ptype: string, rule: string[]): Promise<void> {
    await db.insert(casbinRules).values({
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
    await db.delete(casbinRules).where(and(...conditions));
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
      await db.insert(casbinRules).values(values);
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
   * Convert rule array to object with v0-v5 fields
   */
  private ruleToObject(rule: string[]) {
    return {
      v0: rule[0] ?? null,
      v1: rule[1] ?? null,
      v2: rule[2] ?? null,
      v3: rule[3] ?? null,
      v4: rule[4] ?? null,
      v5: rule[5] ?? null,
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
    ];

    const conditions = [eq(casbinRules.ptype, ptype)];

    for (let i = 0; i < fieldValues.length; i++) {
      const value = fieldValues[i];
      const field = fields[fieldIndex + i];
      if (value && field) {
        conditions.push(eq(field, value));
      }
    }

    await db.delete(casbinRules).where(and(...conditions));
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

    return conditions;
  }
}
