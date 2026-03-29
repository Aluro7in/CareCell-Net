import { Layout } from "@/components/layout";
import { useEmergencyRequests, useAlerts, useChangeRequestStatus } from "@/hooks/use-requests";
import { format } from "date-fns";
import { Activity, Radio, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { BloodGroupBadge } from "@/components/blood-group-badge";
import { motion } from "framer-motion";

export default function Dashboard() {
  // Real-time polling enabled
  const { data: requests, isLoading: reqLoading } = useEmergencyRequests(true);
  const { data: alerts, isLoading: alertLoading } = useAlerts(true);
  const updateStatus = useChangeRequestStatus();

  return (
    <Layout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <LayoutDashboardIcon className="w-8 h-8 text-primary" />
            Live Operations
          </h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <Radio className="w-4 h-4 text-green-500 animate-pulse" /> Live polling active
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Requests */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2 border-b border-border pb-3">
            <Activity className="w-5 h-5" /> Recent Requests
          </h2>
          
          <div className="space-y-4">
            {reqLoading ? (
              <div className="h-48 bg-card rounded-2xl animate-pulse" />
            ) : requests?.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No active requests.</p>
            ) : (
              requests?.map((req) => (
                <div key={req.id} className="bg-card rounded-2xl p-5 border border-border shadow-sm flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold text-lg">{req.patientName}</span>
                      <BloodGroupBadge group={req.bloodGroup} />
                      {req.urgency === 'critical' && (
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-600 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> CRITICAL
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Diagnosis: {req.cancerType}</p>
                      <p>Time: {format(new Date(req.createdAt), "MMM d, HH:mm")}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col justify-between items-end gap-3 border-l border-border pl-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                      ${req.status === 'active' ? 'bg-blue-100 text-blue-700' : 
                        req.status === 'fulfilled' ? 'bg-green-100 text-green-700' : 
                        req.status === 'cancelled' ? 'bg-gray-100 text-gray-700' : 
                        'bg-yellow-100 text-yellow-700'}`}
                    >
                      {req.status}
                    </span>
                    
                    {req.status !== 'fulfilled' && req.status !== 'cancelled' && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => updateStatus.mutateAsync({ id: req.id, status: 'fulfilled' })}
                          className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                          title="Mark Fulfilled"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => updateStatus.mutateAsync({ id: req.id, status: 'cancelled' })}
                          className="p-2 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Cancel"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live Alerts Feed */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2 border-b border-border pb-3">
            <Radio className="w-5 h-5 text-primary" /> Alert Dispatch Feed
          </h2>
          
          <div className="bg-card rounded-2xl border border-border shadow-sm p-4 min-h-[500px] overflow-y-auto">
            {alertLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
              </div>
            ) : alerts?.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">No alerts dispatched yet.</p>
            ) : (
              <div className="space-y-3">
                {alerts?.map((alert, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    key={alert.id} 
                    className={`p-3 rounded-xl border text-sm ${
                      alert.urgency === 'critical' 
                        ? 'bg-red-50 border-red-100' 
                        : 'bg-accent/30 border-accent-border'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-foreground">Alert to {alert.donorName}</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(alert.sentAt), "HH:mm:ss")}</span>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      For: {alert.patientName} ({alert.bloodGroup}) • {alert.distanceKm.toFixed(1)}km away
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function LayoutDashboardIcon(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
}
