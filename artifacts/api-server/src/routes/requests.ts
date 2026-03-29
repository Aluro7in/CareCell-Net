import { Router, type IRouter } from "express";
import { db, donorsTable, patientsTable, requestsTable, alertsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { matchDonors } from "../lib/matching.js";
import { z } from "zod";

const router: IRouter = Router();

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
const URGENCY = ["normal", "critical"] as const;
const STATUSES = ["pending", "active", "fulfilled", "cancelled"] as const;

const createRequestSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  bloodGroup: z.enum(BLOOD_GROUPS, { error: "Invalid blood group" }),
  cancerType: z.string().min(2, "Diagnosis/cancer type required").max(100),
  latitude: z.number({ error: "Latitude must be a number" }).min(-90).max(90),
  longitude: z.number({ error: "Longitude must be a number" }).min(-180).max(180),
  urgency: z.enum(URGENCY, { error: "Urgency must be normal or critical" }),
  phone: z.string().min(7, "Phone number too short").max(20),
});

const updateStatusSchema = z.object({
  status: z.enum(STATUSES, { error: "Invalid status value" }),
});

const matchInputSchema = z.object({
  bloodGroup: z.enum(BLOOD_GROUPS, { error: "Invalid blood group" }),
  latitude: z.number({ error: "Latitude required" }),
  longitude: z.number({ error: "Longitude required" }),
  urgency: z.enum(URGENCY, { error: "Urgency must be normal or critical" }),
});

router.get("/requests", async (req, res) => {
  try {
    const requests = await db.select().from(requestsTable).orderBy(requestsTable.createdAt);
    res.json(requests.map(formatRequest));
  } catch (err) {
    req.log.error({ err }, "Failed to list requests");
    res.status(500).json({ error: "Failed to list requests" });
  }
});

router.post("/requests", async (req, res) => {
  const parsed = createRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const { name, bloodGroup, cancerType, latitude, longitude, urgency, phone } = parsed.data;

    const [patient] = await db.insert(patientsTable).values({
      name, bloodGroup, cancerType, latitude, longitude, urgency,
    }).returning();

    const [request] = await db.insert(requestsTable).values({
      patientId: patient.id,
      patientName: name,
      bloodGroup,
      cancerType,
      urgency,
      status: "active",
      latitude,
      longitude,
      phone,
    }).returning();

    const allDonors = await db.select().from(donorsTable);
    const matched = matchDonors(allDonors, bloodGroup, latitude, longitude, urgency);

    if (matched.length > 0) {
      await db.insert(alertsTable).values(
        matched.map((d) => ({
          requestId: request.id,
          donorName: d.name,
          donorPhone: d.phone,
          bloodGroup: d.bloodGroup,
          patientName: name,
          urgency,
          distanceKm: d.distanceKm,
        }))
      );
    }

    req.log.info({ requestId: request.id, matchCount: matched.length, urgency }, "Emergency request created");

    res.status(201).json({
      ...formatRequest(request),
      matchedDonors: matched,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create request");
    res.status(500).json({ error: "Failed to create request" });
  }
});

router.patch("/requests/:id/status", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid request ID" });

  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const [request] = await db.update(requestsTable)
      .set({ status: parsed.data.status })
      .where(eq(requestsTable.id, id))
      .returning();
    if (!request) return res.status(404).json({ error: "Request not found" });
    res.json(formatRequest(request));
  } catch (err) {
    req.log.error({ err }, "Failed to update request status");
    res.status(500).json({ error: "Failed to update request" });
  }
});

router.post("/match", async (req, res) => {
  const parsed = matchInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const { bloodGroup, latitude, longitude, urgency } = parsed.data;
    const allDonors = await db.select().from(donorsTable);
    const matched = matchDonors(allDonors, bloodGroup, latitude, longitude, urgency);
    res.json(matched);
  } catch (err) {
    req.log.error({ err }, "Failed to match donors");
    res.status(500).json({ error: "Failed to match donors" });
  }
});

function formatRequest(r: any) {
  return {
    id: r.id,
    patientId: r.patientId,
    patientName: r.patientName,
    bloodGroup: r.bloodGroup,
    cancerType: r.cancerType,
    urgency: r.urgency,
    status: r.status,
    createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
  };
}

export default router;
