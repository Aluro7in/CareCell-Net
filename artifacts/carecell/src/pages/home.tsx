import { Link } from "wouter";
import { ShieldAlert, HeartPulse, Activity, Users, Building2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Layout } from "@/components/layout";
import { useDonors } from "@/hooks/use-donors";
import { useEmergencyRequests } from "@/hooks/use-requests";

export default function Home() {
  const { data: donors } = useDonors();
  const { data: requests } = useEmergencyRequests();

  const activeRequests = requests?.filter(r => r.status === 'active' || r.status === 'pending').length || 0;
  const availableDonors = donors?.filter(d => d.available).length || 0;

  return (
    <Layout>
      <div className="flex flex-col gap-16 pb-16">
        {/* Hero Section */}
        <section className="relative rounded-3xl overflow-hidden bg-foreground text-background">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`}
            alt="Medical background" 
            className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground via-foreground/90 to-transparent" />
          
          <div className="relative z-10 p-8 md:p-16 lg:p-24 max-w-3xl">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary-foreground mb-6 border border-primary/30">
                <Activity className="w-4 h-4" />
                <span className="text-sm font-medium">AI-Powered Emergency Network</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-display font-bold leading-tight mb-6">
                Connecting Cancer Patients with Lifesaving Donors.
              </h1>
              <p className="text-lg md:text-xl text-muted/80 mb-10 max-w-2xl leading-relaxed">
                When every second counts, CareCell Network uses smart matching to find nearby blood and platelet donors for critical cancer patients instantly.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  href="/patient" 
                  className="px-8 py-4 rounded-xl font-bold text-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
                >
                  <ShieldAlert className="w-5 h-5" />
                  I Need Help Now
                </Link>
                <Link 
                  href="/donor" 
                  className="px-8 py-4 rounded-xl font-bold text-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
                >
                  <HeartPulse className="w-5 h-5" />
                  I Want to Donate
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-card rounded-2xl p-8 border border-border shadow-sm flex items-center gap-6"
          >
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-7 h-7 text-red-600" />
            </div>
            <div>
              <p className="text-3xl font-display font-bold text-foreground">{activeRequests}</p>
              <p className="text-muted-foreground font-medium">Active Requests</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-card rounded-2xl p-8 border border-border shadow-sm flex items-center gap-6"
          >
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <Users className="w-7 h-7 text-green-600" />
            </div>
            <div>
              <p className="text-3xl font-display font-bold text-foreground">{availableDonors}</p>
              <p className="text-muted-foreground font-medium">Available Donors</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-card rounded-2xl p-8 border border-border shadow-sm flex items-center gap-6"
          >
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <Building2 className="w-7 h-7 text-blue-600" />
            </div>
            <div>
              <p className="text-3xl font-display font-bold text-foreground">12</p>
              <p className="text-muted-foreground font-medium">Partner Hospitals</p>
            </div>
          </motion.div>
        </section>

        {/* Features */}
        <section className="text-center max-w-3xl mx-auto pt-8">
          <h2 className="text-3xl font-display font-bold mb-4">How CareCell Works</h2>
          <p className="text-muted-foreground text-lg mb-8">Our intelligent platform ensures patients get the exact help they need, precisely when they need it.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            <div className="bg-gradient-to-br from-accent to-transparent p-6 rounded-2xl border border-accent-border">
              <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center mb-4">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold mb-2">Smart Matching</h3>
              <p className="text-muted-foreground">AI calculates distance, blood type compatibility, and donor history to find the perfect match instantly.</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-transparent p-6 rounded-2xl border border-blue-100">
              <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center mb-4">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold mb-2">Emergency Alerts</h3>
              <p className="text-muted-foreground">Critical patients trigger automated SMS and app alerts to nearby eligible donors bypassing regular queues.</p>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
