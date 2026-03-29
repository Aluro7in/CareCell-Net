import { pgTable, serial, text, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const donorsTable = pgTable("donors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  bloodGroup: text("blood_group").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  lastDonationDate: text("last_donation_date"),
  available: boolean("available").notNull().default(true),
  phone: text("phone").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDonorSchema = createInsertSchema(donorsTable).omit({ id: true, createdAt: true });
export type InsertDonor = z.infer<typeof insertDonorSchema>;
export type Donor = typeof donorsTable.$inferSelect;
