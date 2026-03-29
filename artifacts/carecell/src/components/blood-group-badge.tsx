import { cn } from "@/lib/utils";
import type { BloodGroup } from "@workspace/api-client-react";

export function BloodGroupBadge({ group, className }: { group: BloodGroup, className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center justify-center px-2 py-1 rounded border border-border text-[10px] font-bold text-white bg-secondary/80 backdrop-blur-md shadow-sm",
      className
    )}>
      {group}
    </span>
  );
}
