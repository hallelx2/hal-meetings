import {
  pgTable,
  uuid,
  text,
  timestamp,
  customType,
  index,
} from 'drizzle-orm/pg-core';

/** bytea column type for ciphertext. Always opaque to the DB layer. */
const bytea = customType<{ data: Uint8Array; driverData: Buffer }>({
  dataType() {
    return 'bytea';
  },
  toDriver(value) {
    return Buffer.from(value);
  },
  fromDriver(value) {
    return new Uint8Array(value);
  },
});

/**
 * users table — the root of every multi-tenant query. Every other table is
 * foreign-keyed here. A user owns their own data encryption key (DEK), which
 * is itself stored encrypted (wrapped by the KMS master key).
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    name: text('name'),

    // DEK wrapped by KMS. Bytea so the DB never sees plaintext.
    dekWrapped: bytea('dek_wrapped').notNull(),
    // Which KMS key version wrapped the DEK — supports key rotation.
    dekKmsKeyId: text('dek_kms_key_id').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: index('users_email_idx').on(table.email),
  }),
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;

export { bytea };
