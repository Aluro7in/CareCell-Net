import { Router, type IRouter } from "express";
import { db, profileTable } from "@workspace/db";
import { z } from "zod";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const PROFILE_ID = 1;

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.string().max(50).optional(),
  age: z.number().int().min(1).max(120).optional().nullable(),
  gender: z.string().max(20).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).optional().nullable(),
  cancerType: z.string().max(100).optional().nullable(),
  stage: z.string().max(50).optional().nullable(),
  allergies: z.string().max(500).optional().nullable(),
  treatment: z.string().max(500).optional().nullable(),
  healthNotes: z.string().max(2000).optional().nullable(),
  reliabilityScore: z.number().int().min(0).max(100).optional(),
  avatarUrl: z.string().max(500).optional().nullable(),
  reports: z.array(z.string()).optional(),
});

async function getOrCreateProfile() {
  const existing = await db.select().from(profileTable).where(eq(profileTable.id, PROFILE_ID)).limit(1);
  if (existing.length > 0) return existing[0];
  const [created] = await db.insert(profileTable).values({ id: PROFILE_ID }).returning();
  return created;
}

router.get("/profile", async (req, res) => {
  try {
    const profile = await getOrCreateProfile();
    res.json(profile);
  } catch (err) {
    req.log.error({ err }, "Failed to get profile");
    res.status(500).json({ error: "Failed to get profile" });
  }
});

router.put("/profile", async (req, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
  }

  try {
    await getOrCreateProfile();
    const [updated] = await db
      .update(profileTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(profileTable.id, PROFILE_ID))
      .returning();
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update profile");
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
