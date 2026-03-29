import { Router, type IRouter } from "express";
import { db, donorsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

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
  try {
    const { name, bloodGroup, latitude, longitude, lastDonationDate, phone } = req.body;
    if (!name || !bloodGroup || latitude == null || longitude == null || !phone) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const [donor] = await db.insert(donorsTable).values({
      name,
      bloodGroup,
      latitude,
      longitude,
      lastDonationDate: lastDonationDate ?? null,
      phone,
      available: true,
    }).returning();
    res.status(201).json(formatDonor(donor));
  } catch (err) {
    req.log.error({ err }, "Failed to create donor");
    res.status(500).json({ error: "Failed to create donor" });
  }
});

router.patch("/donors/:id/availability", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { available } = req.body;
    if (typeof available !== "boolean") {
      return res.status(400).json({ error: "available must be a boolean" });
    }
    const [donor] = await db.update(donorsTable)
      .set({ available })
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
