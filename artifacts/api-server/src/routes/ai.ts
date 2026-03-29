import { Router, type IRouter } from "express";

const router: IRouter = Router();

const KNOWLEDGE_BASE: Record<string, { reply: string; suggestions: string[] }> = {
  default: {
    reply: "I'm CareCell AI, your emergency healthcare assistant. I can help you find blood donors, understand blood type compatibility, locate nearby hospitals, and guide you through medical emergencies.",
    suggestions: [
      "Blood type compatibility guide",
      "What to do in a platelet emergency",
      "How to find nearest blood bank",
      "Cancer and blood transfusion needs",
    ],
  },
  donor: {
    reply: "To find blood donors: 1) Go to the Patient page, 2) Enter your blood group and location, 3) Set urgency to 'Critical' for immediate matches, 4) Submit — our AI will instantly show the top 5 compatible donors sorted by proximity and availability.",
    suggestions: ["What blood types are compatible?", "How does donor matching work?", "Register as a donor"],
  },
  emergency: {
    reply: "For a blood/platelet emergency: 1) Immediately submit a request on the Patient page with urgency set to 'Critical'. 2) Call matched donors directly. 3) Contact nearby hospitals with blood banks. 4) Platelet donors must donate frequently — our system excludes donors who donated in the last 90 days.",
    suggestions: ["Find donors now", "Locate blood bank hospitals", "Blood type compatibility"],
  },
  compatibility: {
    reply: "Blood type compatibility:\n• O- is universal donor (can give to all)\n• AB+ is universal recipient (can receive from all)\n• For transfusions: A+ receives from A+, A-, O+, O-\n• B+ receives from B+, B-, O+, O-\n• O+ receives from O+, O-\n• Platelet donors: same or compatible type preferred",
    suggestions: ["Emergency protocol", "Find compatible donors", "Hospital blood banks"],
  },
  platelet: {
    reply: "Platelets are critical for cancer patients undergoing chemotherapy. Key facts:\n• Platelets must be used within 5 days of donation\n• Platelet apheresis donors can donate more frequently\n• Cancer patients often need platelets weekly\n• CareCell matches platelet donors using the same blood compatibility algorithm\n• Always call your matched donor immediately in emergencies",
    suggestions: ["Register platelet donor", "Blood type for platelets", "Emergency request"],
  },
};

function getResponse(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("donor") || lower.includes("find") || lower.includes("near")) return KNOWLEDGE_BASE.donor;
  if (lower.includes("emergency") || lower.includes("urgent") || lower.includes("critical")) return KNOWLEDGE_BASE.emergency;
  if (lower.includes("compatib") || lower.includes("blood type") || lower.includes("blood group")) return KNOWLEDGE_BASE.compatibility;
  if (lower.includes("platelet")) return KNOWLEDGE_BASE.platelet;
  return KNOWLEDGE_BASE.default;
}

router.post("/ai/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }
    const response = getResponse(message);
    res.json(response);
  } catch (err) {
    req.log.error({ err }, "AI chat failed");
    res.status(500).json({ error: "AI assistant unavailable" });
  }
});

export default router;
