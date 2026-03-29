import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Bot, User, Sparkles } from "lucide-react";
import { Layout } from "@/components/layout";
import { useAiAssistant } from "@/hooks/use-ai-assistant";

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
    content: "Hello. I am the CareCell AI Assistant. I can help answer questions about blood donation compatibility, cancer care protocols, and finding nearby hospitals. How can I assist you today?",
    suggestions: [
      "What blood types are compatible with O-?",
      "How often can I donate platelets?",
      "Find nearest hospital with a blood bank"
    ]
  }]);
  const [input, setInput] = useState("");
  
  const aiMutation = useAiAssistant();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    try {
      const response = await aiMutation.mutateAsync({
        data: { message: text }
      });
      
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
        content: "I'm sorry, I'm having trouble connecting right now. Please try again later."
      }]);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col bg-card border border-border shadow-lg rounded-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-foreground text-background p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg leading-tight">CareCell AI</h2>
            <p className="text-sm text-background/70">Medical knowledge & support</p>
          </div>
        </div>

        {/* Chat Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-background/50">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-blue-100 text-blue-600'
              }`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              
              <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[80%]`}>
                <div className={`p-4 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                    : 'bg-card border border-border text-foreground shadow-sm rounded-tl-sm'
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
                
                {/* Suggestions */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {msg.suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(suggestion)}
                        disabled={aiMutation.isPending}
                        className="text-xs bg-accent text-primary px-3 py-1.5 rounded-full border border-accent-border hover:bg-primary hover:text-white transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {aiMutation.isPending && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-card border border-border p-4 rounded-2xl rounded-tl-sm shadow-sm flex gap-1">
                <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce delay-100" />
                <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce delay-200" />
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-card border-t border-border">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
            className="relative flex items-center"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your medical question here..."
              disabled={aiMutation.isPending}
              className="w-full pl-4 pr-12 py-4 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
            <button 
              type="submit"
              disabled={!input.trim() || aiMutation.isPending}
              className="absolute right-2 p-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
