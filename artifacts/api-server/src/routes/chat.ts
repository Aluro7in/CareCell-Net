import { Router, type IRouter } from "express";
import { db, conversationsTable, messagesTable, usersTable } from "@workspace/db";
import { eq, or, and, desc } from "drizzle-orm";
import { requireAuth } from "./auth.js";

const router: IRouter = Router();

router.post("/chat/start", requireAuth, async (req, res) => {
  const currentUserId: number = (req as any).userId;
  const { partnerId } = req.body as { partnerId?: number };

  if (!partnerId || isNaN(Number(partnerId))) {
    return res.status(400).json({ error: "partnerId is required" });
  }
  const pid = Number(partnerId);

  try {
    const existing = await db
      .select()
      .from(conversationsTable)
      .where(
        or(
          and(
            eq(conversationsTable.patientId, currentUserId),
            eq(conversationsTable.donorId, pid),
          ),
          and(
            eq(conversationsTable.patientId, pid),
            eq(conversationsTable.donorId, currentUserId),
          ),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return res.json({ conversationId: existing[0].id });
    }

    const [conv] = await db
      .insert(conversationsTable)
      .values({ patientId: currentUserId, donorId: pid })
      .returning();

    res.status(201).json({ conversationId: conv.id });
  } catch (err: unknown) {
    req.log.error({ err }, "POST /api/chat/start failed");
    res.status(500).json({ error: "Could not start conversation" });
  }
});

router.get("/chat", requireAuth, async (req, res) => {
  const currentUserId: number = (req as any).userId;

  try {
    const convs = await db
      .select()
      .from(conversationsTable)
      .where(
        or(
          eq(conversationsTable.patientId, currentUserId),
          eq(conversationsTable.donorId, currentUserId),
        ),
      )
      .orderBy(desc(conversationsTable.createdAt));

    const result = await Promise.all(
      convs.map(async (c) => {
        const partnerId = c.patientId === currentUserId ? c.donorId : c.patientId;
        const [partner] = await db
          .select({ id: usersTable.id, name: usersTable.name, role: usersTable.role })
          .from(usersTable)
          .where(eq(usersTable.id, partnerId))
          .limit(1);

        const [lastMsg] = await db
          .select()
          .from(messagesTable)
          .where(eq(messagesTable.conversationId, c.id))
          .orderBy(desc(messagesTable.createdAt))
          .limit(1);

        return {
          id: c.id,
          partner: partner ?? { id: partnerId, name: "Unknown", role: "unknown" },
          lastMessage: lastMsg?.text ?? null,
          lastMessageAt: lastMsg?.createdAt ?? c.createdAt,
        };
      }),
    );

    res.json(result);
  } catch (err: unknown) {
    req.log.error({ err }, "GET /api/chat failed");
    res.status(500).json({ error: "Could not fetch conversations" });
  }
});

router.get("/chat/:conversationId", requireAuth, async (req, res) => {
  const currentUserId: number = (req as any).userId;
  const convId = parseInt(req.params.conversationId);
  if (isNaN(convId)) return res.status(400).json({ error: "Invalid conversation ID" });

  try {
    const [conv] = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, convId))
      .limit(1);

    if (!conv) return res.status(404).json({ error: "Conversation not found" });
    if (conv.patientId !== currentUserId && conv.donorId !== currentUserId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const messages = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, convId))
      .orderBy(messagesTable.createdAt);

    res.json({ conversation: conv, messages });
  } catch (err: unknown) {
    req.log.error({ err }, "GET /api/chat/:id failed");
    res.status(500).json({ error: "Could not fetch messages" });
  }
});

router.post("/chat/send", requireAuth, async (req, res) => {
  const currentUserId: number = (req as any).userId;
  const { conversationId, text } = req.body as { conversationId?: number; text?: string };

  if (!conversationId || !text?.trim()) {
    return res.status(400).json({ error: "conversationId and text are required" });
  }

  try {
    const [conv] = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, conversationId))
      .limit(1);

    if (!conv) return res.status(404).json({ error: "Conversation not found" });
    if (conv.patientId !== currentUserId && conv.donorId !== currentUserId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const [msg] = await db
      .insert(messagesTable)
      .values({ conversationId, senderId: currentUserId, text: text.trim() })
      .returning();

    res.status(201).json(msg);
  } catch (err: unknown) {
    req.log.error({ err }, "POST /api/chat/send failed");
    res.status(500).json({ error: "Could not send message" });
  }
});

export default router;
