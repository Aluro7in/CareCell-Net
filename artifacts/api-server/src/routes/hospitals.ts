import { Router, type IRouter } from "express";
import { db, hospitalsTable } from "@workspace/db";
import { haversineDistance } from "../lib/distance.js";

const router: IRouter = Router();

router.get("/hospitals", async (req, res) => {
  try {
    const hospitals = await db.select().from(hospitalsTable);
    res.json(hospitals.map(formatHospital));
  } catch (err) {
    req.log.error({ err }, "Failed to list hospitals");
    res.status(500).json({ error: "Failed to list hospitals" });
  }
});

router.get("/hospitals/nearby", async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radiusKm = parseFloat((req.query.radiusKm as string) ?? "50");

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: "lat and lng are required" });
    }

    const hospitals = await db.select().from(hospitalsTable);
    const nearby = hospitals
      .map((h) => ({
        ...formatHospital(h),
        distanceKm: Math.round(haversineDistance(lat, lng, h.latitude, h.longitude) * 10) / 10,
      }))
      .filter((h) => h.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    res.json(nearby);
  } catch (err) {
    req.log.error({ err }, "Failed to get nearby hospitals");
    res.status(500).json({ error: "Failed to get nearby hospitals" });
  }
});

function formatHospital(h: any) {
  return {
    id: h.id,
    name: h.name,
    address: h.address,
    latitude: h.latitude,
    longitude: h.longitude,
    bedsAvailable: h.bedsAvailable,
    bloodBankAvailable: h.bloodBankAvailable,
    phone: h.phone,
    createdAt: h.createdAt?.toISOString?.() ?? h.createdAt,
  };
}

export default router;
