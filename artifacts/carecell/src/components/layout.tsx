import { Link, useLocation } from "wouter";
import { HeartPulse, Droplets, Sparkles, Bell, Home, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/patient", label: "Request", icon: HeartPulse },
    { href: "/map", label: "Map", icon: MapPin },
    { href: "/donor", label: "Donate", icon: Droplets },
    { href: "/ai", label: "AI", icon: Sparkles },
  ];

  const isMapPage = location === "/map";

  return (
    <div className="min-h-screen bg-[#050811] text-foreground flex justify-center overflow-hidden font-sans">
      <div className="w-full max-w-[430px] min-h-screen relative bg-background flex flex-col shadow-2xl overflow-hidden ring-1 ring-border/50">
        {!isMapPage && (
          <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl border-b border-border/50">
            <div className="flex items-center justify-between h-16 px-5">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                  <HeartPulse className="w-4 h-4 text-white" />
                </div>
                <span className="font-display font-bold text-xl tracking-tight text-white">
                  CareCell
                </span>
              </Link>
              <motion.button whileTap={{ scale: 0.9 }} className="relative w-10 h-10 rounded-full flex items-center justify-center bg-card text-muted-foreground border border-border/50 shadow-sm">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
              </motion.button>
            </div>
          </header>
        )}

        <main className={cn("flex-1 w-full scroll-smooth overflow-hidden", isMapPage ? "pb-[72px]" : "overflow-y-auto pb-[72px]")}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.98 }}
              transition={{ duration: 0.3, type: "spring", bounce: 0.1 }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        <nav className="absolute bottom-0 left-0 right-0 z-[700] bg-card/95 backdrop-blur-xl border-t border-border/50 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-around px-2 py-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative flex flex-col items-center justify-center w-14 gap-1"
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute -top-3 w-8 h-1 rounded-b-full bg-primary shadow-[0_0_10px_rgba(239,68,68,0.6)]"
                    />
                  )}
                  <motion.div whileTap={{ scale: 0.85 }}>
                    <Icon
                      className={cn(
                        "w-6 h-6 transition-colors duration-300",
                        isActive
                          ? "text-primary drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                          : "text-muted-foreground"
                      )}
                    />
                  </motion.div>
                  <span className={cn("text-[10px] font-medium transition-colors", isActive ? "text-primary" : "text-muted-foreground")}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
