import { Minus, Plus, TriangleAlert } from "lucide-react";
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
} from "@/lib/pricing";

export type Quantities = Record<string, number>;

/**
 * Service list with per-wash quantity controls. Prices follow the shop's own
 * tiers (a base quantity, then each extra unit) and never exceed the per-wash cap.
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
    <div className="grid gap-3 sm:grid-cols-2">
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
            className={selected ? "overflow-hidden border-primary/50 bg-primary/5 shadow-sm" : "overflow-hidden border-border/80"}
          >
            {service.image_url ? (
              <img
                src={service.image_url}
                crossOrigin="anonymous"
                alt=""
                aria-hidden="true"
                className="h-28 w-full object-cover"
                width={800}
                height={600}
                loading="lazy"
              />
            ) : null}
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="flex flex-wrap items-center gap-2 font-display font-semibold text-foreground">
                    {service.name}
                    {service.is_placeholder ? <PlaceholderBadge /> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">{service.description}</p>
                </div>
                <p className="shrink-0 text-right">
                  <span className="block font-display font-bold text-primary">
                    {formatCurrency(service.price)}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    {servicePricingSummary(service).replace(/^\S+\s/, "")}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
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
                  className="w-24 text-center"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={`Add one ${service.name}`}
                  disabled={atMax}
                  onClick={() => setQuantity(service, quantity + step)}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </Button>
                <span className="ml-auto text-sm font-semibold text-foreground">
                  {formatCurrency(lineTotal)}
                </span>
              </div>

              {serviceQuantityHint(service) ? (
                <p className="text-[11px] leading-snug text-muted-foreground">
                  {serviceQuantityHint(service)}
                </p>
              ) : null}

              {atMax ? (
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-warning">
                  <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
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
