import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Shown when a screen throws at runtime: a plain explanation and a way to carry on,
 * instead of a blank page or a developer message. Used by the app-wide error
 * boundary and by the router itself.
 */
export function UnexpectedErrorCard({ detail }: { detail?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-breeze px-4">
      <Card className="w-full max-w-md border-border/80 shadow-elegant">
        <CardContent className="space-y-4 p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <h1 className="font-display text-lg font-bold text-foreground">
              Something went wrong on this screen
            </h1>
            <p className="text-sm text-muted-foreground">
              Your data is safe. Reload to carry on — if it keeps happening, message the shop and tell
              them what you were doing when it appeared.
            </p>
            {detail ? (
              <p className="pt-1 text-[11px] text-muted-foreground/80">{detail}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Reload the page
            </Button>
            <Button variant="outline" onClick={() => window.location.assign("/")}>
              Back to the home page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
