import { Router, type IRouter } from "express";
import { db, donorsTable, patientsTable, requestsTable, alertsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { matchDonors } from "../lib/matching.js";

const router: IRouter = Router();

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
  try {
    const { name, bloodGroup, cancerType, latitude, longitude, urgency, phone } = req.body;
    if (!name || !bloodGroup || !cancerType || latitude == null || longitude == null || !urgency || !phone) {
      return res.status(400).json({ error: "Missing required fields" });
    }

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

    const alertsToInsert = matched.map((d) => ({
      requestId: request.id,
      donorName: d.name,
      donorPhone: d.phone,
      bloodGroup: d.bloodGroup,
      patientName: name,
      urgency,
      distanceKm: d.distanceKm,
    }));

    if (alertsToInsert.length > 0) {
      await db.insert(alertsTable).values(alertsToInsert);
    }

    req.log.info({ requestId: request.id, matchCount: matched.length, urgency }, "Emergency request created and donors alerted");

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
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const validStatuses = ["pending", "active", "fulfilled", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const [request] = await db.update(requestsTable)
      .set({ status })
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
  try {
    const { bloodGroup, latitude, longitude, urgency } = req.body;
    if (!bloodGroup || latitude == null || longitude == null || !urgency) {
      return res.status(400).json({ error: "Missing required fields" });
    }
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
