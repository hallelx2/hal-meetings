import { eq } from 'drizzle-orm';
import type { Db } from '../client';
import { users, type UserRow, type NewUserRow } from '../schema/users';

export class UsersRepository {
  constructor(private readonly db: Db) {}

  async findById(id: string): Promise<UserRow | null> {
    const rows = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async findByEmail(email: string): Promise<UserRow | null> {
    const rows = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return rows[0] ?? null;
  }

  async create(input: NewUserRow): Promise<UserRow> {
    const [row] = await this.db.insert(users).values(input).returning();
    if (!row) throw new Error('[@hal/db] failed to insert user');
    return row;
  }

  async updateDek(
    userId: string,
    dekWrapped: Uint8Array,
    dekKmsKeyId: string,
  ): Promise<UserRow> {
    const [row] = await this.db
      .update(users)
      .set({ dekWrapped, dekKmsKeyId, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    if (!row) throw new Error(`[@hal/db] user ${userId} not found for DEK update`);
    return row;
  }

  async deleteById(id: string): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id));
  }
}
