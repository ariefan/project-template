import { count, eq } from "drizzle-orm";
import { initDefaultDb } from "./src";
import { examplePosts } from "./src/schema";

async function main() {
  // Hardcoded to 'postgres' DB which seems to be what API and Seed use
  const connectionString =
    "postgresql://postgres:postgres@localhost:5432/postgres";

  const db = initDefaultDb({ connectionString });

  console.log(`Checking example_posts table in ${connectionString}...`);
  try {
    const total = await db.select({ count: count() }).from(examplePosts);
    console.log("Total posts:", total[0].count);

    const acmePosts = await db
      .select({ count: count() })
      .from(examplePosts)
      .where(eq(examplePosts.orgId, "org_acme"));
    console.log("Acme posts:", acmePosts[0].count);

    if (acmePosts[0].count > 0) {
      const sample = await db.query.examplePosts.findMany({
        limit: 3,
        where: eq(examplePosts.orgId, "org_acme"),
        columns: {
          id: true,
          title: true,
          orgId: true,
          status: true,
          isDeleted: true,
          tags: true,
          category: true,
        },
      });
      console.log("Sample Acme posts:", JSON.stringify(sample, null, 2));
    }
  } catch (e) {
    console.error("Query failed. Maybe schema is missing in this DB?");
    console.error(e);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
