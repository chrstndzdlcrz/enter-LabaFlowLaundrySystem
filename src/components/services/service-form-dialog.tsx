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
import { Textarea } from "@/components/ui/textarea";
import { createService, updateService } from "@/lib/api/services";
import type { Service } from "@/lib/api/types";
import { SERVICE_UNITS } from "@/lib/constants";
import { alertError, errorMessageFrom, flashSuccess } from "@/lib/alerts";

/** Create or edit a service and its price. Replacing a placeholder price clears the placeholder flag. */
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

      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        category: category.trim() || null,
        unit,
        price: parsedPrice,
        estimated_hours: parsedHours,
        image_url: imageUrl.trim() || null,
        sort_order: Number(sortOrder) || 0,
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
            <Label htmlFor="service-price">Price (PHP)</Label>
            <Input
              id="service-price"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="45.00"
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
