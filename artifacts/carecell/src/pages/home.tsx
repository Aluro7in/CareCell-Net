import { Link } from "wouter";
import { ShieldAlert, Droplets, Activity, Bell, MapPin, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useDonors } from "@/hooks/use-donors";
import { useEmergencyRequests } from "@/hooks/use-requests";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function Home() {
  const { data: donors } = useDonors();
  const { data: requests } = useEmergencyRequests();

  const activeRequests = requests?.filter(r => r.status === 'active' || r.status === 'pending').length || 0;
  const availableDonors = donors?.filter(d => d.available).length || 0;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="p-5 flex flex-col gap-8">
      {/* Hero */}
      <motion.div variants={item} className="relative mt-2">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent blur-3xl -z-10 rounded-full" />
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 text-primary-foreground mb-6 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-bold tracking-wide uppercase">AI-Powered Emergency Network</span>
        </div>
        
        <h1 className="text-4xl font-display font-extrabold leading-[1.15] tracking-tight mb-4 text-white">
          Connecting Cancer Patients with <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Lifesaving</span> Donors
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed mb-8">
          When every second counts, smart matching finds nearby blood and platelet donors for critical patients instantly.
        </p>
      </motion.div>

      {/* CTAs */}
      <motion.div variants={item} className="grid grid-cols-2 gap-4">
        <Link href="/patient">
          <motion.div whileTap={{ scale: 0.95 }} className="h-full flex flex-col justify-between p-5 rounded-[24px] bg-gradient-to-br from-primary to-rose-600 shadow-lg shadow-primary/25 border border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <ShieldAlert className="w-16 h-16" />
            </div>
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-6 z-10">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div className="z-10">
              <h3 className="font-bold text-white text-lg leading-tight">I Need<br/>Help Now</h3>
            </div>
          </motion.div>
        </Link>
        
        <Link href="/donor">
          <motion.div whileTap={{ scale: 0.95 }} className="h-full flex flex-col justify-between p-5 rounded-[24px] bg-card border border-border shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Droplets className="w-16 h-16" />
            </div>
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mb-6 z-10">
              <Droplets className="w-5 h-5 text-primary" />
            </div>
            <div className="z-10">
              <h3 className="font-bold text-white text-lg leading-tight">I Want to<br/>Donate</h3>
            </div>
          </motion.div>
        </Link>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="flex items-center justify-between px-2 bg-card/50 p-4 rounded-3xl border border-border">
        <div className="text-center w-full">
          <p className="text-3xl font-display font-bold text-white">{availableDonors}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-1">Donors</p>
        </div>
        <div className="w-px h-10 bg-border" />
        <div className="text-center w-full">
          <p className="text-3xl font-display font-bold text-white">{activeRequests}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-1">Hospitals</p>
        </div>
        <div className="w-px h-10 bg-border" />
        <div className="text-center w-full">
          <p className="text-3xl font-display font-bold text-white">14</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-1">Cities</p>
        </div>
      </motion.div>

      {/* Features */}
      <motion.div variants={item} className="space-y-4 pb-4">
        <div className="p-4 rounded-3xl bg-card border border-border flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm mb-0.5">AI Matching</h4>
            <p className="text-xs text-muted-foreground">Finds perfect donor in milliseconds</p>
          </div>
        </div>
        
        <div className="p-4 rounded-3xl bg-card border border-border flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0">
            <Bell className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm mb-0.5">Instant Alerts</h4>
            <p className="text-xs text-muted-foreground">Automated SMS to nearby heroes</p>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-card border border-border flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <MapPin className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm mb-0.5">Priority Routing</h4>
            <p className="text-xs text-muted-foreground">Direct GPS navigation to hospital</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
