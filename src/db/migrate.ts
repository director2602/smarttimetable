import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db, sqlClient } from "./index";

async function main() {
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied.");
  await sqlClient.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
