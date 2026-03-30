import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";

const router: IRouter = Router();

const JWT_SECRET = process.env["JWT_SECRET"] ?? process.env["SESSION_SECRET"] ?? "carecell_dev_secret_change_in_production";
const JWT_EXPIRES = "7d";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().min(7, "Phone too short").max(20).optional().or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["donor", "patient"]),
  acceptedTerms: z.boolean(),
}).refine((d) => d.email || d.phone, {
  message: "Email or phone number is required",
  path: ["email"],
}).refine((d) => d.acceptedTerms === true, {
  message: "Please accept Terms & Conditions",
  path: ["acceptedTerms"],
});

const loginSchema = z.object({
  emailOrPhone: z.string().min(1, "Email or phone is required"),
  password: z.string().min(1, "Password is required"),
});

function makeToken(userId: number) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

router.post("/auth/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const firstMessage = Object.values(flat.fieldErrors).flat()[0]
      ?? flat.formErrors[0]
      ?? "Validation failed";
    return res.status(400).json({ error: firstMessage, details: flat.fieldErrors });
  }

  const { name, email, phone, password, role, acceptedTerms } = parsed.data;

  if (!acceptedTerms) {
    return res.status(400).json({ error: "Please accept Terms & Conditions" });
  }

  try {
    const identifier = email || phone;
    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(
        email
          ? eq(usersTable.email, email)
          : eq(usersTable.phone, phone!)
      )
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ error: "An account with this email/phone already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db
      .insert(usersTable)
      .values({
        name,
        email: email || null,
        phone: phone || null,
        passwordHash,
        role,
        acceptedTerms: true,
      })
      .returning({ id: usersTable.id, name: usersTable.name, role: usersTable.role });

    const token = makeToken(user.id);
    res.status(201).json({ token, user: { id: user.id, name: user.name, role: user.role } });
  } catch (err) {
    req.log.error({ err }, "Signup failed");
    res.status(500).json({ error: "Signup failed. Please try again." });
  }
});

router.post("/auth/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  }

  const { emailOrPhone, password } = parsed.data;
  const isEmail = emailOrPhone.includes("@");

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(
        isEmail
          ? eq(usersTable.email, emailOrPhone)
          : eq(usersTable.phone, emailOrPhone)
      )
      .limit(1);

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = makeToken(user.id);
    res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
  } catch (err) {
    req.log.error({ err }, "Login failed");
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

router.get("/auth/me", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
    const [user] = await db
      .select({ id: usersTable.id, name: usersTable.name, role: usersTable.role, email: usersTable.email, phone: usersTable.phone })
      .from(usersTable)
      .where(eq(usersTable.id, payload.userId))
      .limit(1);
    if (!user) return res.status(401).json({ error: "User not found" });
    res.json({ user });
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

export default router;
