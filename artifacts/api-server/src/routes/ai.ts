import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { z } from "zod";

const router: IRouter = Router();

const SYSTEM_PROMPT = `You are CareCell AI, an emergency healthcare assistant specializing in blood donation, platelet donation, and cancer patient support in India.

Your role is to:
1. Help cancer patients find compatible blood and platelet donors
2. Explain blood type compatibility clearly
3. Guide users through medical emergencies step-by-step
4. Provide information about blood banks and hospitals
5. Educate about platelet donation (critical for chemotherapy patients)

Blood compatibility guide:
- O- is universal donor (can donate to all)
- AB+ is universal recipient (can receive from all)
- A+ can receive from: A+, A-, O+, O-
- B+ can receive from: B+, B-, O+, O-
- O+ can receive from: O+, O-
- AB- can receive from: A-, B-, AB-, O-

In emergencies: always advise calling matched donors directly, contact hospitals with blood banks, and use the CareCell app's emergency request feature.

Keep responses concise, warm, and actionable. Always end with 2-3 relevant follow-up suggestions.

IMPORTANT: Return your response as valid JSON in this exact format:
{
  "reply": "your response text here",
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
}`;

const chatInputSchema = z.object({
  message: z.string().min(1, "Message is required").max(500, "Message too long"),
  context: z.string().optional(),
});

const FALLBACK_RESPONSES: Record<string, { reply: string; suggestions: string[] }> = {
  donor: {
    reply: "To find blood donors: 1) Go to the Request page, 2) Enter your blood group and location, 3) Set urgency to 'Critical' for immediate matching. Our AI instantly shows the top 5 compatible donors sorted by proximity and availability.",
    suggestions: ["What blood types are compatible with mine?", "How does donor scoring work?", "What to do in a platelet emergency"],
  },
  emergency: {
    reply: "For a blood emergency:\n1. Submit a CRITICAL request on the Request page immediately\n2. Call matched donors directly — phone numbers are shown\n3. Contact nearby hospitals with blood banks\n4. Platelet donors must not have donated in the last 90 days — our system handles this automatically",
    suggestions: ["Find compatible donors now", "Locate blood bank hospitals", "Blood type compatibility guide"],
  },
  platelet: {
    reply: "Platelets are critical for cancer patients undergoing chemotherapy:\n• Platelets expire in 5 days after donation\n• Cancer patients often need transfusions weekly\n• CareCell uses the same blood compatibility algorithm for platelet matching\n• Always call your matched donor immediately in emergencies",
    suggestions: ["Register as platelet donor", "Compatible blood types for platelets", "Create emergency request"],
  },
  default: {
    reply: "I'm CareCell AI, your emergency healthcare assistant. I can help you find blood donors, understand blood type compatibility, locate nearby hospitals, and guide you through medical emergencies.",
    suggestions: ["Blood type compatibility guide", "What to do in a platelet emergency", "How to find nearest blood bank"],
  },
};

function getFallback(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("donor") || lower.includes("find") || lower.includes("near")) return FALLBACK_RESPONSES.donor;
  if (lower.includes("emergency") || lower.includes("urgent") || lower.includes("critical")) return FALLBACK_RESPONSES.emergency;
  if (lower.includes("platelet")) return FALLBACK_RESPONSES.platelet;
  return FALLBACK_RESPONSES.default;
}

router.post("/ai/chat", async (req, res) => {
  const parsed = chatInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { message, context } = parsed.data;

  if (!process.env.OPENAI_API_KEY) {
    req.log.warn("OPENAI_API_KEY not set, using fallback responses");
    return res.json(getFallback(message));
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY!;
    const isOpenRouter = apiKey.startsWith("sk-or-");

    const openai = new OpenAI({
      apiKey,
      ...(isOpenRouter && { baseURL: "https://openrouter.ai/api/v1" }),
    });

    const model = isOpenRouter ? "openai/gpt-4o-mini" : "gpt-4o-mini";

    const userContent = context
      ? `Context: ${context}\n\nUser question: ${message}`
      : message;

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      temperature: 0.7,
      max_tokens: 400,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("Empty OpenAI response");

    const parsed = JSON.parse(content);
    const reply = typeof parsed.reply === "string" ? parsed.reply : content;
    const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 4) : [];

    res.json({ reply, suggestions });
  } catch (err) {
    req.log.error({ err }, "OpenAI chat failed, using fallback");
    res.json(getFallback(message));
  }
});

const ttsSchema = z.object({
  text: z.string().min(1).max(1000),
});

// Preferred voice names in priority order (premade voices available on free tier)
const PREFERRED_VOICE_NAMES = ["aria", "jessica", "sarah", "matilda", "laura", "alice", "lily", "charlotte"];
let cachedVoiceId: string | null = null;

async function resolveVoiceId(apiKey: string, log: any): Promise<string> {
  if (cachedVoiceId) return cachedVoiceId;
  try {
    const res = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": apiKey },
    });
    if (!res.ok) return "21m00Tcm4TlvDq8ikWAM";
    const data: any = await res.json();
    const voices: Array<{ voice_id: string; name: string }> = data.voices ?? [];
    if (!voices.length) return "21m00Tcm4TlvDq8ikWAM";
    const preferred = voices.find((v) => PREFERRED_VOICE_NAMES.includes(v.name.toLowerCase()));
    cachedVoiceId = (preferred ?? voices[0]).voice_id;
    log.info({ voice: (preferred ?? voices[0]).name, id: cachedVoiceId }, "ElevenLabs voice resolved");
    return cachedVoiceId;
  } catch (err) {
    log.warn({ err }, "Could not resolve ElevenLabs voice, using fallback");
    return "21m00Tcm4TlvDq8ikWAM";
  }
}

router.post("/ai/tts", async (req, res) => {
  const parsed = ttsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "text is required (max 1000 chars)" });
  }

  const { text } = parsed.data;
  const apiKey = process.env["ELEVENLABS_API_KEY"];

  if (!apiKey) {
    return res.status(503).json({ error: "ElevenLabs API key not configured" });
  }

  try {
    const voiceId = await resolveVoiceId(apiKey, req.log);

    const elevenRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.80,
            style: 0.15,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!elevenRes.ok) {
      const err = await elevenRes.text();
      req.log.error({ status: elevenRes.status, err }, "ElevenLabs TTS failed");
      return res.status(502).json({ error: "TTS service error" });
    }

    const audioBuffer = await elevenRes.arrayBuffer();
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    res.send(Buffer.from(audioBuffer));
  } catch (err) {
    req.log.error({ err }, "ElevenLabs TTS exception");
    res.status(500).json({ error: "TTS failed" });
  }
});

export default router;
