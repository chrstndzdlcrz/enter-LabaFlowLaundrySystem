import { BellRing, MessageSquare, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNotifications } from "@/hooks/use-notifications";
import { flashSuccess } from "@/lib/alerts";

/**
 * Asks for notification permission at a point where the reason is obvious, and
 * says plainly what the notifications are for.
 */
export function NotificationPermissionCard() {
  const { permission, requestPermission } = useNotifications();

  if (permission === "granted" || permission === "unsupported") return null;

  const explain = async () => {
    const result = await requestPermission();
    if (result === "granted") flashSuccess("Browser notifications are on");
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="flex items-center gap-2 font-display font-semibold text-foreground">
            <BellRing className="h-4 w-4 text-primary" aria-hidden="true" />
            Get told when your laundry is ready
          </p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Package className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Ready-for-pick-up alerts for your own orders
            </li>
            <li className="flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Replies from shop staff in your chat
            </li>
          </ul>
          <p className="text-xs text-muted-foreground">
            {permission === "denied"
              ? "Your browser is currently blocking notifications. You can allow them in your browser's site settings for this page."
              : "We only send updates about your own orders — never marketing."}
          </p>
        </div>
        <Button onClick={() => void explain()} disabled={permission === "denied"}>
          {permission === "denied" ? "Blocked in browser" : "Allow notifications"}
        </Button>
      </CardContent>
    </Card>
  );
}
