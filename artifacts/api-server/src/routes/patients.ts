import { Router, type IRouter } from "express";
import { db, patientsTable } from "@workspace/db";

const router: IRouter = Router();

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
  try {
    const { name, bloodGroup, cancerType, latitude, longitude, urgency } = req.body;
    if (!name || !bloodGroup || !cancerType || latitude == null || longitude == null || !urgency) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const [patient] = await db.insert(patientsTable).values({
      name, bloodGroup, cancerType, latitude, longitude,
      urgency: urgency ?? "normal",
    }).returning();
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
