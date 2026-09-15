import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db, sqlite } from "./index";

migrate(db, { migrationsFolder: "./drizzle" });
console.log("Migrations applied.");
sqlite.close();
