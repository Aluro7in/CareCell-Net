import { haversineDistance } from "./distance.js";
import type { Donor } from "@workspace/db";

const BLOOD_COMPATIBILITY: Record<string, string[]> = {
  "A+": ["A+", "A-", "O+", "O-"],
  "A-": ["A-", "O-"],
  "B+": ["B+", "B-", "O+", "O-"],
  "B-": ["B-", "O-"],
  "AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
  "AB-": ["A-", "B-", "AB-", "O-"],
  "O+": ["O+", "O-"],
  "O-": ["O-"],
};

export interface DonorMatchResult {
  id: number;
  name: string;
  bloodGroup: string;
  phone: string;
  distanceKm: number;
  score: number;
  available: boolean;
}

export function matchDonors(
  donors: Donor[],
  bloodGroup: string,
  latitude: number,
  longitude: number,
  urgency: string
): DonorMatchResult[] {
  const compatible = BLOOD_COMPATIBILITY[bloodGroup] ?? [bloodGroup];
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const scored = donors
    .filter((d) => compatible.includes(d.bloodGroup))
    .filter((d) => {
      if (!d.lastDonationDate) return true;
      return new Date(d.lastDonationDate) < ninetyDaysAgo;
    })
    .map((d) => {
      const distanceKm = haversineDistance(latitude, longitude, d.latitude, d.longitude);
      let score = 0;

      if (d.bloodGroup === bloodGroup) score += 50;
      if (distanceKm < 5) score += 30;
      else if (distanceKm < 15) score += 15;
      if (d.available) score += 20;
      if (urgency === "critical" && distanceKm < 10) score += 25;

      return {
        id: d.id,
        name: d.name,
        bloodGroup: d.bloodGroup,
        phone: d.phone,
        distanceKm: Math.round(distanceKm * 10) / 10,
        score,
        available: d.available,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return scored;
}
