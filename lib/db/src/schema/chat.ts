import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const conversationsTable = pgTable("conversations", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => usersTable.id),
  donorId: integer("donor_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversationsTable.id),
  senderId: integer("sender_id").notNull().references(() => usersTable.id),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Conversation = typeof conversationsTable.$inferSelect;
export type Message = typeof messagesTable.$inferSelect;
