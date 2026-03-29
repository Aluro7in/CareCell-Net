import { Router, type IRouter } from "express";
import { db, alertsTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/alerts", async (req, res) => {
  try {
    const alerts = await db.select().from(alertsTable).orderBy(desc(alertsTable.sentAt)).limit(50);
    res.json(alerts.map((a) => ({
      id: a.id,
      requestId: a.requestId,
      donorName: a.donorName,
      donorPhone: a.donorPhone,
      bloodGroup: a.bloodGroup,
      patientName: a.patientName,
      urgency: a.urgency,
      distanceKm: a.distanceKm,
      sentAt: a.sentAt?.toISOString?.() ?? a.sentAt,
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to list alerts");
    res.status(500).json({ error: "Failed to list alerts" });
  }
});

export default router;
