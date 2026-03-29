import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { HeartPulse, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useDonors, useRegisterDonor } from "@/hooks/use-donors";
import { DonorCard } from "@/components/donor-card";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

const formSchema = z.object({
  name: z.string().min(2, "Required"),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const),
  phone: z.string().min(10, "Required"),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
});

type FormValues = z.infer<typeof formSchema>;
const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

export default function DonorPage() {
  const { toast } = useToast();
  const { data: donors, isLoading } = useDonors();
  const registerDonor = useRegisterDonor();
  const [isAvailable, setIsAvailable] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      bloodGroup: "O+",
      phone: "",
      latitude: 19.076,
      longitude: 72.877,
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      await registerDonor.mutateAsync({ 
        data: { ...data, lastDonationDate: null, available: isAvailable } 
      });
      toast({ title: "Registration Successful", description: "You are now a registered donor!" });
      form.reset();
    } catch (err) {
      toast({ title: "Error", description: "Failed to register.", variant: "destructive" });
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-8 pb-8">
      <div className="px-5 pt-4">
        <div className="bg-card border border-border rounded-[28px] p-6 shadow-xl relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-primary/20 rounded-full blur-[40px] pointer-events-none" />
          
          <div className="flex items-center justify-between mb-6 relative z-10">
            <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
              <HeartPulse className="w-6 h-6 text-primary drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" /> Be a Donor
            </h1>
            <div className="flex items-center gap-2.5 bg-secondary/80 backdrop-blur-sm px-3.5 py-2 rounded-full border border-border shadow-sm">
              <span className="text-xs font-semibold text-white">Available</span>
              <Switch checked={isAvailable} onCheckedChange={setIsAvailable} className="data-[state=checked]:bg-primary" />
            </div>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 relative z-10">
            <input 
              {...form.register("name")}
              placeholder="Full Name"
              className="w-full px-5 py-4 rounded-2xl border border-border bg-background/50 text-white placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/50 outline-none transition-all text-sm shadow-sm"
            />

            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider ml-1">Blood Group</label>
              <div className="grid grid-cols-4 gap-2">
                {bloodGroups.map(bg => (
                  <button
                    key={bg}
                    type="button"
                    onClick={() => form.setValue("bloodGroup", bg)}
                    className={`py-3 rounded-xl text-sm font-bold transition-all border ${
                      form.watch("bloodGroup") === bg 
                        ? 'bg-primary border-primary text-white shadow-md shadow-primary/20 scale-105' 
                        : 'bg-background/50 border-border text-muted-foreground hover:border-primary/50 hover:text-white'
                    }`}
                  >
                    {bg}
                  </button>
                ))}
              </div>
            </div>

            <input 
              {...form.register("phone")}
              placeholder="Phone Number"
              className="w-full px-5 py-4 rounded-2xl border border-border bg-background/50 text-white placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/50 outline-none transition-all text-sm shadow-sm"
            />

            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={registerDonor.isPending}
              className="w-full py-4 rounded-2xl font-bold text-background bg-white shadow-xl transition-all disabled:opacity-50 mt-2"
            >
              {registerDonor.isPending ? "Joining..." : "Join Network"}
            </motion.button>
          </form>
        </div>
      </div>

      <div className="pl-5 space-y-4">
        <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-muted-foreground" /> Nearby Donors
        </h2>
        
        <div className="flex gap-4 overflow-x-auto pb-6 pr-5 snap-x snap-mandatory hide-scrollbar">
          {isLoading ? (
            [1,2,3].map(i => (
              <div key={i} className="min-w-[280px] h-36 bg-card border border-border rounded-3xl animate-pulse snap-center shrink-0" />
            ))
          ) : (
            donors?.map(donor => (
              <div key={donor.id} className="min-w-[280px] snap-center shrink-0">
                <DonorCard donor={donor} />
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
