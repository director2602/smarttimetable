import { db } from "./index";
import { users } from "./schema";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../lib/auth";

async function main() {
  const owner = await db.query.users.findFirst({ where: eq(users.email, "owner@demo.local") });
  if (!owner || !owner.passwordHash) throw new Error("Owner not found - run db:seed first.");

  const validPass = await verifyPassword("Admin@12345", owner.passwordHash);
  const invalidPass = await verifyPassword("wrong-password", owner.passwordHash);

  console.log(`Owner found: ${owner.email}, role=${owner.role}, status=${owner.status}`);
  console.log(`Correct password verifies: ${validPass}`);
  console.log(`Wrong password rejected: ${!invalidPass}`);

  if (!validPass || invalidPass) {
    console.error("AUTH CHECK FAILED");
    process.exit(1);
  }
  console.log("Auth check passed.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
