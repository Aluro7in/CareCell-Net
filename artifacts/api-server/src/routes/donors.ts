import { Router, type IRouter } from "express";
import { db, donorsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

const createDonorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  bloodGroup: z.enum(BLOOD_GROUPS, { error: "Invalid blood group" }),
  latitude: z.number({ error: "Latitude must be a number" }).min(-90).max(90),
  longitude: z.number({ error: "Longitude must be a number" }).min(-180).max(180),
  phone: z.string().min(7, "Phone number too short").max(20),
  lastDonationDate: z.string().nullable().optional(),
  available: z.boolean().optional().default(true),
});

const updateAvailabilitySchema = z.object({
  available: z.boolean({ error: "available must be a boolean" }),
});

router.get("/donors", async (req, res) => {
  try {
    const donors = await db.select().from(donorsTable).orderBy(donorsTable.createdAt);
    res.json(donors.map(formatDonor));
  } catch (err) {
    req.log.error({ err }, "Failed to list donors");
    res.status(500).json({ error: "Failed to list donors" });
  }
});

router.post("/donors", async (req, res) => {
  const parsed = createDonorSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const { name, bloodGroup, latitude, longitude, lastDonationDate, phone, available } = parsed.data;
    const [donor] = await db.insert(donorsTable).values({
      name,
      bloodGroup,
      latitude,
      longitude,
      lastDonationDate: lastDonationDate ?? null,
      phone,
      available: available ?? true,
    }).returning();
    res.status(201).json(formatDonor(donor));
  } catch (err) {
    req.log.error({ err }, "Failed to create donor");
    res.status(500).json({ error: "Failed to create donor" });
  }
});

router.patch("/donors/:id/availability", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid donor ID" });

  const parsed = updateAvailabilitySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const [donor] = await db.update(donorsTable)
      .set({ available: parsed.data.available })
      .where(eq(donorsTable.id, id))
      .returning();
    if (!donor) return res.status(404).json({ error: "Donor not found" });
    res.json(formatDonor(donor));
  } catch (err) {
    req.log.error({ err }, "Failed to update donor availability");
    res.status(500).json({ error: "Failed to update donor" });
  }
});

function formatDonor(d: any) {
  return {
    id: d.id,
    name: d.name,
    bloodGroup: d.bloodGroup,
    latitude: d.latitude,
    longitude: d.longitude,
    lastDonationDate: d.lastDonationDate ?? null,
    available: d.available,
    phone: d.phone,
    createdAt: d.createdAt?.toISOString?.() ?? d.createdAt,
  };
}

export default router;
