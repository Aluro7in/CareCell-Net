import { useState, useEffect, useRef } from "react";
import {
  ShieldAlert, AlertTriangle, Phone, MapPin, CheckCircle2,
  HeartPulse, Mic, MicOff, Volume2, Loader2, Brain,
  Navigation, Star, Users,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { matchDonors, type MatchResult, type MatchedDonor } from "@/api/match";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
type BloodGroup = typeof bloodGroups[number];

const SpeechRecognitionAPI =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

function SpeakingWave() {
  return (
    <div className="flex items-end gap-[3px] h-4">
      {[0, 0.15, 0.3, 0.15, 0].map((delay, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-primary"
          animate={{ height: ["4px", "14px", "4px"] }}
          transition={{ duration: 0.7, repeat: Infinity, delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

async function playTTS(text: string): Promise<HTMLAudioElement | null> {
  try {
    const res = await fetch(`${BASE}/api/ai/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("carecell_token") ?? ""}` },
      body: JSON.stringify({ text: text.slice(0, 500) }),
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    const audio = new Audio(URL.createObjectURL(blob));
    audio.play();
    return audio;
  } catch {
    return null;
  }
}

function ScoreBadge({ score }: { score: number }) {
  const pct = Math.min(100, Math.round(score));
  const color =
    pct >= 70 ? "text-green-400 border-green-500/40 bg-green-500/10" :
    pct >= 45 ? "text-yellow-400 border-yellow-500/40 bg-yellow-500/10" :
                "text-red-400 border-red-500/40 bg-red-500/10";
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${color}`}>
      {pct}%
    </span>
  );
}

function DonorCard({ donor, rank }: { donor: MatchedDonor; rank: number }) {
  const dist = donor.distanceKm ?? donor._distanceKm;
  const score = donor._matchScore ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.07 }}
      className="bg-card p-4 rounded-3xl border border-border flex items-center justify-between gap-3 shadow-sm"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative shrink-0">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
            <span className="font-bold text-primary text-xs">{donor.bloodGroup}</span>
          </div>
          {rank === 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
              <Star className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-white text-sm leading-tight truncate">{donor.name}</h4>
            <ScoreBadge score={score} />
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            {dist != null && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-primary" />
                {dist.toFixed(1)} km
              </span>
            )}
            {donor.available !== false && (
              <span className="flex items-center gap-1 text-green-400">
                <CheckCircle2 className="w-3 h-3" /> Available
              </span>
            )}
          </div>
        </div>
      </div>
      {donor.phone && (
        <a
          href={`tel:${donor.phone}`}
          className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors shrink-0"
        >
          <Phone className="w-4 h-4" />
        </a>
      )}
    </motion.div>
  );
}

export default function PatientPage() {
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>("O+");
  const [urgency, setUrgency] = useState<"normal" | "critical">("normal");
  const [location, setLocation] = useState<{ lat: number; lng: number; label: string }>({
    lat: 19.076, lng: 72.877, label: "Detecting location…",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLocation({ lat, lng, label: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
          .then((r) => r.json())
          .then((data) => {
            const city =
              data.address?.city ||
              data.address?.town ||
              data.address?.district ||
              "Your location";
            const state = data.address?.state ?? "";
            setLocation({ lat, lng, label: state ? `${city}, ${state}` : city });
          })
          .catch(() => setLocation({ lat, lng, label: `${lat.toFixed(4)}, ${lng.toFixed(4)}` }));
      },
      () => setLocation({ lat: 19.076, lng: 72.877, label: "Mumbai, Maharashtra" }),
      { timeout: 8000 },
    );
  }, []);

  useEffect(() => {
    sessionStorage.setItem(
      "carecell_match_donors",
      JSON.stringify(matchResult?.topDonors ?? []),
    );
  }, [matchResult]);

  const startMic = () => {
    if (!SpeechRecognitionAPI) {
      toast({ title: "Mic not supported", description: "Please type instead.", variant: "destructive" });
      return;
    }
    const rec = new SpeechRecognitionAPI();
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onresult = (e: any) => {
      const transcript: string = e.results[0][0].transcript.trim().toUpperCase();
      const found = bloodGroups.find((bg) => transcript.includes(bg));
      if (found) {
        setBloodGroup(found);
        toast({ title: `Blood group set: ${found}`, description: "Detected from voice." });
      } else if (transcript.length > 1) {
        setName(transcript.slice(0, 60));
        toast({ title: "Name captured", description: transcript.slice(0, 60) });
      }
    };
    rec.onerror = () => { setIsListening(false); };
    recognitionRef.current = rec;
    rec.start();
  };

  const stopMic = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Name required", description: "Enter the patient's name.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const result = await matchDonors({
        bloodGroup,
        lat: location.lat,
        lng: location.lng,
        urgency,
        name: name.trim(),
      });

      setMatchResult(result);

      if (result.topDonors.length > 0 && result.explanation) {
        setTimeout(async () => {
          setIsSpeaking(true);
          const audio = await playTTS(result.explanation);
          if (audio) {
            currentAudioRef.current = audio;
            audio.onended = () => setIsSpeaking(false);
          } else {
            setIsSpeaking(false);
          }
        }, 600);
      }

      toast({
        title: urgency === "critical" ? "CRITICAL ALERT SENT" : "Donors Found",
        description: `${result.topDonors.length} compatible donor${result.topDonors.length !== 1 ? "s" : ""} matched.`,
        variant: urgency === "critical" ? "destructive" : "default",
      });
    } catch (err: any) {
      toast({
        title: "Match failed",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeakExplanation = async () => {
    if (isSpeaking) {
      currentAudioRef.current?.pause();
      setIsSpeaking(false);
      return;
    }
    if (!matchResult?.explanation) return;
    setIsSpeaking(true);
    const audio = await playTTS(matchResult.explanation);
    if (audio) {
      currentAudioRef.current = audio;
      audio.onended = () => setIsSpeaking(false);
    } else {
      setIsSpeaking(false);
    }
  };

  return (
    <div className="p-5 h-full relative overflow-y-auto pb-24">
      <AnimatePresence mode="wait">
        {matchResult ? (
          /* ── Results screen ── */
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="space-y-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-display font-bold text-white">Match Results</h2>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {matchResult.totalScored} donors scored · {matchResult.topDonors.length} best matches
                </p>
              </div>
              <button
                onClick={() => setMatchResult(null)}
                className="text-xs text-muted-foreground hover:text-white border border-border px-3 py-1.5 rounded-xl transition-colors"
              >
                New Search
              </button>
            </div>

            {/* Summary card */}
            <div className={`rounded-3xl p-5 border relative overflow-hidden ${
              urgency === "critical"
                ? "bg-red-500/5 border-red-500/20"
                : "bg-green-500/5 border-green-500/20"
            }`}>
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${
                  urgency === "critical" ? "bg-red-500/20" : "bg-green-500/20"
                }`}>
                  {urgency === "critical"
                    ? <AlertTriangle className="w-7 h-7 text-red-400" />
                    : <CheckCircle2 className="w-7 h-7 text-green-400" />
                  }
                </div>
                <div>
                  <div className={`text-sm font-bold ${urgency === "critical" ? "text-red-400" : "text-green-400"}`}>
                    {urgency === "critical" ? "CRITICAL ALERT ACTIVE" : "Request Active"}
                  </div>
                  <div className="text-white font-semibold mt-0.5">
                    {bloodGroup} · {location.label}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Explanation */}
            {matchResult.explanation && (
              <div className="bg-card border border-border rounded-3xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AI Explanation</span>
                  </div>
                  <button
                    onClick={handleSpeakExplanation}
                    className="flex items-center gap-1.5 text-xs text-primary hover:text-white transition-colors"
                  >
                    {isSpeaking ? (
                      <><SpeakingWave /><span className="ml-1">Speaking…</span></>
                    ) : (
                      <><Volume2 className="w-3.5 h-3.5" /><span>Listen</span></>
                    )}
                  </button>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">{matchResult.explanation}</p>
              </div>
            )}

            {/* Top Donors */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-primary" /> Top Matched Donors
              </h3>
              {matchResult.topDonors.length > 0 ? (
                <div className="grid gap-3">
                  {matchResult.topDonors.map((donor, i) => (
                    <DonorCard key={donor.id ?? i} donor={donor} rank={i} />
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 border border-dashed border-border rounded-3xl text-muted-foreground text-sm">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  No compatible donors found in the area. Try broadening your search.
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          /* ── Form screen ── */
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-2">
              <h1 className="text-2xl font-display font-bold text-white">Emergency Request</h1>
              <p className="text-muted-foreground text-sm mt-1">Find nearby compatible donors instantly.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Urgency */}
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-card border border-border rounded-2xl shadow-sm">
                <button type="button" onClick={() => setUrgency("normal")}
                  className={`py-3 rounded-xl text-sm font-semibold transition-all ${urgency === "normal" ? "bg-secondary text-white shadow-sm" : "text-muted-foreground hover:text-white"}`}
                >
                  Normal
                </button>
                <button type="button" onClick={() => setUrgency("critical")}
                  className={`py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${urgency === "critical" ? "bg-red-500/20 text-red-500 border border-red-500/30" : "text-muted-foreground hover:text-white"}`}
                >
                  <AlertTriangle className="w-4 h-4" /> CRITICAL
                </button>
              </div>

              {/* Patient Name + Mic */}
              <div className="relative">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Patient Name *"
                  className="w-full pl-5 pr-14 py-4 rounded-2xl border border-border bg-card/50 text-white placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/50 focus:bg-card outline-none transition-all text-sm shadow-sm"
                />
                <button
                  type="button"
                  onMouseDown={startMic}
                  onMouseUp={stopMic}
                  onTouchStart={startMic}
                  onTouchEnd={stopMic}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    isListening ? "bg-red-500 text-white animate-pulse" : "bg-secondary text-muted-foreground hover:text-white"
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                {isListening && (
                  <p className="text-xs text-primary mt-1.5 ml-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    Listening… say blood group or name
                  </p>
                )}
              </div>

              {/* Blood Group */}
              <div className="space-y-3">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider ml-1">
                  Blood Group Needed
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {bloodGroups.map((bg) => (
                    <button key={bg} type="button" onClick={() => setBloodGroup(bg)}
                      className={`py-3 rounded-2xl text-sm font-bold transition-all border ${
                        bloodGroup === bg
                          ? "bg-primary border-primary text-white shadow-lg shadow-primary/30 scale-[1.02]"
                          : "bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-white"
                      }`}
                    >
                      {bg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div className="relative">
                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                  <Navigation className={`w-4 h-4 ${location.label.includes("Detecting") ? "text-yellow-400 animate-pulse" : "text-primary"}`} />
                </div>
                <div className="w-full pl-12 pr-5 py-4 rounded-2xl border border-border bg-card/50 text-white outline-none text-sm opacity-80 shadow-sm">
                  {location.label}
                </div>
                {location.label.includes("Detecting") && (
                  <p className="text-xs text-muted-foreground mt-1.5 ml-1">Auto-detecting your location…</p>
                )}
              </div>

              {/* Submit */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={isLoading}
                className={`w-full py-4 rounded-2xl font-bold text-white shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2 ${
                  urgency === "critical"
                    ? "bg-gradient-to-r from-red-600 to-rose-600 shadow-red-500/30"
                    : "bg-gradient-to-r from-primary to-primary/80 shadow-primary/30"
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Matching donors with AI…
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4" />
                    {urgency === "critical" ? "FIND DONORS NOW" : "Find Best Matches"}
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
