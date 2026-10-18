import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const DISMISSED_KEY = "labaflow-install-hint-dismissed";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Invites the customer to install LabaFlow as an app.
 *
 * Chromium browsers hand over an install prompt we can trigger; iOS Safari has no
 * such API, so it gets the manual Share-menu instruction instead. The hint is
 * dismissible and never appears when the app already runs installed.
 */
export function InstallAppHint() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY) === "1") return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    setDismissed(false);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const isIos = /iPad|iPhone|iPod/.test(window.navigator.userAgent);
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(window.navigator.userAgent);
    if (isIos && isSafari) setShowIosHint(true);

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  };

  if (dismissed || (!installEvent && !showIosHint)) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="flex items-center gap-2 font-display font-semibold text-foreground">
            {showIosHint ? (
              <Share className="h-4 w-4 text-primary" aria-hidden="true" />
            ) : (
              <Download className="h-4 w-4 text-primary" aria-hidden="true" />
            )}
            Keep LabaFlow on your home screen
          </p>
          <p className="text-sm text-muted-foreground">
            {showIosHint
              ? "Tap the Share button in Safari, then choose “Add to Home Screen” for one-tap access to your orders."
              : "Install LabaFlow so checking your laundry takes one tap, like any other app."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {installEvent ? (
            <Button
              onClick={() => {
                void installEvent.prompt();
                void installEvent.userChoice.finally(() => setInstallEvent(null));
              }}
            >
              Install app
            </Button>
          ) : null}
          <Button variant="ghost" size="icon" onClick={dismiss} aria-label="Dismiss install hint">
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
