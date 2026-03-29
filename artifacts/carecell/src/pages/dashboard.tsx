import { useState } from "react";
import { useEmergencyRequests, useAlerts, useChangeRequestStatus } from "@/hooks/use-requests";
import { format } from "date-fns";
import { Activity, Radio, AlertTriangle, CheckCircle2, XCircle, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Dashboard() {
  const [tab, setTab] = useState<'requests' | 'alerts'>('requests');
  const { data: requests, isLoading: reqLoading } = useEmergencyRequests(true);
  const { data: alerts, isLoading: alertLoading } = useAlerts(true);
  const updateStatus = useChangeRequestStatus();

  return (
    <div className="p-5 flex flex-col h-full gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            Operations
          </h1>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
            </span>
            <span className="text-xs font-medium text-primary uppercase tracking-wider">LIVE DATA</span>
          </div>
        </div>
      </div>

      <div className="flex bg-card/80 p-1.5 rounded-xl border border-border backdrop-blur-sm">
        <button 
          onClick={() => setTab('requests')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${tab === 'requests' ? 'bg-secondary text-white shadow-sm' : 'text-muted-foreground hover:text-white'}`}
        >
          Requests ({requests?.length || 0})
        </button>
        <button 
          onClick={() => setTab('alerts')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${tab === 'alerts' ? 'bg-secondary text-white shadow-sm' : 'text-muted-foreground hover:text-white'}`}
        >
          Alerts
        </button>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar pb-8">
        <AnimatePresence mode="wait">
          {tab === 'requests' ? (
            <motion.div key="requests" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
              {reqLoading ? (
                <div className="h-32 bg-card rounded-3xl animate-pulse" />
              ) : requests?.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-border rounded-3xl">
                  <Activity className="w-10 h-10 text-muted-foreground mb-3 opacity-30" />
                  <p className="text-muted-foreground text-sm font-medium">No active requests</p>
                </div>
              ) : (
                requests?.map((req) => (
                  <motion.div whileTap={{ scale: 0.98 }} key={req.id} className="bg-card rounded-[24px] p-5 border border-border shadow-md relative overflow-hidden group">
                    {req.urgency === 'critical' && <div className="absolute top-0 left-0 w-1 h-full bg-primary" />}
                    
                    <div className="flex justify-between items-start mb-4 pl-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-white text-lg">{req.patientName}</h3>
                          {req.urgency === 'critical' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary border border-primary/30 flex items-center gap-1 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                              <AlertTriangle className="w-3 h-3" /> CRITICAL
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> {format(new Date(req.createdAt), "HH:mm")}
                        </p>
                      </div>
                      <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center border border-border font-bold text-white shadow-sm">
                        {req.bloodGroup}
                      </div>
                    </div>
                    
                    <div className="pl-2 flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                      <span className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider
                        ${req.status === 'active' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 
                          req.status === 'fulfilled' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
                          req.status === 'cancelled' ? 'bg-secondary text-muted-foreground' : 
                          'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}
                      >
                        {req.status}
                      </span>
                      
                      {req.status !== 'fulfilled' && req.status !== 'cancelled' && (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => updateStatus.mutateAsync({ id: req.id, status: 'fulfilled' })}
                            className="w-10 h-10 flex items-center justify-center bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-xl transition-colors border border-green-500/20"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => updateStatus.mutateAsync({ id: req.id, status: 'cancelled' })}
                            className="w-10 h-10 flex items-center justify-center bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-white rounded-xl transition-colors border border-border"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          ) : (
            <motion.div key="alerts" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
              {alertLoading ? (
                <div className="h-20 bg-card rounded-2xl animate-pulse" />
              ) : alerts?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dashed border-border rounded-3xl">No alerts dispatched.</div>
              ) : (
                alerts?.map((alert) => (
                  <motion.div whileHover={{ scale: 0.98 }} key={alert.id} className={`p-4 rounded-[20px] border flex items-center gap-4 shadow-sm ${alert.urgency === 'critical' ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'}`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${alert.urgency === 'critical' ? 'bg-primary/20 text-primary shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-secondary text-white'}`}>
                      <Radio className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="font-semibold text-white text-sm truncate">To: {alert.donorName}</h4>
                        <span className="text-[10px] text-muted-foreground font-medium">{format(new Date(alert.sentAt), "HH:mm")}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {alert.patientName} • <span className="font-bold text-white">{alert.bloodGroup}</span> • {alert.distanceKm.toFixed(1)}km
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
