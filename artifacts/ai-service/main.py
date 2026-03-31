"""
CareCell Network — FastAPI AI Service
Endpoints:
  GET  /health
  POST /ai/chat
  POST /ai/tts
  POST /match      ← ML donor matching + AI explanation
"""

import os
import math
import json
import logging
from typing import Optional, Any

import numpy as np
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field
from openai import OpenAI, OpenAIError
from sklearn.ensemble import RandomForestClassifier

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("carecell-ai")

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="CareCell AI Service",
    description="AI chat, TTS, and ML donor matching for CareCell Network",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Config ─────────────────────────────────────────────────────────────────────
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY", "")

AI_SYSTEM_PROMPT = (
    "You are CareCell AI, an emergency healthcare assistant specialising in "
    "blood donation, platelet donation, and cancer patient support in India. "
    "Reply in the same language as the user (Hindi or English). "
    "Keep responses concise, warm, and actionable. "
    "Always end with 2-3 relevant follow-up suggestions formatted as JSON: "
    '{"reply": "...", "suggestions": ["...", "..."]}'
)

PREFERRED_VOICE_NAMES = {
    "aria", "jessica", "sarah", "matilda",
    "laura", "alice", "lily", "charlotte",
}
_cached_voice_id: Optional[str] = None

# Blood group compatibility map  (key can donate to values)
COMPATIBILITY: dict[str, list[str]] = {
    "O-":  ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
    "O+":  ["O+", "A+", "B+", "AB+"],
    "A-":  ["A-", "A+", "AB-", "AB+"],
    "A+":  ["A+", "AB+"],
    "B-":  ["B-", "B+", "AB-", "AB+"],
    "B+":  ["B+", "AB+"],
    "AB-": ["AB-", "AB+"],
    "AB+": ["AB+"],
}

def can_donate(donor_bg: str, patient_bg: str) -> bool:
    return patient_bg in COMPATIBILITY.get(donor_bg, [])


# ── ML Model (trained at startup on synthetic data) ────────────────────────────
def _train_ml_model() -> RandomForestClassifier:
    """
    Train a RandomForest on synthetic donor-match data.
    Features: [distance_km, exact_match, hla_match, reliability_score,
               last_donation_days, response_history]
    Label: 1 = good match, 0 = poor match
    """
    rng = np.random.default_rng(42)
    n = 1200

    distance       = rng.uniform(0, 150, n)
    exact_match    = rng.integers(0, 2, n).astype(float)
    hla_match      = rng.uniform(0, 1, n)
    reliability    = rng.uniform(10, 100, n)
    last_donation  = rng.uniform(0, 365, n)
    response_hist  = rng.uniform(0, 1, n)

    label = (
        (exact_match == 1).astype(float) * 0.45
        + np.clip(1 - distance / 100, 0, 1) * 0.25
        + hla_match * 0.10
        + reliability / 100 * 0.10
        + np.clip(1 - last_donation / 365, 0, 1) * 0.05
        + response_hist * 0.05
    )
    y = (label + rng.uniform(-0.1, 0.1, n) > 0.45).astype(int)

    X = np.column_stack([distance, exact_match, hla_match,
                         reliability, last_donation, response_hist])
    clf = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
    clf.fit(X, y)
    log.info("ML model trained — %d samples, %d trees", n, clf.n_estimators)
    return clf


_ml_model: RandomForestClassifier = _train_ml_model()


