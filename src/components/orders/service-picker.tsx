import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PlaceholderBadge } from "@/components/common/status-badge";
import type { Service } from "@/lib/api/types";
import { UNIT_SUFFIX, UNIT_QUANTITY_LABEL } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";

export type Quantities = Record<string, number>;

/** Service list with per-unit quantity controls. Used for booking and walk-ins. */
export function ServicePicker({
  services,
  quantities,
  onChange,
}: {
  services: Service[];
  quantities: Quantities;
  onChange: (next: Quantities) => void;
}) {
  const setQuantity = (serviceId: string, value: number) => {
    const next = { ...quantities };
    if (value <= 0) delete next[serviceId];
    else next[serviceId] = value;
    onChange(next);
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {services.map((service) => {
        const quantity = quantities[service.id] ?? 0;
        const selected = quantity > 0;
        return (
          <Card
            key={service.id}
            className={selected ? "border-primary/50 bg-primary/5 shadow-sm" : "border-border/80"}
          >
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
                  <span className="block font-display font-bold text-primary">{formatCurrency(service.price)}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {UNIT_SUFFIX[service.unit] ?? `per ${service.unit}`}
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
                  onClick={() => setQuantity(service.id, Math.max(0, quantity - 1))}
                >
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={service.unit === "piece" ? 1 : 0.5}
                  value={quantity === 0 ? "" : quantity}
                  aria-label={`${UNIT_QUANTITY_LABEL[service.unit] ?? "Quantity"} for ${service.name}`}
                  placeholder="0"
                  onChange={(event) => setQuantity(service.id, Number(event.target.value) || 0)}
                  className="w-24 text-center"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={`Add one ${service.name}`}
                  onClick={() => setQuantity(service.id, quantity + (service.unit === "piece" ? 1 : 0.5))}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </Button>
                <span className="ml-auto text-sm font-semibold text-foreground">
                  {formatCurrency(service.price * quantity)}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
