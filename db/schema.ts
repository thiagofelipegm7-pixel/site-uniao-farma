import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
