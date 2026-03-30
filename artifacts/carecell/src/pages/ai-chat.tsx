import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Sparkles, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { useAiAssistant } from "@/hooks/use-ai-assistant";
import { motion, AnimatePresence } from "framer-motion";

type Message = {
  id: string;
  role: 'user' | 'ai';
  content: string;
  suggestions?: string[];
};

function detectLang(text: string): string {
  return /[\u0900-\u097F]/.test(text) ? "hi-IN" : "en-IN";
}

function speak(text: string, lang: string) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.95;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

const SpeechRecognitionAPI =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export default function AiChat() {
  const [messages, setMessages] = useState<Message[]>([{
    id: '1',
    role: 'ai',
    content: "Hi! I'm CareCell AI. I can answer questions about blood donation, cancer protocols, or find nearby hospitals in Hindi or English. How can I help?",
    suggestions: [
      "Can I donate platelets?",
      "Compatible blood types for O-",
      "Find nearest blood bank",
    ]
  }]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const recognitionRef = useRef<any>(null);
  const aiMutation = useAiAssistant();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, aiMutation.isPending]);

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || aiMutation.isPending) return;

    const lang = detectLang(text);
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    try {
      const response = await aiMutation.mutateAsync({ data: { message: text } });
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: response.reply,
        suggestions: response.suggestions,
      };
      setMessages(prev => [...prev, aiMsg]);

      if (voiceEnabled) {
        const replyLang = detectLang(response.reply);
        speak(response.reply, replyLang || lang);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: "Sorry, I'm having trouble connecting. Please try again.",
      }]);
    }
  }, [aiMutation, voiceEnabled]);

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
    recognition.lang = "hi-IN,en-IN";

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  }, [isListening]);

  return (
    <div className="flex flex-col h-full bg-background relative">
      <div className="px-5 py-4 border-b border-border bg-background/90 backdrop-blur-md z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-display font-bold text-white text-lg leading-tight">CareCell AI</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
              Online · Hindi &amp; English
            </p>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            setVoiceEnabled(v => !v);
            if (voiceEnabled) window.speechSynthesis?.cancel();
          }}
          className={`w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${
            voiceEnabled
              ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
              : 'bg-card border-border text-muted-foreground hover:text-white'
          }`}
          title={voiceEnabled ? "Mute voice responses" : "Enable voice responses"}
        >
          {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </motion.button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-6 pb-32 hide-scrollbar scroll-smooth">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user'
                  ? 'bg-primary text-white shadow-md shadow-primary/30'
                  : 'bg-secondary text-white border border-border shadow-sm'
              }`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%]`}>
                <div className={`px-4 py-3.5 text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-white rounded-2xl rounded-tr-sm shadow-md shadow-primary/20'
                    : 'bg-card border border-border text-white rounded-2xl rounded-tl-sm shadow-sm'
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>

                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3 pl-1">
                    {msg.suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(s)}
                        disabled={aiMutation.isPending}
                        className="text-[11px] font-medium bg-secondary/80 text-white px-3.5 py-2 rounded-full border border-border hover:bg-primary hover:border-primary transition-colors shadow-sm backdrop-blur-sm disabled:opacity-40"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {aiMutation.isPending && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-secondary border border-border text-white flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-card border border-border px-4 py-4 rounded-2xl rounded-tl-sm flex gap-1.5 items-center h-[44px]">
                <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/95 to-transparent pt-8 pb-[84px]">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
          className="relative flex items-center bg-card rounded-full border border-border shadow-xl p-1.5 gap-1"
        >
          {SpeechRecognitionAPI && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.85 }}
              onClick={toggleListening}
              className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-colors ml-1 ${
                isListening
                  ? 'bg-primary text-white animate-pulse shadow-lg shadow-primary/40'
                  : 'bg-secondary/60 text-muted-foreground hover:text-white hover:bg-secondary'
              }`}
              title={isListening ? "Stop listening" : "Speak (Hindi/English)"}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </motion.button>
          )}

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isListening ? "Listening..." : "Message in Hindi or English..."}
            disabled={aiMutation.isPending || isListening}
            className="flex-1 bg-transparent px-3 py-3 text-sm text-white placeholder:text-muted-foreground outline-none"
          />

          <motion.button
            whileTap={{ scale: 0.9 }}
            type="submit"
            disabled={!input.trim() || aiMutation.isPending}
            className="w-10 h-10 shrink-0 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:bg-secondary disabled:text-muted-foreground transition-colors mr-1 shadow-sm"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </motion.button>
        </form>

        {isListening && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-xs text-primary mt-2 font-medium"
          >
            Listening... speak now
          </motion.p>
        )}
      </div>
    </div>
  );
}
