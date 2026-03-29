import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { HeartPulse, MapPin } from "lucide-react";
import { Layout } from "@/components/layout";
import { useDonors, useRegisterDonor } from "@/hooks/use-donors";
import { DonorCard } from "@/components/donor-card";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const),
  phone: z.string().min(10, "Valid phone required"),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
});

type FormValues = z.infer<typeof formSchema>;

export default function DonorPage() {
  const { toast } = useToast();
  const { data: donors, isLoading } = useDonors();
  const registerDonor = useRegisterDonor();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      bloodGroup: "O+",
      phone: "",
      latitude: 19.076, // Mumbai
      longitude: 72.877,
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      await registerDonor.mutateAsync({ 
        data: {
          ...data,
          lastDonationDate: null
        } 
      });
      toast({
        title: "Registration Successful",
        description: "Thank you for joining CareCell Network as a donor!",
      });
      form.reset();
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to register. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Registration Form */}
        <div className="lg:col-span-5">
          <div className="sticky top-24">
            <div className="mb-6">
              <h1 className="text-3xl font-display font-bold mb-2 flex items-center gap-3">
                <HeartPulse className="w-8 h-8 text-primary" />
                Become a Donor
              </h1>
              <p className="text-muted-foreground">Register to receive alerts when a cancer patient nearby needs your blood type.</p>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <input 
                  {...form.register("name")}
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="Jane Doe"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                  <label className="text-sm font-medium">Phone</label>
                  <input 
                    {...form.register("phone")}
                    className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder="Phone number"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Location (Lat/Lng)
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <input 
                    type="number" step="any"
                    {...form.register("latitude")}
                    className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm"
                  />
                  <input 
                    type="number" step="any"
                    {...form.register("longitude")}
                    className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={registerDonor.isPending}
                className="w-full py-3.5 rounded-xl font-bold bg-foreground text-background hover:bg-foreground/90 transition-all disabled:opacity-50 mt-2"
              >
                {registerDonor.isPending ? "Registering..." : "Register as Donor"}
              </button>
            </form>
          </div>
        </div>

        {/* Donors List */}
        <div className="lg:col-span-7">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-display font-bold">Registered Donors</h2>
            <span className="px-3 py-1 rounded-full bg-accent text-primary text-sm font-semibold">
              {donors?.length || 0} Total
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1,2,3].map(i => (
                <div key={i} className="h-32 bg-card border border-border rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4">
              {donors?.map(donor => (
                <DonorCard key={donor.id} donor={donor} />
              ))}
              {donors?.length === 0 && (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-2xl">
                  No donors registered yet.
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}
