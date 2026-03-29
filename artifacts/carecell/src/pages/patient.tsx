import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ShieldAlert, AlertTriangle, ArrowLeft, Phone, MapPin, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Layout } from "@/components/layout";
import { useCreateEmergencyRequest } from "@/hooks/use-requests";
import { BloodGroup, Urgency } from "@workspace/api-client-react";
import { BloodGroupBadge } from "@/components/blood-group-badge";
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

export default function PatientPage() {
  const { toast } = useToast();
  const createRequest = useCreateEmergencyRequest();
  const [matchResult, setMatchResult] = useState<any>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      bloodGroup: "O+",
      cancerType: "Leukemia",
      latitude: 19.076, // Mumbai default
      longitude: 72.877,
      urgency: "normal",
      phone: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      const result = await createRequest.mutateAsync({ data });
      setMatchResult(result);
      
      if (data.urgency === "critical") {
        toast({
          title: "CRITICAL ALERT SENT",
          description: `Emergency alerts have been dispatched to ${result.matchedDonors?.length || 0} nearby donors.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Request Created",
          description: `Found ${result.matchedDonors?.length || 0} potential donors.`,
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create request. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (matchResult) {
    return (
      <Layout>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <button 
            onClick={() => setMatchResult(null)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to form
          </button>

          <div className="bg-card rounded-2xl p-8 border border-border shadow-sm mb-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-display font-bold mb-2">Request Active</h2>
            <p className="text-muted-foreground">
              We found <strong className="text-foreground">{matchResult.matchedDonors?.length || 0}</strong> compatible donors nearby.
            </p>
          </div>

          <h3 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-primary" /> Matched Donors
          </h3>
          
          <div className="grid gap-4">
            {matchResult.matchedDonors?.length > 0 ? (
              matchResult.matchedDonors.map((donor: any) => (
                <div key={donor.id} className="bg-card p-5 rounded-xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-bold text-lg">{donor.name}</h4>
                      <BloodGroupBadge group={donor.bloodGroup} />
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5"/> {donor.distanceKm.toFixed(1)} km away</span>
                      <span className="flex items-center gap-1 font-medium text-primary">Match Score: {donor.score}</span>
                    </div>
                  </div>
                  <a 
                    href={`tel:${donor.phone}`}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    Call Donor
                  </a>
                </div>
              ))
            ) : (
              <div className="text-center p-12 border-2 border-dashed border-border rounded-2xl text-muted-foreground">
                No immediate matches found. We will keep searching and alert you.
              </div>
            )}
          </div>
        </motion.div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
            <ShieldAlert className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-2">Emergency Blood Request</h1>
          <p className="text-muted-foreground text-lg">Enter patient details to instantly find nearby compatible donors.</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="bg-card p-8 rounded-2xl border border-border shadow-lg space-y-6 relative overflow-hidden">
          {form.watch("urgency") === "critical" && (
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600 animate-pulse" />
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Patient Name</label>
              <input 
                {...form.register("name")}
                className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="John Doe"
              />
              {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Blood Group</label>
              <select 
                {...form.register("bloodGroup")}
                className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              >
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cancer Type / Diagnosis</label>
              <input 
                {...form.register("cancerType")}
                className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="e.g. Leukemia"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Contact Phone</label>
              <input 
                {...form.register("phone")}
                className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="+91 9876543210"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex justify-between">
                <span>Location (Lat/Lng)</span>
                <span className="text-xs">Mumbai Defaults</span>
              </label>
              <div className="flex gap-2">
                <input 
                  type="number" step="any"
                  {...form.register("latitude")}
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
                <input 
                  type="number" step="any"
                  {...form.register("longitude")}
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2 pt-4 border-t border-border">
              <label className="text-sm font-medium flex items-center gap-2">
                Urgency Level
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className={`
                  flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all
                  ${form.watch("urgency") === "normal" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-accent/50"}
                `}>
                  <input type="radio" value="normal" {...form.register("urgency")} className="hidden" />
                  <span className="font-semibold">Normal / Scheduled</span>
                </label>
                <label className={`
                  flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all
                  ${form.watch("urgency") === "critical" ? "border-red-600 bg-red-50 text-red-600" : "border-border text-muted-foreground hover:bg-red-50/50"}
                `}>
                  <input type="radio" value="critical" {...form.register("urgency")} className="hidden" />
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-semibold">CRITICAL (Immediate)</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={createRequest.isPending}
            className="w-full py-4 rounded-xl font-bold text-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none mt-4"
          >
            {createRequest.isPending ? "Searching Donors..." : "Find Matches Now"}
          </button>
        </form>
      </div>
    </Layout>
  );
}

// Icon component needed above
function UsersIcon(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
