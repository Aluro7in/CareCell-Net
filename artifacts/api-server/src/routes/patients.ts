import { Router, type IRouter } from "express";
import { db, patientsTable } from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
const URGENCY = ["normal", "critical"] as const;

const createPatientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  bloodGroup: z.enum(BLOOD_GROUPS, { error: "Invalid blood group" }),
  cancerType: z.string().min(2, "Cancer type/diagnosis required").max(100),
  latitude: z.number({ error: "Latitude must be a number" }).min(-90).max(90),
  longitude: z.number({ error: "Longitude must be a number" }).min(-180).max(180),
  urgency: z.enum(URGENCY, { error: "Urgency must be normal or critical" }).default("normal"),
});

router.get("/patients", async (req, res) => {
  try {
    const patients = await db.select().from(patientsTable).orderBy(patientsTable.createdAt);
    res.json(patients.map(formatPatient));
  } catch (err) {
    req.log.error({ err }, "Failed to list patients");
    res.status(500).json({ error: "Failed to list patients" });
  }
});

router.post("/patients", async (req, res) => {
  const parsed = createPatientSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const [patient] = await db.insert(patientsTable).values(parsed.data).returning();
    res.status(201).json(formatPatient(patient));
  } catch (err) {
    req.log.error({ err }, "Failed to create patient");
    res.status(500).json({ error: "Failed to create patient" });
  }
});

function formatPatient(p: any) {
  return {
    id: p.id,
    name: p.name,
    bloodGroup: p.bloodGroup,
    cancerType: p.cancerType,
    latitude: p.latitude,
    longitude: p.longitude,
    urgency: p.urgency,
    createdAt: p.createdAt?.toISOString?.() ?? p.createdAt,
  };
}

export default router;
