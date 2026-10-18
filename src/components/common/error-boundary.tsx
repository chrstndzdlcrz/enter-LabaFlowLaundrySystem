import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Last line of defence for the interface.
 *
 * A runtime error in one screen should never leave a customer or the counter
 * staring at a blank page: they get a plain explanation and a way to carry on.
 * The technical detail goes to the console for diagnosis.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Lab a Day: unexpected error in the interface", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

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
                Your data is safe. Reload to carry on — if it keeps happening, message the shop or tell
                the owner what you were doing when it appeared.
              </p>
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
}
