import { Loader2 } from "lucide-react";

export function LoadingState({ label = "Loading…", className = "" }: { label?: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground ${className}`}>
      <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function FullPageLoader({ label = "Preparing your dashboard…" }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-background">
      <LoadingState label={label} />
    </div>
  );
}
