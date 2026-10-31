import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const metricHits = sqliteTable("metric_hits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  day: text("day").notNull(),
  stage: text("stage").notNull(),
  unit: text("unit"),
  intent: text("intent"),
  source: text("source"),
  createdAt: text("created_at").notNull(),
});

export const webhookMessages = sqliteTable("webhook_messages", {
  wamid: text("wamid").primaryKey(),
  receivedAt: text("received_at").notNull(),
});

export const webhookEvents = sqliteTable("webhook_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  at: text("at").notNull(),
  unit: text("unit").notNull(),
  type: text("type").notNull(),
  source: text("source").notNull(),
});

// Contador próprio de cliques (sem cookies/IP/ID). A tabela também é criada em runtime
// por app/click-counter.ts (CREATE TABLE IF NOT EXISTS). SQL em drizzle/0001_click_counts.sql.
export const clickCounts = sqliteTable(
  "click_counts",
  {
    day: text("day").notNull(),
    path: text("path").notNull(),
    button: text("button").notNull(),
    store: text("store").notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.day, table.path, table.button, table.store] })],
);
