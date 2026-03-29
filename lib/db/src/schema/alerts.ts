import { pgTable, serial, integer, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const alertsTable = pgTable("alerts", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull(),
  donorName: text("donor_name").notNull(),
  donorPhone: text("donor_phone").notNull(),
  bloodGroup: text("blood_group").notNull(),
  patientName: text("patient_name").notNull(),
  urgency: text("urgency").notNull(),
  distanceKm: real("distance_km").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export const insertAlertSchema = createInsertSchema(alertsTable).omit({ id: true, sentAt: true });
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alertsTable.$inferSelect;
