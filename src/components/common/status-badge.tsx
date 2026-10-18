import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_META, type OrderStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

const TONE_CLASSES: Record<string, string> = {
  neutral: "border-border bg-secondary text-secondary-foreground",
  info: "border-info/30 bg-info/10 text-info",
  progress: "border-primary/30 bg-primary/10 text-primary",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/35 bg-warning/10 text-warning",
  danger: "border-destructive/30 bg-destructive/10 text-destructive",
};

export function StatusBadge({
  status,
  showLabel = false,
  className,
}: {
  status: OrderStatus;
  /** Show the descriptive label instead of the short one. */
  showLabel?: boolean;
  className?: string;
}) {
  const meta = ORDER_STATUS_META[status];
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full border font-medium", TONE_CLASSES[meta.tone], className)}
    >
      {showLabel ? meta.label : meta.short}
    </Badge>
  );
}

export function ToneBadge({
  tone,
  children,
  className,
}: {
  tone: "neutral" | "info" | "progress" | "success" | "warning" | "danger";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("rounded-full border font-medium", TONE_CLASSES[tone], className)}>
      {children}
    </Badge>
  );
}

/** Marks values that ship as editable placeholders rather than shop-set figures. */
export function PlaceholderBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full border border-warning/40 bg-warning/10 text-[11px] text-warning", className)}
    >
      Placeholder — edit
    </Badge>
  );
}
