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

/**
 * Create or edit a supply item.
 *
 * Supplies are usually bought by the pack but consumed in smaller units (a 2500
 * ml detergent pack used 100 ml at a time), so the pack size and the level you
 * want to keep are recorded here and drive the stock percentage.
 */
export function ItemFormDialog({ item, trigger }: { item?: InventoryItem; trigger?: React.ReactNode }) {
  const editing = Boolean(item);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("kg");
  const [quantity, setQuantity] = useState("0");
  const [threshold, setThreshold] = useState("5");
  const [fullLevel, setFullLevel] = useState("");
  const [packSize, setPackSize] = useState("");
  const [packLabel, setPackLabel] = useState("");
  const [cost, setCost] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) return;
    setName(item?.name ?? "");
    setUnit(item?.unit ?? "kg");
    setQuantity(String(item?.quantity ?? 0));
    setThreshold(String(item?.low_stock_threshold ?? 5));
    setFullLevel(item?.full_stock_level ? String(item.full_stock_level) : "");
    setPackSize(item?.pack_size ? String(item.pack_size) : "");
    setPackLabel(item?.pack_label ?? "");
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
      const parsedFullLevel = fullLevel.trim() === "" ? null : Number(fullLevel);
      if (parsedFullLevel !== null && (!Number.isFinite(parsedFullLevel) || parsedFullLevel <= 0)) {
        throw new Error("Enter the level you want to keep, or leave it empty.");
      }
      const parsedPackSize = packSize.trim() === "" ? null : Number(packSize);
      if (parsedPackSize !== null && (!Number.isFinite(parsedPackSize) || parsedPackSize <= 0)) {
        throw new Error("Enter the pack size, or leave it empty for items bought loose.");
      }

      const common = {
        name: name.trim(),
        unit: unit.trim() || "piece",
        low_stock_threshold: parsedThreshold,
        cost_per_unit: cost.trim() === "" ? null : Number(cost),
        pack_size: parsedPackSize,
        pack_label: packLabel.trim() || null,
        full_stock_level: parsedFullLevel,
      };

      if (editing && item) {
        await updateInventoryItem(item.id, common);
        return;
      }

      const parsedQuantity = Number(quantity);
      if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
        throw new Error("Enter an opening quantity of zero or more.");
      }

      await createInventoryItem({ ...common, quantity: parsedQuantity });
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
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">{editing ? `Edit ${item?.name}` : "New supply item"}</DialogTitle>
          <DialogDescription>
            Track what the shop consumes, and see at a glance how full each supply still is.
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
            <Input
              id="item-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Surf Liquid Detergent"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-unit">Consumed in</Label>
            <Input id="item-unit" value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="ml" />
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
            <Label htmlFor="item-pack-size">Pack size (optional)</Label>
            <Input
              id="item-pack-size"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={packSize}
              onChange={(event) => setPackSize(event.target.value)}
              placeholder="2500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-pack-label">Pack is called</Label>
            <Input
              id="item-pack-label"
              value={packLabel}
              onChange={(event) => setPackLabel(event.target.value)}
              placeholder="pack or bottle"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-full-level">Full level (for the percentage)</Label>
            <Input
              id="item-full-level"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={fullLevel}
              onChange={(event) => setFullLevel(event.target.value)}
              placeholder="2500"
            />
          </div>
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
          The full level is what you treat as a complete stock of this supply — a fresh 2500 ml pack, for
          example. The inventory page shows the current quantity as a percentage of it.
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
