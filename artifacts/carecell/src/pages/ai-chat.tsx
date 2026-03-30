import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Bot, User, Sparkles, Mic, MicOff,
  Volume2, VolumeX, Loader2, AudioLines,
} from "lucide-react";
import { useAiAssistant } from "@/hooks/use-ai-assistant";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Message = {
  id: string;
  role: "user" | "ai";
  content: string;
  suggestions?: string[];
};

function detectLang(text: string): string {
  return /[\u0900-\u097F]/.test(text) ? "hi-IN" : "en-IN";
}

const SpeechRecognitionAPI =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

async function playElevenLabs(text: string): Promise<HTMLAudioElement | null> {
  try {
    const res = await fetch(`${BASE}/api/ai/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
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

function SpeakingWave() {
  return (
    <div className="flex items-end gap-[3px] h-4">
      {[0, 0.15, 0.3, 0.15, 0].map((delay, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-blue-400"
          animate={{ height: ["4px", "14px", "4px"] }}
          transition={{ duration: 0.7, repeat: Infinity, delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

export default function AiChat() {
  const [messages, setMessages] = useState<Message[]>([{
    id: "1",
    role: "ai",
    content: "Hi! I'm CareCell AI. I can answer questions about blood donation, cancer protocols, or find nearby hospitals — in Hindi or English. How can I help you today?",
    suggestions: [
      "Can I donate platelets?",
      "Compatible blood types for O-",
      "Find nearest blood bank",
    ],
  }]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [ttsLoadingId, setTtsLoadingId] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const aiMutation = useAiAssistant();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, aiMutation.isPending]);

  const stopAudio = useCallback(() => {
    currentAudioRef.current?.pause();
    currentAudioRef.current = null;
    setSpeakingId(null);
    setTtsLoadingId(null);
  }, []);

  const speakMessage = useCallback(async (msgId: string, text: string) => {
    if (speakingId === msgId) {
      stopAudio();
      return;
    }
    stopAudio();
    setTtsLoadingId(msgId);
    const audio = await playElevenLabs(text);
    if (!audio) {
      setTtsLoadingId(null);
      return;
    }
    currentAudioRef.current = audio;
    setSpeakingId(msgId);
    setTtsLoadingId(null);
    audio.onended = () => {
      setSpeakingId(null);
      currentAudioRef.current = null;
    };
    audio.onerror = () => {
      setSpeakingId(null);
      setTtsLoadingId(null);
      currentAudioRef.current = null;
    };
  }, [speakingId, stopAudio]);

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || aiMutation.isPending) return;
    stopAudio();

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const response = await aiMutation.mutateAsync({ data: { message: text } });
      const msgId = (Date.now() + 1).toString();
      const aiMsg: Message = {
        id: msgId,
        role: "ai",
        content: response.reply,
        suggestions: response.suggestions,
      };
      setMessages((prev) => [...prev, aiMsg]);

      if (voiceEnabled) {
        setTtsLoadingId(msgId);
        const audio = await playElevenLabs(response.reply);
        if (audio) {
          currentAudioRef.current = audio;
          setSpeakingId(msgId);
          setTtsLoadingId(null);
          audio.onended = () => { setSpeakingId(null); currentAudioRef.current = null; };
          audio.onerror = () => { setSpeakingId(null); setTtsLoadingId(null); currentAudioRef.current = null; };
        } else {
          setTtsLoadingId(null);
        }
      }
    } catch {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: "Sorry, I'm having trouble connecting. Please try again.",
      }]);
    }
  }, [aiMutation, voiceEnabled, stopAudio]);

  const toggleListening = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      alert("Voice input is not supported in this browser. Please try Chrome.");
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = detectLang(input) === "hi-IN" ? "hi-IN" : "en-IN";

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      handleSend(transcript);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  }, [isListening, input, handleSend]);

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border bg-background/90 backdrop-blur-md z-10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            {(speakingId !== null) && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background flex items-center justify-center">
                <SpeakingWave />
              </div>
            )}
          </div>
          <div>
            <h2 className="font-display font-bold text-foreground text-lg leading-tight">CareCell AI</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
              {speakingId ? "Speaking…" : "Online · Hindi & English"}
            </p>
          </div>
        </div>

        {/* Voice toggle */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            const next = !voiceEnabled;
            setVoiceEnabled(next);
            if (!next) stopAudio();
          }}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center border transition-colors",
            voiceEnabled
              ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
              : "bg-card border-border text-muted-foreground hover:text-foreground"
          )}
          title={voiceEnabled ? "Mute voice responses" : "Enable ElevenLabs voice responses"}
        >
          {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </motion.button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-5 pb-36 hide-scrollbar scroll-smooth">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                msg.role === "user"
                  ? "bg-primary text-white shadow-md shadow-primary/30"
                  : "bg-secondary text-foreground border border-border shadow-sm"
              )}>
                {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className={cn(
                "flex flex-col max-w-[85%]",
                msg.role === "user" ? "items-end" : "items-start"
              )}>
                <div className={cn(
                  "px-4 py-3.5 text-sm relative group",
                  msg.role === "user"
                    ? "bg-primary text-white rounded-2xl rounded-tr-sm shadow-md shadow-primary/20"
                    : "bg-card border border-border text-foreground rounded-2xl rounded-tl-sm shadow-sm"
                )}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                  {/* Per-message speak button for AI messages */}
                  {msg.role === "ai" && (
                    <button
                      onClick={() => speakMessage(msg.id, msg.content)}
                      disabled={ttsLoadingId !== null && ttsLoadingId !== msg.id}
                      className={cn(
                        "absolute -bottom-3 right-3 w-6 h-6 rounded-full flex items-center justify-center border transition-all opacity-0 group-hover:opacity-100",
                        speakingId === msg.id
                          ? "bg-blue-500 border-blue-400 text-white opacity-100"
                          : ttsLoadingId === msg.id
                          ? "bg-card border-border text-blue-400 opacity-100"
                          : "bg-card border-border text-muted-foreground hover:text-blue-400 hover:border-blue-400/50"
                      )}
                      title={speakingId === msg.id ? "Stop speaking" : "Read aloud"}
                    >
                      {ttsLoadingId === msg.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : speakingId === msg.id
                        ? <AudioLines className="w-3 h-3" />
                        : <Volume2 className="w-3 h-3" />}
                    </button>
                  )}
                </div>

                {/* Suggestions */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4 pl-1">
                    {msg.suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(s)}
                        disabled={aiMutation.isPending}
                        className="text-[11px] font-medium bg-secondary/80 text-foreground px-3.5 py-2 rounded-full border border-border hover:bg-primary hover:border-primary hover:text-white transition-colors shadow-sm backdrop-blur-sm disabled:opacity-40"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {/* Typing indicator */}
          {aiMutation.isPending && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-secondary border border-border text-foreground flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-card border border-border px-4 py-4 rounded-2xl rounded-tl-sm flex gap-1.5 items-center h-[44px]">
                {[0, 0.2, 0.4].map((d, i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ repeat: Infinity, duration: 1, delay: d }}
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/95 to-transparent pt-8 pb-[84px]">
        {/* Listening indicator */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="flex items-center justify-center gap-2 mb-3"
            >
              <div className="flex items-end gap-[3px] h-4">
                {[0, 0.1, 0.2, 0.1, 0].map((delay, i) => (
                  <motion.div
                    key={i}
                    className="w-[3px] rounded-full bg-primary"
                    animate={{ height: ["3px", "16px", "3px"] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay, ease: "easeInOut" }}
                  />
                ))}
              </div>
              <span className="text-xs text-primary font-semibold">Listening… speak now</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
          className="relative flex items-center bg-card rounded-full border border-border shadow-xl p-1.5 gap-1"
        >
          {/* Mic button */}
          {SpeechRecognitionAPI && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.85 }}
              onClick={toggleListening}
              className={cn(
                "w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-colors ml-1",
                isListening
                  ? "bg-primary text-white shadow-lg shadow-primary/40"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
              title={isListening ? "Stop listening" : "Speak (Hindi / English)"}
            >
              <AnimatePresence mode="wait" initial={false}>
                {isListening ? (
                  <motion.div key="off" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }}>
                    <MicOff className="w-4 h-4" />
                  </motion.div>
                ) : (
                  <motion.div key="on" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }}>
                    <Mic className="w-4 h-4" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          )}

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isListening ? "Listening…" : "Message in Hindi or English…"}
            disabled={aiMutation.isPending || isListening}
            className="flex-1 bg-transparent px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />

          <motion.button
            whileTap={{ scale: 0.9 }}
            type="submit"
            disabled={!input.trim() || aiMutation.isPending}
            className="w-10 h-10 shrink-0 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:bg-secondary disabled:text-muted-foreground transition-colors mr-1 shadow-sm"
          >
            {aiMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
          </motion.button>
        </form>

        {/* ElevenLabs badge */}
        <p className="text-center text-[10px] text-muted-foreground/50 mt-2 flex items-center justify-center gap-1">
          <Volume2 className="w-2.5 h-2.5" />
          Voice powered by ElevenLabs · Hindi &amp; English
        </p>
      </div>
    </div>
  );
}
