import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { HeartPulse, Eye, EyeOff, Loader2, UserPlus, ChevronDown } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const TERMS = [
  "I agree not to misuse any donor or patient contact information.",
  "I will not create fake emergency requests.",
  "I understand this platform is for critical healthcare use.",
  "Any misuse may result in account suspension.",
];

export default function SignupPage() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "patient" as "donor" | "patient",
    acceptedTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [termsExpanded, setTermsExpanded] = useState(false);
  const [usePhone, setUsePhone] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
    setFieldErrors((p) => ({ ...p, [name]: "" }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "Name is required";
    if (!usePhone && !form.email.trim()) errors.email = "Email is required";
    if (usePhone && !form.phone.trim()) errors.phone = "Phone is required";
    if (!form.password) errors.password = "Password is required";
    else if (form.password.length < 6) errors.password = "At least 6 characters";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    if (!form.acceptedTerms) {
      setError("Please accept the Terms & Conditions to continue.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = {
        name: form.name.trim(),
        email: usePhone ? undefined : form.email.trim(),
        phone: usePhone ? form.phone.trim() : undefined,
        password: form.password,
        role: form.role,
        acceptedTerms: form.acceptedTerms,
      };

      const res = await fetch(`${BASE}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.details) {
          const errs: Record<string, string> = {};
          for (const [k, v] of Object.entries(data.details as Record<string, string[]>)) {
            errs[k] = v[0];
          }
          setFieldErrors(errs);
        }
        setError(data.error ?? "Signup failed");
        return;
      }

      login(data.token, data.user);
      toast({ title: `Welcome to CareCell, ${data.user.name}!`, description: "Your account has been created." });
      navigate("/");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field: string) => cn(
    "w-full bg-secondary/40 border rounded-2xl px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 transition-all",
    fieldErrors[field]
      ? "border-red-500/60 focus:ring-red-500/30"
      : "border-border/60 focus:ring-indigo-500/40 focus:border-indigo-500/50"
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, type: "spring", bounce: 0.1 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-500 via-violet-500 to-emerald-500 flex items-center justify-center shadow-xl shadow-indigo-500/25 mb-4">
            <HeartPulse className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display font-black text-2xl text-foreground">Create account</h1>
          <p className="text-sm text-muted-foreground mt-1">Join CareCell Network</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border/50 rounded-3xl p-6 shadow-xl shadow-black/20 space-y-4">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-2xl px-4 py-3"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Full Name</label>
              <input name="name" type="text" value={form.name} onChange={handleChange}
                placeholder="Priya Sharma" autoComplete="name" className={inputClass("name")} />
              {fieldErrors.name && <p className="text-xs text-red-400">{fieldErrors.name}</p>}
            </div>

            {/* Email / Phone toggle */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {usePhone ? "Phone Number" : "Email"}
                </label>
                <button type="button" onClick={() => { setUsePhone((v) => !v); setFieldErrors((p) => ({ ...p, email: "", phone: "" })); }}
                  className="text-[10px] text-indigo-400 font-semibold hover:text-indigo-300 transition-colors">
                  Use {usePhone ? "email" : "phone"} instead
                </button>
              </div>
              {usePhone ? (
                <input name="phone" type="tel" value={form.phone} onChange={handleChange}
                  placeholder="+91 98765 43210" autoComplete="tel" className={inputClass("phone")} />
              ) : (
                <input name="email" type="email" value={form.email} onChange={handleChange}
                  placeholder="you@email.com" autoComplete="email" className={inputClass("email")} />
              )}
              {(fieldErrors.email || fieldErrors.phone) && (
                <p className="text-xs text-red-400">{fieldErrors.email || fieldErrors.phone}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Password</label>
              <div className="relative">
                <input name="password" type={showPassword ? "text" : "password"}
                  value={form.password} onChange={handleChange}
                  placeholder="Min. 6 characters" autoComplete="new-password" className={inputClass("password")} />
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && <p className="text-xs text-red-400">{fieldErrors.password}</p>}
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">I am a</label>
              <div className="grid grid-cols-2 gap-2">
                {(["patient", "donor"] as const).map((r) => (
                  <button key={r} type="button"
                    onClick={() => setForm((p) => ({ ...p, role: r }))}
                    className={cn(
                      "py-3 rounded-2xl text-sm font-semibold border transition-all capitalize",
                      form.role === r
                        ? "bg-indigo-500/15 border-indigo-500/50 text-indigo-300"
                        : "bg-secondary/40 border-border/60 text-muted-foreground hover:border-indigo-500/30"
                    )}>
                    {r === "patient" ? "🏥 Patient" : "🩸 Donor"}
                  </button>
                ))}
              </div>
            </div>

            {/* Terms */}
            <div className="bg-secondary/30 border border-border/40 rounded-2xl overflow-hidden">
              <button type="button" onClick={() => setTermsExpanded((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-left">
                <span className="text-xs font-semibold text-muted-foreground">Terms & Conditions</span>
                <motion.div animate={{ rotate: termsExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </motion.div>
              </button>
              <AnimatePresence initial={false}>
                {termsExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3 space-y-2">
                      {TERMS.map((t, i) => (
                        <div key={i} className="flex gap-2 text-xs text-muted-foreground">
                          <span className="text-indigo-400 shrink-0 mt-0.5">•</span>
                          <span>{t}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <label className="flex items-start gap-3 px-4 pb-4 cursor-pointer">
                <div className="relative mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    name="acceptedTerms"
                    checked={form.acceptedTerms}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div className={cn(
                    "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                    form.acceptedTerms
                      ? "bg-gradient-to-br from-indigo-500 to-emerald-500 border-transparent"
                      : "border-border/60 bg-secondary/40"
                  )}>
                    {form.acceptedTerms && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground leading-relaxed">
                  I have read and agree to the Terms & Conditions above
                </span>
              </label>
            </div>

            {/* Submit */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading || !form.acceptedTerms}
              className={cn(
                "w-full font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all",
                form.acceptedTerms
                  ? "gradient-btn text-white shadow-lg shadow-indigo-500/25"
                  : "bg-secondary/50 text-muted-foreground cursor-not-allowed",
                loading && "opacity-60 cursor-not-allowed"
              )}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {loading ? "Creating account…" : "Create Account"}
            </motion.button>
          </form>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border/40" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border/40" />
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
