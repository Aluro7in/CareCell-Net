import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Edit3, Save, X, Upload, FileText, Image,
  Phone, MapPin, Droplets, Activity, Shield, Star,
  ChevronRight, Download, Trash2, HeartPulse, Loader2
} from "lucide-react";
import { useProfile, useUpdateProfile, useUploadFile } from "@/hooks/use-profile";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];
const STAGES = ["Stage I", "Stage II", "Stage III", "Stage IV", "Remission", "N/A"];

function ScoreBadge({ score }: { score: number }) {
  const label = score >= 90 ? "Highly Reliable" : score >= 70 ? "Active" : "Needs Improvement";
  const color = score >= 90 ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/30"
    : score >= 70 ? "text-blue-400 bg-blue-400/10 border-blue-400/30"
    : "text-red-400 bg-red-400/10 border-red-400/30";
  return (
    <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border", color)}>
      {label}
    </span>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 90 ? "#34d399" : score >= 70 ? "#60a5fa" : "#f87171";
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-border/30" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="text-center z-10">
        <p className="text-2xl font-display font-black text-white">{score}</p>
        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">score</p>
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
      <span className="text-sm font-medium text-foreground">{value || "—"}</span>
    </div>
  );
}

function EditField({
  label, name, value, onChange, type = "text", options
}: {
  label: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  type?: string; options?: string[];
}) {
  const base = "w-full bg-secondary/50 border border-border/60 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all";
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</label>
      {options ? (
        <select name={name} value={value} onChange={onChange} className={cn(base, "cursor-pointer")}>
          <option value="">Select…</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : type === "textarea" ? (
        <textarea name={name} value={value} onChange={onChange} rows={4}
          className={cn(base, "resize-none")} placeholder={label} />
      ) : (
        <input name={name} type={type} value={value} onChange={onChange}
          className={base} placeholder={label} />
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { data: profile, isLoading } = useProfile();
  const updateMutation = useUpdateProfile();
  const uploadMutation = useUploadFile();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const startEdit = () => {
    setForm({
      name: profile?.name ?? "",
      role: profile?.role ?? "",
      age: String(profile?.age ?? ""),
      gender: profile?.gender ?? "",
      phone: profile?.phone ?? "",
      location: profile?.location ?? "",
      bloodGroup: profile?.bloodGroup ?? "",
      cancerType: profile?.cancerType ?? "",
      stage: profile?.stage ?? "",
      allergies: profile?.allergies ?? "",
      treatment: profile?.treatment ?? "",
      healthNotes: profile?.healthNotes ?? "",
    });
    setEditing(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        ...form,
        age: form.age ? parseInt(form.age) : null,
      });
      setEditing(false);
      toast({ title: "Profile saved", description: "Your health profile has been updated." });
    } catch {
      toast({ title: "Save failed", description: "Could not save profile.", variant: "destructive" });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await uploadMutation.mutateAsync(file);
      const currentReports: string[] = profile?.reports ?? [];
      await updateMutation.mutateAsync({ reports: [...currentReports, result.url] });
      toast({ title: "Report uploaded", description: file.name });
    } catch {
      toast({ title: "Upload failed", description: "Could not upload file.", variant: "destructive" });
    }
    e.target.value = "";
  };

  const removeReport = async (url: string) => {
    const updated = (profile?.reports ?? []).filter((r: string) => r !== url);
    await updateMutation.mutateAsync({ reports: updated });
    toast({ title: "Report removed" });
  };

  const getFileName = (url: string) => url.split("/").pop() ?? url;
  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-5 pb-24">
      {/* ── Profile Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden card-shadow"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 via-violet-600/10 to-emerald-500/10 pointer-events-none" />
        <div className="relative bg-card/80 glass border border-border/50 rounded-3xl p-6">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-emerald-500 flex items-center justify-center shadow-xl shadow-indigo-500/20">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="avatar" className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <User className="w-9 h-9 text-white" />
                )}
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 border-2 border-card flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-white" />
              </div>
            </div>

            {/* Name + role + badge */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-display font-black text-white truncate">{profile?.name ?? "CareCell User"}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{profile?.role ?? "Patient"}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <ScoreBadge score={profile?.reliabilityScore ?? 85} />
                {profile?.bloodGroup && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border text-primary bg-primary/10 border-primary/30">
                    {profile.bloodGroup}
                  </span>
                )}
              </div>
            </div>

            {/* Score ring */}
            <div className="shrink-0">
              <ScoreRing score={profile?.reliabilityScore ?? 85} />
            </div>
          </div>

          {/* Score bar */}
          <div className="mt-5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Reliability Score</span>
              <span className="font-bold text-white">{profile?.reliabilityScore ?? 85}/100</span>
            </div>
            <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${profile?.reliabilityScore ?? 85}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                className={cn(
                  "h-full rounded-full",
                  (profile?.reliabilityScore ?? 85) >= 90 ? "bg-gradient-to-r from-emerald-500 to-green-400"
                  : (profile?.reliabilityScore ?? 85) >= 70 ? "bg-gradient-to-r from-blue-500 to-indigo-400"
                  : "bg-gradient-to-r from-red-500 to-orange-400"
                )}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Edit / Save Actions ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.1 } }} className="flex gap-3">
        {editing ? (
          <>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="flex-1 gradient-btn text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all text-sm"
            >
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => setEditing(false)}
              className="w-14 h-[50px] rounded-2xl border border-border/60 bg-secondary/40 flex items-center justify-center text-muted-foreground hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </motion.button>
          </>
        ) : (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={startEdit}
            className="flex-1 bg-card border border-border/60 text-white font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-sm card-shadow"
          >
            <Edit3 className="w-4 h-4 text-indigo-400" />
            Edit Profile
          </motion.button>
        )}
      </motion.div>

      {/* ── Basic Info ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.15 } }}
        className="bg-card/80 glass border border-border/50 rounded-3xl p-5 card-shadow space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <h2 className="font-display font-bold text-base text-white">Basic Info</h2>
        </div>
        {editing ? (
          <div className="grid grid-cols-2 gap-3">
            <EditField label="Full Name" name="name" value={form.name ?? ""} onChange={handleChange} />
            <EditField label="Role" name="role" value={form.role ?? ""} onChange={handleChange} />
            <EditField label="Age" name="age" value={form.age ?? ""} onChange={handleChange} type="number" />
            <EditField label="Gender" name="gender" value={form.gender ?? ""} onChange={handleChange} options={GENDERS} />
            <EditField label="Phone" name="phone" value={form.phone ?? ""} onChange={handleChange} type="tel" />
            <EditField label="Location" name="location" value={form.location ?? ""} onChange={handleChange} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-y-4 gap-x-6">
            <InfoField label="Age" value={profile?.age} />
            <InfoField label="Gender" value={profile?.gender} />
            <InfoField label="Phone" value={profile?.phone} />
            <InfoField label="Location" value={profile?.location} />
          </div>
        )}
      </motion.div>

      {/* ── Medical Info ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
        className="bg-card/80 glass border border-border/50 rounded-3xl p-5 card-shadow space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
            <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <h2 className="font-display font-bold text-base text-white">Medical Info</h2>
        </div>
        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <EditField label="Blood Group" name="bloodGroup" value={form.bloodGroup ?? ""} onChange={handleChange} options={BLOOD_GROUPS} />
              <EditField label="Stage" name="stage" value={form.stage ?? ""} onChange={handleChange} options={STAGES} />
            </div>
            <EditField label="Cancer / Diagnosis Type" name="cancerType" value={form.cancerType ?? ""} onChange={handleChange} />
            <EditField label="Allergies" name="allergies" value={form.allergies ?? ""} onChange={handleChange} />
            <EditField label="Current Treatment" name="treatment" value={form.treatment ?? ""} onChange={handleChange} />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-y-4 gap-x-6">
              <InfoField label="Blood Group" value={profile?.bloodGroup} />
              <InfoField label="Stage" value={profile?.stage} />
              <InfoField label="Diagnosis" value={profile?.cancerType} />
              <InfoField label="Allergies" value={profile?.allergies} />
            </div>
            {profile?.treatment && (
              <div className="pt-1 border-t border-border/30">
                <InfoField label="Treatment" value={profile.treatment} />
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* ── Health Notes ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.25 } }}
        className="bg-card/80 glass border border-border/50 rounded-3xl p-5 card-shadow">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <h2 className="font-display font-bold text-base text-white">Health Notes</h2>
        </div>
        {editing ? (
          <EditField label="Health Notes" name="healthNotes" value={form.healthNotes ?? ""} onChange={handleChange} type="textarea" />
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {profile?.healthNotes || "No health notes yet. Tap Edit Profile to add notes about your condition, medications, or important reminders."}
          </p>
        )}
      </motion.div>

      {/* ── Reports ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.3 } }}
        className="bg-card/80 glass border border-border/50 rounded-3xl p-5 card-shadow space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <h2 className="font-display font-bold text-base text-white">Reports</h2>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => fileRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 bg-indigo-400/10 border border-indigo-400/20 px-3 py-1.5 rounded-xl hover:bg-indigo-400/20 transition-colors disabled:opacity-50"
          >
            {uploadMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Upload
          </motion.button>
          <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileUpload} />
        </div>

        <AnimatePresence mode="popLayout">
          {(profile?.reports ?? []).length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No reports uploaded yet
            </div>
          ) : (
            <div className="space-y-2">
              {(profile?.reports ?? []).map((url: string, i: number) => (
                <motion.div
                  key={url}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0, transition: { delay: i * 0.05 } }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex items-center gap-3 bg-secondary/40 border border-border/40 rounded-2xl px-4 py-3"
                >
                  <div className="w-8 h-8 rounded-xl bg-card flex items-center justify-center shrink-0">
                    {isImage(url) ? <Image className="w-4 h-4 text-blue-400" /> : <FileText className="w-4 h-4 text-amber-400" />}
                  </div>
                  <span className="text-xs text-foreground flex-1 truncate font-medium">{getFileName(url)}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={`${import.meta.env.BASE_URL.replace(/\/$/, "")}${url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-indigo-400 hover:bg-indigo-400/10 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => removeReport(url)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Stats strip ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.35 } }}
        className="grid grid-cols-3 gap-3">
        {[
          { icon: Shield, label: "Donations", value: "12", color: "text-indigo-400", bg: "bg-indigo-500/10" },
          { icon: Star, label: "Matches", value: "8", color: "text-amber-400", bg: "bg-amber-500/10" },
          { icon: HeartPulse, label: "Requests", value: "3", color: "text-rose-400", bg: "bg-rose-500/10" },
        ].map((s) => (
          <div key={s.label} className="bg-card/80 glass border border-border/50 rounded-2xl p-4 text-center card-shadow">
            <div className={cn("w-8 h-8 rounded-xl mx-auto mb-2 flex items-center justify-center border", s.bg, s.color.replace("text-", "border-").replace("400", "400/30"))}>
              <s.icon className={cn("w-4 h-4", s.color)} />
            </div>
            <p className="text-lg font-display font-black text-white">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
