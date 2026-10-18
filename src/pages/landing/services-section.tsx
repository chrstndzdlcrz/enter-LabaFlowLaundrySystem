import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Package, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingState } from "@/components/common/loading-state";
import { PlaceholderBadge } from "@/components/common/status-badge";
import { listServices } from "@/lib/api/services";
import { formatCurrency } from "@/lib/format";
import { servicePricingSummary } from "@/lib/pricing";

export function ServicesSection() {
  const { data: services, isLoading } = useQuery({
    queryKey: ["services", "public"],
    queryFn: () => listServices(),
  });

  const grouped = (services ?? []).reduce<Record<string, typeof services>>((acc, service) => {
    const key = service.category?.trim() || "Our services";
    acc[key] = [...(acc[key] ?? []), service];
    return acc;
  }, {});

  const hasPlaceholder = (services ?? []).some((service) => service.is_placeholder);

  return (
    <section id="services" className="relative px-4 py-16 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <div className="max-w-2xl space-y-3">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Services and prices
          </h2>
          <p className="text-muted-foreground">
            Each price covers a base weight, and anything above it is charged per extra kilo — so you
            always know what a load costs before you hand it over.
          </p>
          {hasPlaceholder ? (
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <PlaceholderBadge />
              <span>Some prices are starting points the shop still has to confirm.</span>
            </div>
          ) : null}
        </div>

        {isLoading ? (
          <LoadingState label="Loading the price list…" />
        ) : (services ?? []).length === 0 ? (
          <EmptyState
            icon={Package}
            title="The price list is being set up"
            description="The shop has not published its services yet. Create an account and we will let you know as soon as booking opens."
            action={
              <Button asChild variant="outline">
                <Link to="/register">Create an account</Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-10">
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category} className="space-y-4">
                <h3 className="font-display text-lg font-bold text-foreground">{category}</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {(items ?? []).map((service) => (
                    <Card key={service.id} className="flex h-full flex-col border-border/80 transition-shadow hover:shadow-elegant">
                      <CardHeader className="gap-2 pb-3">
                        <CardTitle className="flex flex-wrap items-center gap-2 font-display text-lg">
                          {service.name}
                          {service.is_placeholder ? <PlaceholderBadge /> : null}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">{service.description}</p>
                      </CardHeader>
                      <CardContent className="mt-auto space-y-3">
                        <p className="font-display text-base font-bold text-primary">
                          {servicePricingSummary(service)}
                        </p>
                        <p className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Timer className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                          Around {service.estimated_hours} hours to process
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/register">Book this service</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/login">I already have an account</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
