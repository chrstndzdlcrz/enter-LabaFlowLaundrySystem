import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Info, Plus } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { createService, updateService } from "@/lib/api/services";
import type { Service } from "@/lib/api/types";
import { SERVICE_UNITS } from "@/lib/constants";
import { alertError, errorMessageFrom, flashSuccess } from "@/lib/alerts";
import { servicePricingSummary } from "@/lib/pricing";

/**
 * Create or edit a service.
 *
 * Two pricing shapes are supported: a flat price per unit, or a base quantity
 * covered by the price plus a charge for each additional unit with an optional
 * per-wash cap. Saving clears the placeholder flag.
 */
export function ServiceFormDialog({ service, trigger }: { service?: Service; trigger?: React.ReactNode }) {
  const editing = Boolean(service);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState<Service["unit"]>("kg");
  const [price, setPrice] = useState("");
  const [hours, setHours] = useState("24");
  const [imageUrl, setImageUrl] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [tiered, setTiered] = useState(false);
  const [baseQuantity, setBaseQuantity] = useState("7");
  const [incrementQuantity, setIncrementQuantity] = useState("1");
  const [incrementPrice, setIncrementPrice] = useState("");
  const [maxQuantity, setMaxQuantity] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) return;
    setName(service?.name ?? "");
    setDescription(service?.description ?? "");
    setCategory(service?.category ?? "");
    setUnit((service?.unit as Service["unit"]) ?? "kg");
    setPrice(service ? String(service.price) : "");
    setHours(String(service?.estimated_hours ?? 24));
    setImageUrl(service?.image_url ?? "");
    setSortOrder(String(service?.sort_order ?? 0));

    const hasTier = service?.base_quantity != null && Number(service.base_quantity) > 0;
    setTiered(Boolean(hasTier));
    setBaseQuantity(hasTier ? String(service?.base_quantity) : "7");
    setIncrementQuantity(service?.increment_quantity ? String(service.increment_quantity) : "1");
    setIncrementPrice(service?.increment_price ? String(service.increment_price) : "");
    setMaxQuantity(service?.max_quantity ? String(service.max_quantity) : "");
    setFormError(null);
  }, [open, service]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (name.trim().length < 3) throw new Error("Enter the service name as customers will see it.");
      const parsedPrice = Number(price);
      if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
        throw new Error("Enter the shop's real price for this service. Zero is not allowed.");
      }
      const parsedHours = Number(hours);
      if (!Number.isFinite(parsedHours) || parsedHours < 0) {
        throw new Error("Enter the expected turnaround in hours.");
      }

      let parsedBase: number | null = null;
      let parsedIncrementQty: number | null = null;
      let parsedIncrementPrice: number | null = null;
      let parsedMax: number | null = null;

      if (tiered) {
        parsedBase = Number(baseQuantity);
        if (!Number.isFinite(parsedBase) || parsedBase <= 0) {
          throw new Error("Enter the weight the base price already covers.");
        }
        parsedIncrementQty = Number(incrementQuantity);
        if (!Number.isFinite(parsedIncrementQty) || parsedIncrementQty <= 0) {
          throw new Error("Enter how much each extra charge covers, for example 1 kilo.");
        }
        parsedIncrementPrice = incrementPrice.trim() === "" ? 0 : Number(incrementPrice);
        if (!Number.isFinite(parsedIncrementPrice) || parsedIncrementPrice < 0) {
          throw new Error("Enter the charge for each extra unit, or zero for none.");
        }
        if (maxQuantity.trim() !== "") {
          parsedMax = Number(maxQuantity);
          if (!Number.isFinite(parsedMax) || parsedMax <= 0) {
            throw new Error("Enter a maximum per wash, or leave it empty for no cap.");
          }
          if (parsedMax < parsedBase) {
            throw new Error("The maximum per wash cannot be less than the base quantity.");
          }
        }
      }

      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        category: category.trim() || null,
        unit,
        price: parsedPrice,
        estimated_hours: parsedHours,
        image_url: imageUrl.trim() || null,
        sort_order: Number(sortOrder) || 0,
        base_quantity: parsedBase,
        increment_quantity: parsedIncrementQty,
        increment_price: parsedIncrementPrice,
        max_quantity: parsedMax,
      };

      if (editing && service) await updateService(service.id, payload);
      else await createService(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["services"] });
      setOpen(false);
      flashSuccess(editing ? "Service updated" : "Service added");
    },
    onError: (error) => setFormError(errorMessageFrom(error)),
  });

  const preview = servicePricingSummary({
    price: Number(price) || 0,
    unit,
    base_quantity: tiered ? Number(baseQuantity) || null : null,
    increment_quantity: tiered ? Number(incrementQuantity) || null : null,
    increment_price: tiered ? Number(incrementPrice) || 0 : null,
    max_quantity: tiered ? Number(maxQuantity) || null : null,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Add service
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">{editing ? `Edit ${service?.name}` : "New service"}</DialogTitle>
          <DialogDescription>
            Prices entered here are the shop's real prices — they replace any placeholder figures.
          </DialogDescription>
        </DialogHeader>

        {formError ? (
          <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="service-name">Service name</Label>
            <Input id="service-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Wash, Dry & Fold" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="service-description">Description</Label>
            <Textarea
              id="service-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              placeholder="What the customer gets, in their words."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="service-category">Category</Label>
            <Input id="service-category" value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Everyday" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="service-unit">Priced per</Label>
            <Select value={unit} onValueChange={(value) => setUnit(value as Service["unit"])}>
              <SelectTrigger id="service-unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_UNITS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="service-price">{tiered ? `Base price (covers the first ${baseQuantity || 0} ${unit})` : "Price (PHP)"}</Label>
            <Input
              id="service-price"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="180.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="service-hours">Turnaround (hours)</Label>
            <Input
              id="service-hours"
              type="number"
              min={0}
              value={hours}
              onChange={(event) => setHours(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-border p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="service-tiered" className="text-sm font-semibold">
                Charge more above a base weight
              </Label>
              <p className="text-xs text-muted-foreground">
                Turn this on for prices like “first 7 kg for ₱180, then ₱25 per extra kilo”.
              </p>
            </div>
            <Switch id="service-tiered" checked={tiered} onCheckedChange={setTiered} />
          </div>

          {tiered ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="service-base">Base {unit} included</Label>
                <Input
                  id="service-base"
                  type="number"
                  min={0}
                  step="0.5"
                  value={baseQuantity}
                  onChange={(event) => setBaseQuantity(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service-increment">Extra covered per charge</Label>
                <Input
                  id="service-increment"
                  type="number"
                  min={0}
                  step="0.5"
                  value={incrementQuantity}
                  onChange={(event) => setIncrementQuantity(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service-increment-price">Charge per extra</Label>
                <Input
                  id="service-increment-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={incrementPrice}
                  onChange={(event) => setIncrementPrice(event.target.value)}
                  placeholder="25.00"
                />
              </div>
              <div className="space-y-2 sm:col-span-3">
                <Label htmlFor="service-max">Maximum {unit} per wash (optional cap)</Label>
                <Input
                  id="service-max"
                  type="number"
                  min={0}
                  step="0.5"
                  value={maxQuantity}
                  onChange={(event) => setMaxQuantity(event.target.value)}
                  placeholder="10"
                />
                <p className="text-xs text-muted-foreground">
                  Customers cannot book more than this in one wash; the app asks them to split it.
                </p>
              </div>
            </div>
          ) : null}

          <p className="flex items-start gap-2 rounded-xl bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            Customers will see: <span className="font-medium text-foreground">{preview}</span>
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="service-image">Photo link (optional)</Label>
            <Input
              id="service-image"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="service-order">Display order</Label>
            <Input
              id="service-order"
              type="number"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : editing ? "Save service" : "Add service"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
