import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const profileTable = pgTable("profile", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("CareCell User"),
  role: text("role").notNull().default("Patient"),
  age: integer("age"),
  gender: text("gender"),
  phone: text("phone"),
  location: text("location"),
  bloodGroup: text("blood_group"),
  cancerType: text("cancer_type"),
  stage: text("stage"),
  allergies: text("allergies"),
  treatment: text("treatment"),
  healthNotes: text("health_notes"),
  reports: text("reports").array().default([]),
  reliabilityScore: integer("reliability_score").notNull().default(85),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Profile = typeof profileTable.$inferSelect;
export type InsertProfile = typeof profileTable.$inferInsert;
