import { Clock, Minus, Plus, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PlaceholderBadge } from "@/components/common/status-badge";
import type { Service } from "@/lib/api/types";
import { UNIT_QUANTITY_LABEL } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import {
  clampQuantity,
  serviceLineTotal,
  serviceMaxQuantity,
  servicePricingSummary,
  serviceQuantityHint,
  serviceTurnaround,
} from "@/lib/pricing";

export type Quantities = Record<string, number>;

/**
 * Service list with per-wash quantity controls. Prices follow the shop's own tiers
 * (a base quantity, then each extra unit) and never exceed the per-wash cap.
 *
 * Every card is a single vertical column — photo, name, price, then the quantity
 * stepper — so nothing is squeezed or clipped however narrow the column gets.
 */
export function ServicePicker({
  services,
  quantities,
  onChange,
}: {
  services: Service[];
  quantities: Quantities;
  onChange: (next: Quantities) => void;
}) {
  const setQuantity = (service: Service, raw: string | number) => {
    const parsed = typeof raw === "number" ? raw : Number(raw);
    const next = { ...quantities };
    const value = clampQuantity(service, Number.isFinite(parsed) ? parsed : 0);
    if (value <= 0) delete next[service.id];
    else next[service.id] = value;
    onChange(next);
  };

  return (
    <div className="grid items-stretch gap-3 sm:grid-cols-2">
      {services.map((service) => {
        const quantity = quantities[service.id] ?? 0;
        const selected = quantity > 0;
        const max = serviceMaxQuantity(service);
        const atMax = max !== null && quantity >= max;
        const step = service.unit === "piece" ? 1 : 0.5;
        const lineTotal = serviceLineTotal(service, quantity);

        return (
          <Card
            key={service.id}
            className={
              selected
                ? "flex h-full flex-col overflow-hidden border-primary/50 shadow-elegant"
                : "flex h-full flex-col overflow-hidden border-border/80"
            }
          >
            {service.image_url ? (
              <img
                src={service.image_url}
                crossOrigin="anonymous"
                alt=""
                aria-hidden="true"
                className="h-32 w-full shrink-0 object-cover"
                width={800}
                height={600}
                loading="lazy"
              />
            ) : null}

            <CardContent className="flex min-w-0 flex-1 flex-col gap-3 p-4">
              <div className="min-w-0 space-y-1">
                <p className="flex flex-wrap items-center gap-2 font-display text-base font-bold leading-tight text-foreground">
                  {service.name}
                  {service.is_placeholder ? <PlaceholderBadge /> : null}
                </p>
                {service.description ? (
                  <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">
                    {service.description}
                  </p>
                ) : null}
              </div>

              <div className="min-w-0 space-y-1">
                <p className="font-display text-sm font-bold leading-snug text-primary">
                  {servicePricingSummary(service)}
                </p>
                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
                  Ready in about {serviceTurnaround(service)}
                </p>
              </div>

              <div className="mt-auto space-y-1.5 rounded-xl border border-border/70 bg-background/70 p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      aria-label={`Remove one ${service.name}`}
                      disabled={quantity <= 0}
                      onClick={() => setQuantity(service, quantity - step)}
                    >
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={max ?? undefined}
                      step={step}
                      value={quantity === 0 ? "" : quantity}
                      aria-label={`${UNIT_QUANTITY_LABEL[service.unit] ?? "Quantity"} for ${service.name}`}
                      placeholder="0"
                      onChange={(event) => setQuantity(service, event.target.value)}
                      className="h-9 w-16 shrink-0 px-1 text-center"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      aria-label={`Add one ${service.name}`}
                      disabled={atMax}
                      onClick={() => setQuantity(service, quantity + step)}
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </span>
                  <span className="min-w-0 truncate text-right font-display text-sm font-bold text-foreground">
                    {formatCurrency(lineTotal)}
                  </span>
                </div>
                <p className="text-center text-[10px] leading-snug text-muted-foreground">
                  {service.unit === "piece" ? "Number of pieces" : `In ${service.unit}`}
                  {max !== null ? ` · up to ${max} ${service.unit} per wash` : ""}
                </p>
              </div>

              {serviceQuantityHint(service) && !atMax ? (
                <p className="text-[10px] leading-snug text-muted-foreground">
                  {serviceQuantityHint(service)}
                </p>
              ) : null}

              {atMax ? (
                <p className="flex items-start gap-1.5 text-[11px] font-medium leading-snug text-warning">
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  That is the maximum for one wash. Book a second load for more.
                </p>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
