import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, ArrowLeft, Loader2, Users } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function token() {
  return localStorage.getItem("carecell_token") ?? "";
}

function authHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token()}` };
}

interface ConvSummary {
  id: number;
  partner: { id: number; name: string; role: string };
  lastMessage: string | null;
  lastMessageAt: string;
}

interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  text: string;
  createdAt: string;
}

async function fetchConversations(): Promise<ConvSummary[]> {
  const res = await fetch(`${BASE}/api/chat`, { headers: authHeaders() });
  if (!res.ok) throw new Error("failed");
  return res.json();
}

async function fetchMessages(convId: number): Promise<{ messages: Message[] }> {
  const res = await fetch(`${BASE}/api/chat/${convId}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("failed");
  return res.json();
}

async function sendMessage(conversationId: number, text: string): Promise<Message> {
  const res = await fetch(`${BASE}/api/chat/send`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ conversationId, text }),
  });
  if (!res.ok) throw new Error("failed");
  return res.json();
}

function Avatar({ name, role }: { name: string; role: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const colors =
    role === "donor"
      ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
      : "bg-rose-500/20 text-rose-400 border-rose-500/30";
  return (
    <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 ${colors}`}>
      {initials}
    </div>
  );
}

function ConversationList({
  convs,
  loading,
  onSelect,
}: {
  convs: ConvSummary[];
  loading: boolean;
  onSelect: (c: ConvSummary) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-5 pb-3">
        <h1 className="text-2xl font-display font-bold text-foreground mb-0.5">Messages</h1>
        <p className="text-xs text-muted-foreground">Real-time patient–donor chat</p>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar px-4 pb-8 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-card rounded-2xl animate-pulse" />
          ))
        ) : convs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border rounded-3xl mx-1">
            <Users className="w-10 h-10 text-muted-foreground mb-3 opacity-30" />
            <p className="text-muted-foreground text-sm font-medium">No conversations yet</p>
            <p className="text-muted-foreground text-xs mt-1">Chat links are started from donor cards on the Request page</p>
          </div>
        ) : (
          convs.map((c) => (
            <motion.div
              key={c.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(c)}
              className="flex items-center gap-3 p-4 bg-card/80 border border-border rounded-[20px] cursor-pointer hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all shadow-sm"
            >
              <Avatar name={c.partner.name} role={c.partner.role} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className="font-semibold text-foreground text-sm truncate">{c.partner.name}</h3>
                  <span className="text-[10px] text-muted-foreground ml-2 shrink-0">
                    {format(new Date(c.lastMessageAt), "HH:mm")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {c.lastMessage ?? "Start a conversation…"}
                </p>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

function ChatThread({
  conv,
  currentUserId,
  onBack,
}: {
  conv: ConvSummary;
  currentUserId: number;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = async () => {
    try {
      const data = await fetchMessages(conv.id);
      setMessages(data.messages);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [conv.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const msg = await sendMessage(conv.id, trimmed);
      setMessages((prev) => [...prev, msg]);
      setText("");
    } catch {
      /* silent */
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-10">
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors border border-border"
        >
          <ArrowLeft className="w-4 h-4" />
        </motion.button>
        <Avatar name={conv.partner.name} role={conv.partner.role} />
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-foreground text-sm truncate">{conv.partner.name}</h2>
          <p className="text-[10px] text-muted-foreground capitalize">{conv.partner.role}</p>
        </div>
        <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto hide-scrollbar px-4 py-4 space-y-3 pb-2">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No messages yet — say hello!
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === currentUserId;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    isMine
                      ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-tr-sm"
                      : "bg-card border border-border text-foreground rounded-tl-sm"
                  }`}
                >
                  <p>{msg.text}</p>
                  <p className={`text-[10px] mt-1 ${isMine ? "text-white/60 text-right" : "text-muted-foreground"}`}>
                    {format(new Date(msg.createdAt), "HH:mm")}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-card/80 backdrop-blur-xl">
        <div className="flex items-center gap-2 bg-secondary/40 border border-border rounded-2xl px-4 py-2 focus-within:border-indigo-500/50 focus-within:bg-indigo-500/5 transition-all">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-sm text-foreground placeholder:text-muted-foreground/60 max-h-24 py-1.5"
          />
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="w-9 h-9 shrink-0 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-xl flex items-center justify-center disabled:opacity-40 transition-opacity shadow-sm"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </motion.button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-1.5">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { user } = useAuth();
  const [convs, setConvs] = useState<ConvSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ConvSummary | null>(null);

  const loadConvs = async () => {
    try {
      const data = await fetchConversations();
      setConvs(data);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConvs();
    const interval = setInterval(loadConvs, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col">
      <AnimatePresence mode="wait">
        {selected ? (
          <motion.div
            key="thread"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ type: "spring", bounce: 0.1, duration: 0.3 }}
            className="h-full flex flex-col"
          >
            <ChatThread
              conv={selected}
              currentUserId={user?.id ?? 0}
              onBack={() => {
                setSelected(null);
                loadConvs();
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ type: "spring", bounce: 0.1, duration: 0.3 }}
            className="h-full"
          >
            <ConversationList
              convs={convs}
              loading={loading}
              onSelect={(c) => setSelected(c)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
