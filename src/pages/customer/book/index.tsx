import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Info, Package, ShoppingBasket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/common/page-header";
import { QueryState } from "@/components/common/query-state";
import { ServicePicker, type Quantities } from "@/components/orders/service-picker";
import { createBooking } from "@/lib/api/orders";
import { listServices } from "@/lib/api/services";
import { alertError, alertSuccess, errorMessageFrom } from "@/lib/alerts";
import { formatCurrency, formatQuantity } from "@/lib/format";
import { serviceLineTotal, servicePricingSummary } from "@/lib/pricing";

export default function BookService() {
  const [quantities, setQuantities] = useState<Quantities>({});
  const [notes, setNotes] = useState("");
  const [pickupAt, setPickupAt] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const servicesQuery = useQuery({
    queryKey: ["services", "active"],
    queryFn: () => listServices(),
  });

  const services = servicesQuery.data ?? [];
  const lines = useMemo(
    () =>
      services
        .filter((service) => (quantities[service.id] ?? 0) > 0)
        .map((service) => ({
          service,
          quantity: quantities[service.id],
          lineTotal: serviceLineTotal(service, quantities[service.id]),
        })),
    [services, quantities],
  );

  const estimatedTotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);

  const mutation = useMutation({
    mutationFn: async () => {
      if (lines.length === 0) {
        throw new Error("Add at least one service before submitting your booking.");
      }
      return createBooking({
        items: lines.map((line) => ({ service_id: line.service.id, quantity: line.quantity })),
        notes: notes.trim() || null,
        pickupAt: pickupAt ? new Date(pickupAt).toISOString() : null,
      });
    },
    onSuccess: async (order) => {
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      setQuantities({});
      setNotes("");
      setPickupAt("");
      await alertSuccess(
        `Booking ${order.order_code} submitted`,
        "The shop will confirm your booking. Bring your laundry to the counter and quote this order code — you can follow every status change from your orders page.",
      );
      navigate(`/app/orders/${order.id}`);
    },
    onError: (error) => setFormError(errorMessageFrom(error)),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Book a laundry service"
        description="Pick what you need and see the exact price before you submit. Nothing is charged online."
      />

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <QueryState
            isLoading={servicesQuery.isLoading}
            error={servicesQuery.error}
            isEmpty={services.length === 0}
            emptyIcon={Package}
            emptyTitle="No services published yet"
            emptyDescription="The shop has not opened its price list yet. Please check back shortly."
          >
            <ServicePicker services={services} quantities={quantities} onChange={setQuantities} />
          </QueryState>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base">Booking details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pickup-at">Preferred drop-off / pick-up date (optional)</Label>
                <Input
                  id="pickup-at"
                  type="datetime-local"
                  value={pickupAt}
                  onChange={(event) => setPickupAt(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Staff confirm the final schedule when you hand over the laundry.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="booking-notes">Instructions for the shop (optional)</Label>
                <Textarea
                  id="booking-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  placeholder="e.g. Separate the whites, do not use bleach on the barong."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit lg:sticky lg:top-24">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <ShoppingBasket className="h-4 w-4 text-primary" aria-hidden="true" />
              Price summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lines.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Choose a service and quantity to see your total here.
              </p>
            ) : (
              <ul className="space-y-3">
                {lines.map((line) => (
                  <li key={line.service.id} className="flex items-start justify-between gap-3 text-sm">
                    <span className="space-y-0.5">
                      <span className="block font-medium text-foreground">{line.service.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {formatQuantity(line.quantity, line.service.unit)} ·{" "}
                        {servicePricingSummary(line.service)}
                      </span>
                    </span>
                    <span className="font-semibold text-foreground">{formatCurrency(line.lineTotal)}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="font-display font-semibold text-foreground">Estimated total</span>
              <span className="font-display text-xl font-bold text-primary">
                {formatCurrency(estimatedTotal)}
              </span>
            </div>

            <p className="flex items-start gap-2 rounded-xl bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
              The final amount is confirmed at the counter once your laundry is weighed. Payment is
              collected there — cash or GCash.
            </p>

            {formError ? (
              <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {formError}
              </p>
            ) : null}

            <Button
              className="w-full"
              onClick={() => {
                setFormError(null);
                mutation.mutate();
              }}
              disabled={mutation.isPending || lines.length === 0}
            >
              {mutation.isPending ? "Submitting booking…" : "Submit booking"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
