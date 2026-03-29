import { cn } from "@/lib/utils";
import type { BloodGroup } from "@workspace/api-client-react";

export function BloodGroupBadge({ group, className }: { group: BloodGroup, className?: string }) {
  // Medical red accent for blood groups
  return (
    <span className={cn(
      "inline-flex items-center justify-center px-2.5 py-1 rounded-md text-sm font-bold",
      "bg-primary/10 text-primary border border-primary/20 shadow-sm",
      className
    )}>
      {group}
    </span>
  );
}
