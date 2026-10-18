import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Store } from "lucide-react";
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
import { ServicePicker, type Quantities } from "./service-picker";
import { createWalkInOrder } from "@/lib/api/orders";
import { listCustomers } from "@/lib/api/profiles";
import { listServices } from "@/lib/api/services";
import { alertError, alertSuccess, errorMessageFrom } from "@/lib/alerts";
import { formatCurrency } from "@/lib/format";
import { serviceLineTotal } from "@/lib/pricing";

const UNLINKED = "none";

/** Counter workflow: log a walk-in drop-off and have it recorded like any other order. */
export function WalkInOrderDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [linkedCustomer, setLinkedCustomer] = useState<string>(UNLINKED);
  const [notes, setNotes] = useState("");
  const [quantities, setQuantities] = useState<Quantities>({});
  const [formError, setFormError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: services } = useQuery({ queryKey: ["services", "active"], queryFn: () => listServices() });
  const { data: customers } = useQuery({ queryKey: ["customers"], queryFn: listCustomers, enabled: open });

  const selected = useMemo(
    () => (services ?? []).filter((service) => (quantities[service.id] ?? 0) > 0),
    [services, quantities],
  );
  const estimatedTotal = selected.reduce(
    (sum, service) => sum + serviceLineTotal(service, quantities[service.id] ?? 0),
    0,
  );

  const reset = () => {
    setCustomerName("");
    setCustomerPhone("");
    setLinkedCustomer(UNLINKED);
    setNotes("");
    setQuantities({});
    setFormError(null);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (customerName.trim().length < 2) {
        throw new Error("Enter the customer's name so the order can be identified at the counter.");
      }
      const items = selected.map((service) => ({
        service_id: service.id,
        quantity: quantities[service.id],
      }));
      if (items.length === 0) {
        throw new Error("Pick at least one service and quantity for this drop-off.");
      }
      return createWalkInOrder({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || null,
        items,
        notes: notes.trim() || null,
        linkCustomerId: linkedCustomer === UNLINKED ? null : linkedCustomer,
      });
    },
    onSuccess: async (order) => {
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      const linked = linkedCustomer !== UNLINKED;
      setOpen(false);
      reset();
      await alertSuccess(
        `Walk-in order ${order.order_code} created`,
        linked
          ? "The order is linked to the customer's account, so they can track it and receive the ready notification."
          : "No account is linked, so this order will not send a customer notification. Add the customer's account next time if they want alerts.",
      );
    },
    onError: (error) => setFormError(errorMessageFrom(error)),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Store className="mr-2 h-4 w-4" aria-hidden="true" />
            New walk-in order
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display">New walk-in order</DialogTitle>
          <DialogDescription>
            Logged as received at the counter. Update the status as the load moves through the shop.
          </DialogDescription>
        </DialogHeader>

        {formError ? (
          <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {formError}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="walkin-name">Customer name</Label>
            <Input
              id="walkin-name"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Aling Nena"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="walkin-phone">Mobile number (optional)</Label>
            <Input
              id="walkin-phone"
              inputMode="tel"
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
              placeholder="+63 917 000 0000"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="walkin-link">Link to a registered customer (optional)</Label>
            <Select value={linkedCustomer} onValueChange={setLinkedCustomer}>
              <SelectTrigger id="walkin-link">
                <SelectValue placeholder="Not linked to an account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNLINKED}>Not linked to an account</SelectItem>
                {(customers ?? []).map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.full_name ?? customer.email} {customer.phone ? `· ${customer.phone}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Linking an account lets the customer track the order and receive the ready-for-pick-up alert.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Label>Services</Label>
          <ServicePicker services={services ?? []} quantities={quantities} onChange={setQuantities} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="walkin-notes">Counter note (optional)</Label>
          <Textarea
            id="walkin-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            placeholder="e.g. Customer will collect on Saturday morning."
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-secondary/50 px-4 py-3">
          <span className="text-sm text-muted-foreground">
            {selected.length} service{selected.length === 1 ? "" : "s"} selected
          </span>
          <span className="font-display text-lg font-bold text-primary">{formatCurrency(estimatedTotal)}</span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Creating…" : "Create order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
