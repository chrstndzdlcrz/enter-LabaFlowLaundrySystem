import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
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
import { createInventoryItem, updateInventoryItem } from "@/lib/api/inventory";
import type { InventoryItem } from "@/lib/api/types";
import { alertError, errorMessageFrom, flashSuccess } from "@/lib/alerts";

/** Create or edit a supply item and its reorder level. */
export function ItemFormDialog({
  item,
  trigger,
}: {
  item?: InventoryItem;
  trigger?: React.ReactNode;
}) {
  const editing = Boolean(item);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("kg");
  const [quantity, setQuantity] = useState("0");
  const [threshold, setThreshold] = useState("5");
  const [cost, setCost] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) return;
    setName(item?.name ?? "");
    setUnit(item?.unit ?? "kg");
    setQuantity(String(item?.quantity ?? 0));
    setThreshold(String(item?.low_stock_threshold ?? 5));
    setCost(item?.cost_per_unit ? String(item.cost_per_unit) : "");
    setFormError(null);
  }, [open, item]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (name.trim().length < 2) throw new Error("Enter the supply name.");
      const parsedThreshold = Number(threshold);
      if (!Number.isFinite(parsedThreshold) || parsedThreshold < 0) {
        throw new Error("Enter a reorder level of zero or more.");
      }

      if (editing && item) {
        await updateInventoryItem(item.id, {
          name: name.trim(),
          unit: unit.trim() || "piece",
          low_stock_threshold: parsedThreshold,
          cost_per_unit: cost.trim() === "" ? null : Number(cost),
        });
        return;
      }

      const parsedQuantity = Number(quantity);
      if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
        throw new Error("Enter an opening quantity of zero or more.");
      }

      await createInventoryItem({
        name: name.trim(),
        unit: unit.trim() || "piece",
        quantity: parsedQuantity,
        low_stock_threshold: parsedThreshold,
        cost_per_unit: cost.trim() === "" ? null : Number(cost),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setOpen(false);
      flashSuccess(editing ? "Supply item updated" : "Supply item added");
    },
    onError: (error) => setFormError(errorMessageFrom(error)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Add supply item
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{editing ? `Edit ${item?.name}` : "New supply item"}</DialogTitle>
          <DialogDescription>
            Track what the shop consumes, and be warned when stock drops to the reorder level you set here.
          </DialogDescription>
        </DialogHeader>

        {formError ? (
          <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="item-name">Supply name</Label>
            <Input id="item-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Detergent powder" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-unit">Unit</Label>
            <Input id="item-unit" value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="kg" />
          </div>
          {!editing ? (
            <div className="space-y-2">
              <Label htmlFor="item-quantity">Opening quantity</Label>
              <Input
                id="item-quantity"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="item-threshold">Reorder level</Label>
            <Input
              id="item-threshold"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={threshold}
              onChange={(event) => setThreshold(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-cost">Cost per unit (optional)</Label>
            <Input
              id="item-cost"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={cost}
              onChange={(event) => setCost(event.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Once the shop edits a supply item, it stops being flagged as a placeholder.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : editing ? "Save item" : "Add item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