# ── Helpers ────────────────────────────────────────────────────────────────────
def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return distance in km between two lat/lng points."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1))
         * math.cos(math.radians(lat2))
         * math.sin(dlon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _score_donor(donor: dict, patient: dict) -> tuple[float, float]:
    """Return (composite_score, distance_km)."""
    d_lat = float(donor.get("lat") or donor.get("latitude") or 19.076)
    d_lng = float(donor.get("lng") or donor.get("longitude") or 72.877)
    p_lat = float(patient.get("lat") or patient.get("latitude") or 19.076)
    p_lng = float(patient.get("lng") or patient.get("longitude") or 72.877)

    distance = haversine(p_lat, p_lng, d_lat, d_lng)
    donor_bg  = str(donor.get("bloodGroup") or donor.get("blood_group") or "O+")
    patient_bg = str(patient.get("bloodGroup") or patient.get("blood_group") or "O+")

    exact_match    = 1.0 if donor_bg == patient_bg else (
                     0.6 if can_donate(donor_bg, patient_bg) else 0.0)
    hla_match      = float(donor.get("hla_match", 0.5))
    reliability    = float(donor.get("reliabilityScore") or donor.get("reliability_score") or 75)
    last_donation  = float(donor.get("lastDonationDays") or donor.get("last_donation_days") or 90)
    response_hist  = float(donor.get("response_history", 0.7))
    available      = bool(donor.get("available", True))

    # Rule-based base score
    base = 0.0
    if donor_bg == patient_bg:
        base += 50
    elif can_donate(donor_bg, patient_bg):
        base += 30
    if distance < 5:
        base += 30
    elif distance < 20:
        base += 20
    elif distance < 50:
        base += 10
    if available:
        base += 20

    # ML score
    features = np.array([[distance, exact_match, hla_match,
                           reliability, last_donation, response_hist]])
    ml_proba = _ml_model.predict_proba(features)[0][1]

    composite = base * 0.7 + ml_proba * 100 * 0.3
    if not available:
        composite *= 0.4   # heavily penalise unavailable donors

    return composite, distance


def _resolve_voice_id() -> str:
    global _cached_voice_id
    if _cached_voice_id:
        return _cached_voice_id
    if not ELEVENLABS_API_KEY:
        return "21m00Tcm4TlvDq8ikWAM"
    try:
        res = requests.get(
            "https://api.elevenlabs.io/v1/voices",
            headers={"xi-api-key": ELEVENLABS_API_KEY},
            timeout=8,
        )
        res.raise_for_status()
        voices = res.json().get("voices", [])
        preferred = next(
            (v for v in voices if v["name"].lower() in PREFERRED_VOICE_NAMES),
            None,
        )
        voice = preferred or (voices[0] if voices else None)
        if voice:
            _cached_voice_id = voice["voice_id"]
            log.info("ElevenLabs voice: %s (%s)", voice["name"], _cached_voice_id)
            return _cached_voice_id
    except Exception as exc:
        log.warning("Voice resolve failed: %s", exc)
    return "21m00Tcm4TlvDq8ikWAM"


def _detect_lang(text: str) -> str:
    return "hindi" if any("\u0900" <= ch <= "\u097f" for ch in text) else "english"


def _get_openai_client():
    if not OPENAI_API_KEY:
        return None, None
    is_openrouter = OPENAI_API_KEY.startswith("sk-or-")
    client = OpenAI(
        api_key=OPENAI_API_KEY,
        base_url="https://openrouter.ai/api/v1" if is_openrouter else None,
    )
    model = "openai/gpt-4o-mini" if is_openrouter else "gpt-4o-mini"
    return client, model


def _fallback_reply(message: str) -> dict:
    lower = message.lower()
    if any(w in lower for w in ("donor", "find", "near", "match")):
        return {
            "reply": "To find blood donors: go to the Request page, enter your blood group and location, set urgency to Critical for immediate matching.",
            "suggestions": ["What blood types are compatible with mine?", "How does donor scoring work?", "What to do in a platelet emergency"],
        }
    return {
        "reply": "I'm CareCell AI, your emergency healthcare assistant. I can help you find blood donors, understand blood type compatibility, and guide you through medical emergencies.",
        "suggestions": ["Blood type compatibility guide", "What to do in a platelet emergency", "How to find nearest blood bank"],
    }


# ── Schemas ────────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    context: Optional[str] = Field(None, max_length=500)


class ChatResponse(BaseModel):
    reply: str
    suggestions: list[str] = []


class TtsRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)


class PatientData(BaseModel):
    blood_group: Optional[str] = "O+"
    bloodGroup: Optional[str] = None
    lat: Optional[float] = 19.076
    lng: Optional[float] = 72.877
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    urgency: Optional[str] = "normal"
    name: Optional[str] = "Patient"

    def resolved_blood_group(self) -> str:
        return self.bloodGroup or self.blood_group or "O+"

    def resolved_lat(self) -> float:
        return self.latitude or self.lat or 19.076

    def resolved_lng(self) -> float:
        return self.longitude or self.lng or 72.877


class MatchRequest(BaseModel):
    patient: PatientData
    donors: list[dict[str, Any]] = []


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "carecell-ai", "version": "2.0.0"}


@app.post("/ai/chat", response_model=ChatResponse)
async def ai_chat(body: ChatRequest):
    client, model = _get_openai_client()
    if not client:
        log.warning("OPENAI_API_KEY not set — using fallback response")
        fb = _fallback_reply(body.message)
        return ChatResponse(reply=fb["reply"], suggestions=fb["suggestions"])

    user_content = (
        f"Context: {body.context}\n\nUser: {body.message}" if body.context else body.message
    )
    try:
        completion = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": AI_SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            temperature=0.7,
            max_tokens=400,
            response_format={"type": "json_object"},
        )
        raw = completion.choices[0].message.content or ""
        import json as _json
        try:
            parsed = _json.loads(raw)
            reply = str(parsed.get("reply", raw))
            suggestions = parsed.get("suggestions", [])
            if not isinstance(suggestions, list):
                suggestions = []
        except _json.JSONDecodeError:
            reply = raw
            suggestions = []
        log.info("AI chat OK — lang=%s model=%s", _detect_lang(body.message), model)
        return ChatResponse(reply=reply, suggestions=suggestions[:4])
    except (OpenAIError, Exception) as exc:
        log.error("Chat error: %s", exc)
        fb = _fallback_reply(body.message)
        return ChatResponse(reply=fb["reply"], suggestions=fb["suggestions"])


