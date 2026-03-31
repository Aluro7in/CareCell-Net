"""
CareCell Network — FastAPI AI Service
Endpoints: POST /ai/chat  |  POST /ai/tts
"""

import os
import logging
from typing import Optional

import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel, Field
from openai import OpenAI, OpenAIError

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
    description="AI chat and Text-to-Speech for CareCell Network",
    version="1.0.0",
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

SYSTEM_PROMPT = (
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
FALLBACK_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"  # Rachel (library, may require paid plan)

_cached_voice_id: Optional[str] = None


# ── Schemas ────────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    context: Optional[str] = Field(None, max_length=500)


class ChatResponse(BaseModel):
    reply: str
    suggestions: list[str] = []


class TtsRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)


# ── Helpers ────────────────────────────────────────────────────────────────────
def _resolve_voice_id() -> str:
    """Fetch the first available preferred voice from ElevenLabs (cached)."""
    global _cached_voice_id
    if _cached_voice_id:
        return _cached_voice_id

    if not ELEVENLABS_API_KEY:
        return FALLBACK_VOICE_ID

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
            log.info("ElevenLabs voice resolved: %s (%s)", voice["name"], _cached_voice_id)
            return _cached_voice_id
    except Exception as exc:
        log.warning("Could not resolve ElevenLabs voice: %s", exc)

    return FALLBACK_VOICE_ID


def _detect_lang(text: str) -> str:
    """Return 'hindi' if the text contains Devanagari characters, else 'english'."""
    return "hindi" if any("\u0900" <= ch <= "\u097f" for ch in text) else "english"


def _fallback_reply(message: str) -> ChatResponse:
    """Return a sensible offline response when the AI API is unavailable."""
    lower = message.lower()
    if any(w in lower for w in ("donor", "find", "near")):
        return ChatResponse(
            reply=(
                "To find blood donors: go to the Request page, enter your blood group "
                "and location, set urgency to Critical for immediate matching."
            ),
            suggestions=[
                "What blood types are compatible with mine?",
                "How does donor scoring work?",
                "What to do in a platelet emergency",
            ],
        )
    if any(w in lower for w in ("emergency", "urgent", "critical")):
        return ChatResponse(
            reply=(
                "For a blood emergency:\n"
                "1. Submit a CRITICAL request on the Request page immediately.\n"
                "2. Call matched donors directly.\n"
                "3. Contact nearby hospitals with blood banks."
            ),
            suggestions=[
                "Find compatible donors now",
                "Locate blood bank hospitals",
                "Blood type compatibility guide",
            ],
        )
    return ChatResponse(
        reply=(
            "I'm CareCell AI, your emergency healthcare assistant. I can help you "
            "find blood donors, understand blood type compatibility, and guide you "
            "through medical emergencies."
        ),
        suggestions=[
            "Blood type compatibility guide",
            "What to do in a platelet emergency",
            "How to find nearest blood bank",
        ],
    )


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "carecell-ai"}


@app.post("/ai/chat", response_model=ChatResponse)
async def ai_chat(body: ChatRequest):
    """
    Send a message to the AI and receive a structured reply with suggestions.
    Supports Hindi and English; replies in the same language as the user.
    """
    if not OPENAI_API_KEY:
        log.warning("OPENAI_API_KEY not set — using fallback response")
        return _fallback_reply(body.message)

    is_openrouter = OPENAI_API_KEY.startswith("sk-or-")
    client = OpenAI(
        api_key=OPENAI_API_KEY,
        base_url="https://openrouter.ai/api/v1" if is_openrouter else None,
    )
    model = "openai/gpt-4o-mini" if is_openrouter else "gpt-4o-mini"

    user_content = (
        f"Context: {body.context}\n\nUser: {body.message}"
        if body.context
        else body.message
    )

    try:
        completion = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
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

    except OpenAIError as exc:
        log.error("OpenAI error: %s", exc)
        return _fallback_reply(body.message)
    except Exception as exc:
        log.error("Unexpected error in /ai/chat: %s", exc)
        return _fallback_reply(body.message)


@app.post("/ai/tts")
async def ai_tts(body: TtsRequest):
    """
    Convert text to speech using ElevenLabs eleven_multilingual_v2.
    Returns audio/mpeg binary.
    Supports Hindi and English automatically via the multilingual model.
    """
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
            detail = res.text[:300]
            log.error("ElevenLabs TTS failed %d: %s", res.status_code, detail)
            raise HTTPException(status_code=502, detail="TTS service error")

        log.info(
            "TTS OK — voice=%s bytes=%d lang=%s",
            voice_id,
            len(res.content),
            _detect_lang(body.text),
        )

        return Response(
            content=res.content,
            media_type="audio/mpeg",
            headers={"Cache-Control": "no-store"},
        )

    except HTTPException:
        raise
    except requests.RequestException as exc:
        log.error("Network error calling ElevenLabs: %s", exc)
        raise HTTPException(status_code=502, detail="TTS network error")
    except Exception as exc:
        log.error("Unexpected TTS error: %s", exc)
        raise HTTPException(status_code=500, detail="TTS failed")


# ── Entry ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    log.info("Starting CareCell AI Service on port %d", port)
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
