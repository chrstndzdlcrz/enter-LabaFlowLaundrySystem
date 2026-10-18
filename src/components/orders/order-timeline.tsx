import { Check, CircleDot, XCircle } from "lucide-react";
import { ORDER_FLOW, ORDER_STATUS_META, type OrderStatus } from "@/lib/constants";
import type { OrderStatusHistoryRow } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Progress through the real processing lifecycle, plus the recorded history of
 * who changed what and when.
 */
export function OrderTimeline({
  status,
  history,
  showHistory = true,
}: {
  status: OrderStatus;
  history: OrderStatusHistoryRow[];
  showHistory?: boolean;
}) {
  const cancelled = status === "cancelled";
  const currentIndex = ORDER_FLOW.indexOf(status);

  return (
    <div className="space-y-6">
      <ol className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {ORDER_FLOW.map((step, index) => {
          const done = !cancelled && index < currentIndex;
          const current = !cancelled && index === currentIndex;
          return (
            <li
              key={step}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3",
                current
                  ? "border-primary/50 bg-primary/5"
                  : done
                    ? "border-success/30 bg-success/5"
                    : "border-border bg-card/60",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                  current
                    ? "bg-primary text-primary-foreground"
                    : done
                      ? "bg-success text-success-foreground"
                      : "bg-secondary text-muted-foreground",
                )}
                aria-hidden="true"
              >
                {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span className="space-y-0.5">
                <span className="block text-sm font-semibold text-foreground">
                  {ORDER_STATUS_META[step].short}
                </span>
                <span className="block text-[11px] leading-snug text-muted-foreground">
                  {ORDER_STATUS_META[step].description}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      {cancelled ? (
        <p className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          This order was cancelled. {ORDER_STATUS_META.cancelled.description}
        </p>
      ) : null}

      {showHistory ? (
        <div className="space-y-3">
          <h3 className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Status history
          </h3>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No status changes recorded yet.</p>
          ) : (
            <ol className="space-y-3">
              {history.map((entry) => (
                <li key={entry.id} className="flex gap-3">
                  <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                    <CircleDot className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">
                      {entry.from_status
                        ? `${ORDER_STATUS_META[entry.from_status as OrderStatus]?.short ?? entry.from_status} → ${
                            ORDER_STATUS_META[entry.to_status as OrderStatus]?.short ?? entry.to_status
                          }`
                        : `Order created as ${ORDER_STATUS_META[entry.to_status as OrderStatus]?.short ?? entry.to_status}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.changed_by_name ?? "System"} · {formatDateTime(entry.created_at)}
                    </p>
                    {entry.note ? <p className="text-xs italic text-muted-foreground">“{entry.note}”</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : null}
    </div>
  );
}
