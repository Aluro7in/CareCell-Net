import { MapPin, Phone, Calendar, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import type { Donor } from "@workspace/api-client-react";
import { BloodGroupBadge } from "./blood-group-badge";
import { Button } from "@/components/ui/button";
import { useToggleDonorAvailability } from "@/hooks/use-donors";

export function DonorCard({ donor }: { donor: Donor }) {
  const toggleMutation = useToggleDonorAvailability();

  const handleToggle = () => {
    toggleMutation.mutateAsync({ id: donor.id, available: !donor.available });
  };

  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm hover:shadow-md transition-all duration-300 group">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-display font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
            {donor.name}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            <span>Lat: {donor.latitude.toFixed(2)}, Lng: {donor.longitude.toFixed(2)}</span>
          </div>
        </div>
        <BloodGroupBadge group={donor.bloodGroup} />
      </div>

      <div className="space-y-2 mb-6">
        <div className="flex items-center gap-2 text-sm">
          <Phone className="w-4 h-4 text-muted-foreground" />
          <span className="text-foreground">{donor.phone}</span>
        </div>
        {donor.lastDonationDate && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Last donated: {format(new Date(donor.lastDonationDate), "MMM d, yyyy")}
            </span>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {donor.available ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-green-600">Available</span>
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Unavailable</span>
            </>
          )}
        </div>
        <Button 
          variant={donor.available ? "outline" : "default"} 
          size="sm"
          onClick={handleToggle}
          disabled={toggleMutation.isPending}
          className="rounded-lg"
        >
          {toggleMutation.isPending ? "Updating..." : (donor.available ? "Mark Unavailable" : "Mark Available")}
        </Button>
      </div>
    </div>
  );
}
