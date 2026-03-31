# CareCell AI Service (FastAPI)

A lightweight Python microservice handling AI chat and Text-to-Speech for the CareCell Network.

## Endpoints

### `GET /health`
Returns service status.

### `POST /ai/chat`
Send a message and receive an AI response.

**Request:**
```json
{ "message": "Can I donate blood?", "context": "optional extra context" }
```

**Response:**
```json
{
  "reply": "Yes, you can donate blood if...",
  "suggestions": ["Who can donate platelets?", "Find nearby blood bank"]
}
```

### `POST /ai/tts`
Convert text to speech (ElevenLabs `eleven_multilingual_v2`).

**Request:**
```json
{ "text": "Text to speak aloud" }
```

**Response:** `audio/mpeg` binary stream

## Environment Variables

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI or OpenRouter key (prefix `sk-or-` = OpenRouter) |
| `ELEVENLABS_API_KEY` | ElevenLabs API key |
| `PORT` | Port to listen on (default: 8000) |

## Run Locally

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Features

- Auto-detects Hindi vs English from message content
- Replies in the same language as the user
- Dynamically selects the best available ElevenLabs voice (free-tier compatible)
- Graceful fallback responses when AI API is unavailable
- Clean JSON error responses on all failure paths
