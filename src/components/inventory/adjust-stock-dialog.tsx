import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { recordMovement } from "@/lib/api/inventory";
import type { InventoryItem } from "@/lib/api/types";
import { INVENTORY_REASONS } from "@/lib/constants";
import { alertError, alertSuccess, errorMessageFrom, flashSuccess } from "@/lib/alerts";
import { formatQuantity } from "@/lib/format";
import { cn } from "@/lib/utils";

type Direction = "in" | "out";

/** Restock or consume a supply. The database applies the change and reports any shortfall. */
export function AdjustStockDialog({ item, trigger }: { item: InventoryItem; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<Direction>("in");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("purchase");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = Number(quantity);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error("Enter a quantity greater than zero.");
      }
      const delta = direction === "in" ? parsed : -parsed;
      return recordMovement({
        itemId: item.id,
        delta,
        reason: reason as "consumption" | "purchase" | "adjustment" | "waste" | "return",
        note: note.trim() || null,
      });
    },
    onSuccess: async (movement) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
      setOpen(false);
      setQuantity("");
      setNote("");
      flashSuccess(`${item.name} is now ${formatQuantity(movement.quantity_after, item.unit)}`);
      if (Number(movement.shortage) > 0) {
        await alertSuccess(
          "Movement recorded with a shortage",
          `${item.name} would have gone ${formatQuantity(movement.shortage, item.unit)} below zero. Stock is held at zero and the shortfall is noted on the movement so the count can be corrected.`,
        );
      }
    },
    onError: (error) => setFormError(errorMessageFrom(error)),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setFormError(null);
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? <Button variant="outline" size="sm">Adjust stock</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Adjust {item.name}</DialogTitle>
          <DialogDescription>
            On hand now: {formatQuantity(item.quantity, item.unit)} · reorder level{" "}
            {formatQuantity(item.low_stock_threshold, item.unit)}
          </DialogDescription>
        </DialogHeader>

        {formError ? (
          <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        ) : null}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setDirection("in");
                setReason("purchase");
              }}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition-colors",
                direction === "in"
                  ? "border-success/50 bg-success/10 text-success"
                  : "border-border text-muted-foreground hover:bg-secondary",
              )}
            >
              <ArrowUpCircle className="h-4 w-4" aria-hidden="true" />
              Stock in
            </button>
            <button
              type="button"
              onClick={() => {
                setDirection("out");
                setReason("consumption");
              }}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition-colors",
                direction === "out"
                  ? "border-warning/50 bg-warning/10 text-warning"
                  : "border-border text-muted-foreground hover:bg-secondary",
              )}
            >
              <ArrowDownCircle className="h-4 w-4" aria-hidden="true" />
              Stock out
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adjust-quantity">Quantity in {item.unit}</Label>
            <Input
              id="adjust-quantity"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adjust-reason">Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="adjust-reason">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVENTORY_REASONS.filter((option) =>
                  direction === "in"
                    ? ["purchase", "adjustment", "return"].includes(option.value)
                    : ["consumption", "adjustment", "waste"].includes(option.value),
                ).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adjust-note">Note (optional)</Label>
            <Textarea
              id="adjust-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              placeholder="e.g. Delivered by supplier on Tuesday."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Recording…" : "Record movement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
