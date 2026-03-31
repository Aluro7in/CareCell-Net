import { Link, useLocation } from "wouter";
import {
  HeartPulse, Droplets, Sparkles, Sun, Moon,
  Home, MapPin, User, LogOut, MessageCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/context/theme-context";
import { useAuth } from "@/context/auth-context";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, toggle } = useTheme();
  const { isAuthenticated, logout, user } = useAuth();

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/patient", label: "Request", icon: HeartPulse },
    { href: "/map", label: "Map", icon: MapPin },
    { href: "/donor", label: "Donate", icon: Droplets },
    { href: "/chat", label: "Chat", icon: MessageCircle },
    { href: "/ai", label: "AI", icon: Sparkles },
    { href: "/profile", label: "Profile", icon: User },
  ];

  const isMapPage = location === "/map";
  const isAuthPage = location === "/login" || location === "/signup";

  return (
    <div className={cn(
      "min-h-screen flex justify-center overflow-hidden font-sans transition-colors duration-300",
      theme === "light" ? "bg-slate-200" : "bg-[#050811]"
    )}>
      <div className={cn(
        "w-full max-w-[430px] min-h-screen relative flex flex-col shadow-2xl overflow-hidden ring-1 transition-colors duration-300",
        theme === "light" ? "bg-background ring-border/30" : "bg-background ring-border/50"
      )}>
        {!isMapPage && !isAuthPage && (
          <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl border-b border-border/50 transition-colors duration-300">
            <div className="flex items-center justify-between h-16 px-5">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                  <HeartPulse className="w-5 h-5 text-white" />
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span className="font-display font-black text-xl tracking-tight text-foreground">CareCell</span>
                  <span className="font-display font-black text-xl tracking-tight" style={{ background: "linear-gradient(135deg,#6366f1,#22c55e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    &nbsp;Net
                  </span>
                </div>
              </Link>

              <div className="flex items-center gap-2">
                {/* Theme toggle */}
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={toggle}
                  className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center border transition-all duration-300",
                    theme === "light"
                      ? "bg-amber-50 border-amber-200 text-amber-500 hover:bg-amber-100"
                      : "bg-card border-border/50 text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-400/40"
                  )}
                  title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {theme === "light" ? (
                      <motion.div key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                        <Sun className="w-4.5 h-4.5" />
                      </motion.div>
                    ) : (
                      <motion.div key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                        <Moon className="w-4.5 h-4.5" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>

                {/* Profile avatar / logout */}
                {isAuthenticated ? (
                  <div className="flex items-center gap-1.5">
                    <Link href="/profile">
                      <motion.div
                        whileTap={{ scale: 0.88 }}
                        className={cn(
                          "w-10 h-10 rounded-2xl flex items-center justify-center border transition-all duration-300 cursor-pointer",
                          location === "/profile"
                            ? "bg-gradient-to-br from-indigo-500 to-emerald-500 border-transparent shadow-md shadow-indigo-500/25 text-white"
                            : "bg-card border-border/50 text-muted-foreground hover:border-indigo-400/40 hover:text-indigo-400"
                        )}
                        title={user?.name ?? "Profile"}
                      >
                        <User className="w-4.5 h-4.5" />
                      </motion.div>
                    </Link>
                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      onClick={logout}
                      className="w-10 h-10 rounded-2xl flex items-center justify-center border bg-card border-border/50 text-muted-foreground hover:border-red-400/40 hover:text-red-400 transition-all duration-300"
                      title="Sign out"
                    >
                      <LogOut className="w-4 h-4" />
                    </motion.button>
                  </div>
                ) : (
                  <Link href="/login">
                    <motion.div
                      whileTap={{ scale: 0.88 }}
                      className="w-10 h-10 rounded-2xl flex items-center justify-center border bg-card border-border/50 text-muted-foreground hover:border-indigo-400/40 hover:text-indigo-400 transition-all duration-300 cursor-pointer"
                    >
                      <User className="w-4.5 h-4.5" />
                    </motion.div>
                  </Link>
                )}
              </div>
            </div>
          </header>
        )}

        <main className={cn(
          "flex-1 w-full scroll-smooth transition-colors duration-300",
          isMapPage ? "overflow-hidden pb-[72px]"
            : isAuthPage ? "overflow-y-auto"
            : "overflow-y-auto pb-[72px]"
        )}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 14, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, scale: 0.985 }}
              transition={{ duration: 0.28, type: "spring", bounce: 0.08 }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Bottom nav — hidden on auth pages */}
        {!isAuthPage && (
          <nav className="absolute bottom-0 left-0 right-0 z-[700] bg-card/95 backdrop-blur-xl border-t border-border/40 pb-safe shadow-[0_-12px_40px_rgba(0,0,0,0.25)] transition-colors duration-300">
            <div className="flex items-center justify-around px-0.5 py-2.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="relative flex flex-col items-center justify-center flex-1 gap-0.5 py-0.5"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute -top-2.5 w-6 h-0.5 rounded-b-full bg-gradient-to-r from-indigo-500 to-emerald-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"
                      />
                    )}
                    <motion.div
                      whileTap={{ scale: 0.78 }}
                      className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200",
                        isActive ? "bg-gradient-to-br from-indigo-500/15 to-emerald-500/15" : "hover:bg-secondary/50"
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-[18px] h-[18px] transition-colors duration-200",
                          isActive
                            ? "text-indigo-400 drop-shadow-[0_0_6px_rgba(99,102,241,0.5)]"
                            : "text-muted-foreground"
                        )}
                      />
                    </motion.div>
                    <span className={cn(
                      "text-[9px] font-semibold transition-colors duration-200",
                      isActive ? "text-indigo-400" : "text-muted-foreground"
                    )}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
