import {
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
  unique,
  jsonb,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  manageToken: text("manage_token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const watchedProducts = pgTable(
  "watched_products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    supermarket: text("supermarket").notNull().default("ah"),
    externalProductId: text("external_product_id").notNull(),
    name: text("name").notNull(),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("watched_user_product_idx").on(
      table.userId,
      table.supermarket,
      table.externalProductId,
    ),
  ],
);

export const bonusSnapshots = pgTable(
  "bonus_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    supermarket: text("supermarket").notNull(),
    weekKey: text("week_key").notNull(),
    productIds: jsonb("product_ids").$type<string[]>().notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("bonus_snapshot_week_idx").on(table.supermarket, table.weekKey),
  ],
);

export const alertLogs = pgTable(
  "alert_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    watchedProductId: uuid("watched_product_id")
      .notNull()
      .references(() => watchedProducts.id, { onDelete: "cascade" }),
    weekKey: text("week_key").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("alert_user_product_week_idx").on(
      table.userId,
      table.watchedProductId,
      table.weekKey,
    ),
  ],
);

export type User = typeof users.$inferSelect;
export type WatchedProduct = typeof watchedProducts.$inferSelect;
