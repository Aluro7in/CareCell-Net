import { MapPin, Phone, Heart } from "lucide-react";
import type { Donor } from "@workspace/api-client-react";
import { useToggleDonorAvailability } from "@/hooks/use-donors";
import { motion } from "framer-motion";

export function DonorCard({ donor }: { donor: Donor }) {
  const toggleMutation = useToggleDonorAvailability();

  const handleToggle = () => {
    toggleMutation.mutateAsync({ id: donor.id, available: !donor.available });
  };

  return (
    <div className="bg-card/80 backdrop-blur-md rounded-[24px] p-5 border border-border shadow-sm flex flex-col h-full relative overflow-hidden">
      {donor.available && <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full blur-[20px]" />}
      
      <div className="flex items-center gap-4 mb-5">
        <div className={`w-14 h-14 rounded-full flex flex-col items-center justify-center border shadow-sm shrink-0 ${donor.available ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-secondary border-border text-muted-foreground'}`}>
          <span className="font-bold text-xl leading-none">{donor.bloodGroup.replace(/[+-]/, '')}</span>
          <span className="text-xs font-bold">{donor.bloodGroup.slice(-1)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground truncate text-base leading-tight mb-1">{donor.name}</h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3 text-primary/70" />
            <span>{(donor.distanceKm || (Math.random() * 5 + 1)).toFixed(1)} km away</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-auto">
        <a href={`tel:${donor.phone}`} className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-semibold transition-colors border border-border">
          <Phone className="w-3.5 h-3.5" /> Call
        </a>
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={handleToggle}
          disabled={toggleMutation.isPending}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-semibold transition-colors border ${donor.available ? 'border-border bg-background text-muted-foreground hover:text-foreground' : 'border-green-500/30 bg-green-500/10 text-green-500'}`}
        >
          <Heart className={`w-3.5 h-3.5 ${donor.available ? '' : 'fill-current'}`} /> 
          {donor.available ? 'Rest' : 'Active'}
        </motion.button>
      </div>
    </div>
  );
}
