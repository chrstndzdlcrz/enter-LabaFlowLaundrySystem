import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/common/status-badge";
import { dispatchPush, findNotificationForOrder } from "@/lib/api/notifications";
import { updateOrderStatus } from "@/lib/api/orders";
import { ORDER_STATUS_META, ORDER_TRANSITIONS, type OrderStatus } from "@/lib/constants";
import { alertError, alertSuccess, confirmAction, errorMessageFrom, flashSuccess } from "@/lib/alerts";
import { cn } from "@/lib/utils";

/**
 * Moves an order along the lifecycle. The backend validates the transition, and
 * when the order becomes ready the push attempt is reported exactly as the
 * backend answered it - never as "delivered" when it was not.
 */
export function StatusUpdateDialog({
  orderId,
  orderCode,
  status,
  trigger,
}: {
  orderId: string;
  orderCode: string;
  status: OrderStatus;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const queryClient = useQueryClient();

  const nextStatuses = ORDER_TRANSITIONS[status];

  const mutation = useMutation({
    mutationFn: async (nextStatus: OrderStatus) => {
      const confirmed = await confirmAction({
        title: `Move ${orderCode} to “${ORDER_STATUS_META[nextStatus].short}”?`,
        text: `The customer will see this in their order history.${
          nextStatus === "ready_for_pickup" ? " A ready-for-pick-up notification is created for them." : ""
        }`,
        confirmLabel: "Update status",
        danger: nextStatus === "cancelled",
      });
      if (!confirmed) return null;

      await updateOrderStatus(orderId, nextStatus, note);

      let pushNote = "";
      if (nextStatus === "ready_for_pickup") {
        try {
          const notification = await findNotificationForOrder(orderId);
          if (notification) {
            const result = await dispatchPush(notification.id);
            pushNote =
              result.push_status === "sent"
                ? `Push delivered to ${result.delivered ?? 0} device(s).`
                : result.push_status === "not_configured"
                  ? "Logged in the customer's LabaFlow notifications. Background push is not configured for this shop yet."
                  : result.push_status === "skipped"
                    ? `Recorded in-app only (${result.push_error ?? "no registered device"}).`
                    : `Push delivery failed: ${result.push_error ?? "unknown error"}.`;
          } else {
            pushNote = "Recorded in-app. No notification row was created for this order.";
          }
        } catch (error) {
          pushNote = `Status saved, but the push attempt failed: ${errorMessageFrom(error)}`;
        }
      }

      return { nextStatus, pushNote };
    },
    onSuccess: async (result) => {
      if (!result) return;
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      await queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      setOpen(false);
      setNote("");
      flashSuccess(`${orderCode} is now ${ORDER_STATUS_META[result.nextStatus].short}`);
      if (result.pushNote) {
        await alertSuccess("Status updated", result.pushNote);
      }
    },
    onError: async (error) => {
      await alertError("The status could not be updated", errorMessageFrom(error));
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button>Update status</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Update {orderCode}</DialogTitle>
          <DialogDescription>
            Currently <StatusBadge status={status} /> — pick the next step in the shop workflow.
          </DialogDescription>
        </DialogHeader>

        {nextStatuses.length === 0 ? (
          <p className="rounded-xl border border-border bg-secondary/60 px-4 py-3 text-sm text-muted-foreground">
            This order is finished. {status === "completed" ? "It has been released to the customer." : "No further changes are possible."}
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-2">
              {nextStatuses.map((next) => (
                <button
                  key={next}
                  type="button"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate(next)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5",
                    mutation.isPending && "opacity-60",
                  )}
                >
                  <span className="space-y-0.5">
                    <span className="block text-sm font-semibold text-foreground">
                      {ORDER_STATUS_META[next].label}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {ORDER_STATUS_META[next].description}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-note">Note for the record (optional)</Label>
              <Textarea
                id="status-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="e.g. Two barong pressed and ready at the counter."
                rows={3}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
