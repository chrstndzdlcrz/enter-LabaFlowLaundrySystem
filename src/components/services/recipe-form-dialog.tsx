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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveConsumable } from "@/lib/api/services";
import type { InventoryItem, Service } from "@/lib/api/types";
import { alertError, errorMessageFrom, flashSuccess } from "@/lib/alerts";

/**
 * The consumption rule for one service: how much of a supply one unit of that
 * service uses. Only the shop knows these rates, so nothing is pre-filled unless
 * a placeholder rule already exists.
 */
export function RecipeFormDialog({
  services,
  items,
  existing,
  trigger,
}: {
  services: Pick<Service, "id" | "name" | "unit">[];
  items: InventoryItem[];
  existing?: { id: string; service_id: string; inventory_item_id: string; qty_per_unit: number };
  trigger?: React.ReactNode;
}) {
  const editing = Boolean(existing);
  const [open, setOpen] = useState(false);
  const [serviceId, setServiceId] = useState("");
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) return;
    setServiceId(existing?.service_id ?? services[0]?.id ?? "");
    setItemId(existing?.inventory_item_id ?? items[0]?.id ?? "");
    setQty(existing ? String(existing.qty_per_unit) : "");
    setFormError(null);
  }, [open, existing, services, items]);

  const selectedItem = items.find((item) => item.id === itemId);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!serviceId) throw new Error("Choose the service this rule applies to.");
      if (!itemId) throw new Error("Choose the supply the service consumes.");
      const parsed = Number(qty);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error("Enter how much of the supply one unit of the service uses.");
      }

      await saveConsumable({
        id: existing?.id,
        service_id: serviceId,
        inventory_item_id: itemId,
        qty_per_unit: parsed,
        unit: selectedItem?.unit ?? null,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["consumables"] });
      setOpen(false);
      flashSuccess(editing ? "Consumption rule updated" : "Consumption rule added");
    },
    onError: (error) => setFormError(errorMessageFrom(error)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Add consumption rule
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {editing ? "Edit consumption rule" : "New consumption rule"}
          </DialogTitle>
          <DialogDescription>
            Stock is deducted automatically when an order reaches the consumption stage. Use the shop's real
            usage rate — for example 0.05 kg of detergent per kilogram of laundry.
          </DialogDescription>
        </DialogHeader>

        {formError ? (
          <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        ) : null}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipe-service">Service</Label>
            <Select value={serviceId} onValueChange={setServiceId} disabled={editing}>
              <SelectTrigger id="recipe-service">
                <SelectValue placeholder="Choose a service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipe-item">Supply used</Label>
            <Select value={itemId} onValueChange={setItemId} disabled={editing}>
              <SelectTrigger id="recipe-item">
                <SelectValue placeholder="Choose a supply" />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} ({item.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipe-qty">
              Amount per unit of service {selectedItem ? `(${selectedItem.unit})` : ""}
            </Label>
            <Input
              id="recipe-qty"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.001"
              value={qty}
              onChange={(event) => setQty(event.target.value)}
              placeholder="0.05"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : editing ? "Save rule" : "Add rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
