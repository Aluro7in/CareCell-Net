import { Router, type IRouter } from "express";
import { db, donorsTable } from "@workspace/db";
import { requireAuth } from "./auth.js";

const router: IRouter = Router();
const PY_SERVICE = "http://localhost:8000";

function daysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return 180;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

router.post("/match", requireAuth, async (req, res) => {
  try {
    const { bloodGroup, lat, lng, urgency, name } = req.body as {
      bloodGroup?: string;
      lat?: number;
      lng?: number;
      urgency?: string;
      name?: string;
    };

    const allDonors = await db.select().from(donorsTable);

    const donorPayload = allDonors.map((d) => ({
      id: d.id,
      name: d.name,
      bloodGroup: d.bloodGroup,
      lat: d.latitude ?? 19.076,
      lng: d.longitude ?? 72.877,
      phone: d.phone,
      available: d.available ?? true,
      reliabilityScore: 75,
      lastDonationDays: daysSince(d.lastDonationDate),
      hla_match: 0.5,
      response_history: 0.7,
    }));

    const pyRes = await fetch(`${PY_SERVICE}/match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient: {
          bloodGroup: bloodGroup ?? "O+",
          lat: lat ?? 19.076,
          lng: lng ?? 72.877,
          urgency: urgency ?? "normal",
          name: name ?? "Patient",
        },
        donors: donorPayload,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!pyRes.ok) {
      const errText = await pyRes.text().catch(() => "unknown");
      req.log.error({ status: pyRes.status, errText }, "FastAPI /match error");
      return res.status(502).json({ error: "Matching service unavailable" });
    }

    const result = (await pyRes.json()) as {
      top_donors: unknown[];
      explanation: string;
      total_scored: number;
    };

    res.json({
      topDonors: result.top_donors,
      explanation: result.explanation,
      totalScored: result.total_scored,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    req.log.error({ err: msg }, "POST /api/match failed");
    res.status(500).json({ error: "Match request failed", details: msg });
  }
});

export default router;