@app.post("/ai/tts")
async def ai_tts(body: TtsRequest):
    if not ELEVENLABS_API_KEY:
        raise HTTPException(status_code=503, detail="ElevenLabs API key not configured")
    voice_id = _resolve_voice_id()
    try:
        res = requests.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
            headers={
                "xi-api-key": ELEVENLABS_API_KEY,
                "Content-Type": "application/json",
                "Accept": "audio/mpeg",
            },
            json={
                "text": body.text,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {
                    "stability": 0.45,
                    "similarity_boost": 0.80,
                    "style": 0.15,
                    "use_speaker_boost": True,
                },
            },
            timeout=20,
        )
        if not res.ok:
            raise HTTPException(status_code=502, detail="TTS service error")
        log.info("TTS OK — voice=%s bytes=%d", voice_id, len(res.content))
        return Response(content=res.content, media_type="audio/mpeg",
                        headers={"Cache-Control": "no-store"})
    except HTTPException:
        raise
    except Exception as exc:
        log.error("TTS error: %s", exc)
        raise HTTPException(status_code=500, detail="TTS failed")


@app.post("/match")
async def match_donors(body: MatchRequest):
    """
    ML-powered donor matching with AI explanation.

    Request:
      { "patient": { "bloodGroup": "A+", "lat": 19.076, "lng": 72.877, "urgency": "normal" },
        "donors": [...] }

    Response:
      { "top_donors": [...], "explanation": "...", "total_scored": N }
    """
    patient = body.patient
    donors = body.donors

    patient_bg = patient.resolved_blood_group()
    p_lat = patient.resolved_lat()
    p_lng = patient.resolved_lng()

    patient_dict = {
        "bloodGroup": patient_bg,
        "lat": p_lat,
        "lng": p_lng,
        "urgency": patient.urgency,
    }

    log.info(
        "Matching %d donors for %s @ (%.3f, %.3f) urgency=%s",
        len(donors), patient_bg, p_lat, p_lng, patient.urgency
    )

    # Score every donor
    scored: list[tuple[float, float, dict]] = []
    for d in donors:
        try:
            score, dist = _score_donor(d, patient_dict)
            scored.append((score, dist, d))
        except Exception as exc:
            log.warning("Skipping donor due to error: %s", exc)

    # Sort descending by score, take top 5
    scored.sort(key=lambda x: x[0], reverse=True)
    top5 = scored[:5]

    top_donors = []
    for score, dist, d in top5:
        entry = dict(d)
        entry["_matchScore"] = round(score, 2)
        entry["_distanceKm"] = round(dist, 2)
        entry["distanceKm"] = round(dist, 2)
        top_donors.append(entry)

    # AI explanation
    explanation = _generate_explanation(patient_dict, top_donors)

    log.info("Match complete — top=%d scored=%d", len(top_donors), len(scored))
    return {
        "top_donors": top_donors,
        "explanation": explanation,
        "total_scored": len(scored),
    }


def _generate_explanation(patient: dict, top_donors: list) -> str:
    """Generate an AI explanation for why these donors were selected."""
    client, model = _get_openai_client()

    if not client or not top_donors:
        return _fallback_explanation(patient, top_donors)

    donor_summary = "\n".join(
        f"  {i+1}. {d.get('name', 'Donor')} — {d.get('bloodGroup', d.get('blood_group', '?'))} — "
        f"{d.get('_distanceKm', '?')} km away — score {d.get('_matchScore', '?')}"
        for i, d in enumerate(top_donors)
    )

    prompt = (
        f"A cancer patient urgently needs {patient['bloodGroup']} blood "
        f"(urgency: {patient.get('urgency', 'normal')}).\n\n"
        f"Top matched donors:\n{donor_summary}\n\n"
        "Write a concise 2-sentence explanation of why these donors are the best matches, "
        "mentioning blood compatibility and proximity. Be warm and reassuring."
    )

    try:
        completion = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.6,
            max_tokens=200,
        )
        return completion.choices[0].message.content or _fallback_explanation(patient, top_donors)
    except Exception as exc:
        log.warning("Explanation generation failed: %s", exc)
        return _fallback_explanation(patient, top_donors)


def _fallback_explanation(patient: dict, top_donors: list) -> str:
    count = len(top_donors)
    bg = patient.get("bloodGroup", "the required")
    if count == 0:
        return f"No compatible {bg} donors are currently available nearby. We recommend contacting local blood banks directly."
    closest = min(top_donors, key=lambda d: d.get("_distanceKm", 999))
    dist = closest.get("_distanceKm", "?")
    return (
        f"Found {count} compatible {bg} donor{'s' if count > 1 else ''} ranked by "
        f"blood compatibility and proximity. The closest is {dist} km away. "
        "Donors with the highest reliability scores and recent donation history are prioritised."
    )


# ── Entry ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    log.info("Starting CareCell AI Service on port %d", port)
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
