import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { users } from '../src/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { hash } from '../src/server/lib/password.js';
import { env } from '../src/server/env.js';
import type * as schema from '../src/server/db/schema.js';

export async function seedUsers(db: BetterSQLite3Database<typeof schema>) {
  const adminHash = await hash(env.ADMIN_PASSWORD);
  const userHash = await hash(env.TEST_USER_PASSWORD);

  const existingAdmin = db.select().from(users).where(eq(users.email, env.ADMIN_EMAIL)).get();
  if (!existingAdmin) {
    db.insert(users).values({
      email: env.ADMIN_EMAIL,
      passwordHash: adminHash,
      role: 'admin',
      displayName: 'Admin',
    }).run();
    console.log(`Seeded admin: ${env.ADMIN_EMAIL}`);
  }

  const existingUser = db.select().from(users).where(eq(users.email, env.TEST_USER_EMAIL)).get();
  if (!existingUser) {
    db.insert(users).values({
      email: env.TEST_USER_EMAIL,
      passwordHash: userHash,
      role: 'user',
      displayName: 'Test User',
    }).run();
    console.log(`Seeded test user: ${env.TEST_USER_EMAIL}`);
  }
}
