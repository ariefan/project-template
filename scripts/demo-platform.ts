import { createDb, schema } from "../packages/db/src";
import { createAuthorization } from "../packages/authorization/src";
import { eq } from "drizzle-orm";
import { resolve } from "path";
import dotenv from "dotenv";

dotenv.config({ path: resolve(__dirname, "../.env.local") });
dotenv.config({ path: resolve(__dirname, "../.env") });

async function main() {
  console.log("🚀 Starting Core Architecture Demo...\n");

  const dbConfig = { connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres" };
  const { db, pool } = createDb(dbConfig);
  const casbinRules = schema.casbinRules;

  try {
    // 1. Setup: Clean up previous demo data
    await db.delete(casbinRules).where(eq(casbinRules.v1, "app_crm"));
    await db.delete(casbinRules).where(eq(casbinRules.v1, "app_hrm"));

    // 2. Setup Authorization Policies
    console.log("📦 Setting up Multi-App/Multi-Tenant Policies in Casbin...");

    // Format: (role, app, tenant, obj, act, eft, condition)
    await db.insert(casbinRules).values([
      // App 1 (CRM)
      { ptype: "p", v0: "admin", v1: "app_crm", v2: "tenant_acme", v3: "customers", v4: "write", v5: "allow", v6: "" },
      { ptype: "p", v0: "admin", v1: "app_crm", v2: "tenant_acme", v3: "customers", v4: "read", v5: "allow", v6: "" },
      { ptype: "p", v0: "viewer", v1: "app_crm", v2: "tenant_acme", v3: "customers", v4: "read", v5: "allow", v6: "" },

      // App 2 (HRM)
      { ptype: "p", v0: "admin", v1: "app_hrm", v2: "tenant_globex", v3: "employees", v4: "write", v5: "allow", v6: "" },
      { ptype: "p", v0: "member", v1: "app_hrm", v2: "tenant_globex", v3: "employees", v4: "read", v5: "allow", v6: "" },
    ]);

    // Initialize the Enforcer
    const enforcer = await createAuthorization(db);

    console.log("\n👤 Simulating User Scenarios...");
    const userId = "user_123";

    // Scenario 1: User is an 'admin' in Acme Corp on the CRM App
    console.log("\n--- Scenario 1: User is 'admin' in tenant_acme for app_crm ---");
    let role = "admin";
    let app = "app_crm";
    let tenant = "tenant_acme";

    // Request format: (sub, role, app, tenant, obj, act, resourceOwnerId)
    const canWriteCustomers = await enforcer.enforce(userId, role, app, tenant, "customers", "write", "");
    console.log(`✅ Can write customers? ${canWriteCustomers ? 'YES' : 'NO'} (Expected: YES)`);

    const canReadEmployees = await enforcer.enforce(userId, role, app, tenant, "employees", "read", "");
    console.log(`❌ Can read employees? ${canReadEmployees ? 'YES' : 'NO'} (Expected: NO)`);


    // Scenario 2: Same user is just a 'viewer' in Acme Corp on the CRM App (maybe they switched roles)
    console.log("\n--- Scenario 2: User is 'viewer' in tenant_acme for app_crm ---");
    role = "viewer";

    const viewerCanWriteCustomers = await enforcer.enforce(userId, role, app, tenant, "customers", "write", "");
    console.log(`❌ Can write customers? ${viewerCanWriteCustomers ? 'YES' : 'NO'} (Expected: NO)`);

    const viewerCanReadCustomers = await enforcer.enforce(userId, role, app, tenant, "customers", "read", "");
    console.log(`✅ Can read customers? ${viewerCanReadCustomers ? 'YES' : 'NO'} (Expected: YES)`);


    // Scenario 3: Same user logs into App 2 (HRM) for a different tenant (Globex) as a 'member'
    console.log("\n--- Scenario 3: User is 'member' in tenant_globex for app_hrm ---");
    role = "member";
    app = "app_hrm";
    tenant = "tenant_globex";

    const memberCanWriteEmployees = await enforcer.enforce(userId, role, app, tenant, "employees", "write", "");
    console.log(`❌ Can write employees? ${memberCanWriteEmployees ? 'YES' : 'NO'} (Expected: NO)`);

    const memberCanReadEmployees = await enforcer.enforce(userId, role, app, tenant, "employees", "read", "");
    console.log(`✅ Can read employees? ${memberCanReadEmployees ? 'YES' : 'NO'} (Expected: YES)`);

    // Scenario 4: User tries to access App 1's data from App 2's context
    console.log("\n--- Scenario 4: User in App 2 tries to access App 1's resources ---");
    const memberCanReadCustomers = await enforcer.enforce(userId, role, app, tenant, "customers", "read", "");
    console.log(`❌ Can read customers? ${memberCanReadCustomers ? 'YES' : 'NO'} (Expected: NO - Strict App Boundary!)`);


    console.log("\n✨ Demo completed successfully. The multi-app, multi-tenant authorization matrix works perfectly!\n");

  } catch (error) {
    console.error("Error running demo:", error);
  } finally {
    // Cleanup demo data
    await db.delete(casbinRules).where(eq(casbinRules.v1, "app_crm"));
    await db.delete(casbinRules).where(eq(casbinRules.v1, "app_hrm"));
    await pool.end();
  }
}

main();
