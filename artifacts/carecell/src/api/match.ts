const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface MatchRequest {
  bloodGroup: string;
  lat: number;
  lng: number;
  urgency: "normal" | "critical";
  name?: string;
}

export interface MatchedDonor {
  id: number | string;
  name: string;
  bloodGroup: string;
  lat?: number;
  lng?: number;
  phone?: string;
  available?: boolean;
  reliabilityScore?: number;
  _matchScore?: number;
  _distanceKm?: number;
  distanceKm?: number;
}

export interface MatchResult {
  topDonors: MatchedDonor[];
  explanation: string;
  totalScored: number;
}

export async function matchDonors(data: MatchRequest): Promise<MatchResult> {
  const token = localStorage.getItem("carecell_token");

  const res = await fetch(`${BASE}/api/match`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error((err as any).error ?? `HTTP ${res.status}`);
  }

  return res.json();
}
