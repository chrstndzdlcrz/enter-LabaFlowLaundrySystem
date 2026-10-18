import { LogOut, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

export function AccountInactive() {
  const { signOut, profile } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-breeze p-6">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warning/10 text-warning">
            <ShieldAlert className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <h1 className="font-display text-xl font-bold">This account is deactivated</h1>
            <p className="text-sm text-muted-foreground">
              {profile?.email ?? "Your account"} has been switched off by the shop owner. Ask an
              administrator to reactivate it if this is unexpected.
            </p>
          </div>
          <Button variant="outline" onClick={() => void signOut()}>
            <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
