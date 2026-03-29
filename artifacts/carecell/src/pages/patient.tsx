import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ShieldAlert, AlertTriangle, Phone, MapPin, CheckCircle2, HeartPulse } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCreateEmergencyRequest } from "@/hooks/use-requests";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const),
  cancerType: z.string().min(2, "Cancer type is required"),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  urgency: z.enum(["normal", "critical"] as const),
  phone: z.string().min(10, "Valid phone required"),
});

type FormValues = z.infer<typeof formSchema>;
const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

export default function PatientPage() {
  const { toast } = useToast();
  const createRequest = useCreateEmergencyRequest();
  const [matchResult, setMatchResult] = useState<any>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      bloodGroup: "O+",
      cancerType: "",
      latitude: 19.076,
      longitude: 72.877,
      urgency: "normal",
      phone: "",
    },
  });

  const isCritical = form.watch("urgency") === "critical";

  const onSubmit = async (data: FormValues) => {
    try {
      const result = await createRequest.mutateAsync({ data });
      setMatchResult(result);
      
      if (data.urgency === "critical") {
        toast({
          title: "CRITICAL ALERT SENT",
          description: `Emergency alerts dispatched to ${result.matchedDonors?.length || 0} nearby donors.`,
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to create request.", variant: "destructive" });
    }
  };

  return (
    <div className="p-5 h-full relative">
      <AnimatePresence>
        {matchResult ? (
          <motion.div 
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="absolute inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col pt-safe shadow-2xl"
          >
            <div className="flex-1 overflow-y-auto p-5 pb-24">
              <button 
                onClick={() => setMatchResult(null)}
                className="w-12 h-1.5 bg-border rounded-full mx-auto mb-8 block hover:bg-muted-foreground transition-colors"
              />
              
              <div className="bg-card rounded-3xl p-6 border border-border shadow-2xl mb-8 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-green-500/5" />
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4 relative z-10 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-2xl font-display font-bold mb-2 text-white relative z-10">Request Active</h2>
                <p className="text-muted-foreground text-sm relative z-10">
                  Found <strong className="text-white font-bold">{matchResult.matchedDonors?.length || 0}</strong> compatible donors nearby.
                </p>
              </div>

              <h3 className="text-lg font-display font-bold mb-4 flex items-center gap-2 text-white">
                <HeartPulse className="w-5 h-5 text-primary" /> Matched Donors
              </h3>
              
              <div className="grid gap-4">
                {matchResult.matchedDonors?.length > 0 ? (
                  matchResult.matchedDonors.map((donor: any) => (
                    <motion.div whileTap={{ scale: 0.98 }} key={donor.id} className="bg-card p-4 rounded-3xl border border-border flex items-center justify-between gap-4 shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center border border-border shrink-0">
                          <span className="font-bold text-white text-sm">{donor.bloodGroup}</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-base leading-tight">{donor.name}</h4>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                            <MapPin className="w-3 h-3 text-primary"/> 
                            <span>{donor.distanceKm.toFixed(1)} km away</span>
                          </div>
                        </div>
                      </div>
                      <a 
                        href={`tel:${donor.phone}`}
                        className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors shrink-0"
                      >
                        <Phone className="w-5 h-5" />
                      </a>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center p-8 border border-dashed border-border rounded-3xl text-muted-foreground text-sm">
                    No immediate matches found. We'll keep searching.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="text-center mb-2">
              <h1 className="text-2xl font-display font-bold text-white">Emergency Request</h1>
              <p className="text-muted-foreground text-sm mt-1">Find nearby compatible donors instantly.</p>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Urgency Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-card border border-border rounded-2xl shadow-sm">
                <button
                  type="button"
                  onClick={() => form.setValue("urgency", "normal")}
                  className={`py-3 rounded-xl text-sm font-semibold transition-all ${!isCritical ? 'bg-secondary text-white shadow-sm' : 'text-muted-foreground hover:text-white'}`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => form.setValue("urgency", "critical")}
                  className={`py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${isCritical ? 'bg-red-500/20 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-[pulse_2s_ease-in-out_infinite] border border-red-500/30' : 'text-muted-foreground hover:text-white'}`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  CRITICAL
                </button>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div className="relative">
                  <input 
                    {...form.register("name")}
                    placeholder="Patient Name"
                    className="w-full px-5 py-4 rounded-2xl border border-border bg-card/50 text-white placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/50 focus:bg-card outline-none transition-all text-sm shadow-sm"
                  />
                  {form.formState.errors.name && <span className="absolute right-4 top-4 text-xs text-primary">{form.formState.errors.name.message}</span>}
                </div>

                {/* Blood Group Grid */}
                <div className="space-y-3">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider ml-1">Blood Group Needed</label>
                  <div className="grid grid-cols-4 gap-2">
                    {bloodGroups.map(bg => (
                      <button
                        key={bg}
                        type="button"
                        onClick={() => form.setValue("bloodGroup", bg)}
                        className={`py-3 rounded-2xl text-sm font-bold transition-all border ${
                          form.watch("bloodGroup") === bg 
                            ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30 scale-[1.02]' 
                            : 'bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-white'
                        }`}
                      >
                        {bg}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input 
                    {...form.register("cancerType")}
                    placeholder="Diagnosis"
                    className="w-full px-5 py-4 rounded-2xl border border-border bg-card/50 text-white placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/50 outline-none transition-all text-sm shadow-sm"
                  />
                  <input 
                    {...form.register("phone")}
                    placeholder="Phone"
                    className="w-full px-5 py-4 rounded-2xl border border-border bg-card/50 text-white placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/50 outline-none transition-all text-sm shadow-sm"
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <input 
                    readOnly
                    value="Mumbai, Maharashtra"
                    className="w-full pl-12 pr-5 py-4 rounded-2xl border border-border bg-card/50 text-white outline-none text-sm cursor-not-allowed opacity-70 shadow-sm"
                  />
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={createRequest.isPending}
                className={`w-full py-4 rounded-2xl font-bold text-white shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2 ${
                  isCritical 
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 shadow-red-500/30' 
                    : 'bg-gradient-to-r from-primary to-primary/80 shadow-primary/30'
                }`}
              >
                {createRequest.isPending ? "Searching Donors..." : "Find Matches Now"}
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
