import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles } from "lucide-react";
import { useAiAssistant } from "@/hooks/use-ai-assistant";
import { motion, AnimatePresence } from "framer-motion";

type Message = {
  id: string;
  role: 'user' | 'ai';
  content: string;
  suggestions?: string[];
};

export default function AiChat() {
  const [messages, setMessages] = useState<Message[]>([{
    id: '1',
    role: 'ai',
    content: "Hi. I'm CareCell AI. I can help answer questions about blood donation, cancer protocols, or find nearby hospitals. How can I help?",
    suggestions: [
      "Can I donate platelets?",
      "Compatible blood types for O-",
      "Find nearest blood bank"
    ]
  }]);
  const [input, setInput] = useState("");
  const aiMutation = useAiAssistant();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, aiMutation.isPending]);

  const handleSend = async (text: string) => {
    if (!text.trim() || aiMutation.isPending) return;
    
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    try {
      const response = await aiMutation.mutateAsync({ data: { message: text } });
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: response.reply,
        suggestions: response.suggestions
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: "Sorry, I'm having trouble connecting right now."
      }]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative pb-20">
      <div className="px-5 py-4 border-b border-border bg-background/90 backdrop-blur-md z-10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-display font-bold text-white text-lg leading-tight">CareCell AI</h2>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" /> Online
          </p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-6 pb-24 hide-scrollbar scroll-smooth">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div 
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-primary text-white shadow-md shadow-primary/30' : 'bg-secondary text-white border border-border shadow-sm'
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
                    {msg.suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(suggestion)}
                        disabled={aiMutation.isPending}
                        className="text-[11px] font-medium bg-secondary/80 text-white px-3.5 py-2 rounded-full border border-border hover:bg-primary hover:border-primary transition-colors text-left shadow-sm backdrop-blur-sm"
                      >
                        {suggestion}
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

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent pt-10">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
          className="relative flex items-center bg-card rounded-full border border-border shadow-xl p-1.5"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message CareCell AI..."
            disabled={aiMutation.isPending}
            className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder:text-muted-foreground outline-none"
          />
          <motion.button 
            whileTap={{ scale: 0.9 }}
            type="submit"
            disabled={!input.trim() || aiMutation.isPending}
            className="w-10 h-10 shrink-0 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:bg-secondary disabled:text-muted-foreground transition-colors mr-1 shadow-sm"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </motion.button>
        </form>
      </div>
    </div>
  );
}
