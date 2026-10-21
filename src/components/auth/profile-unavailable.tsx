import { useState } from "react";
import { UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

/**
 * Shown when the sign-in worked but the shop profile did not come back. Without
 * this the screen would sit on "Setting up your account…" forever, with no way
 * out but a reload.
 */
export function ProfileUnavailable() {
  const { refreshProfile, signOut } = useAuth();
  const [retrying, setRetrying] = useState(false);

  const retry = async () => {
    setRetrying(true);
    await refreshProfile().catch(() => undefined);
    setRetrying(false);
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border/80 shadow-elegant">
        <CardContent className="space-y-4 p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <UserX className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <h1 className="font-display text-lg font-bold text-foreground">
              We could not load your account
            </h1>
            <p className="text-sm text-muted-foreground">
              Your sign-in worked, but your shop profile did not come back. Try again — if it keeps
              happening, sign in afresh.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={() => void retry()} disabled={retrying}>
              {retrying ? "Trying again…" : "Try again"}
            </Button>
            <Button variant="outline" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
