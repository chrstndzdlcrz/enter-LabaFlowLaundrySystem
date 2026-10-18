import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Clock, Package, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingState } from "@/components/common/loading-state";
import { PlaceholderBadge } from "@/components/common/status-badge";
import { listServices } from "@/lib/api/services";
import { servicePricingSummary } from "@/lib/pricing";

/**
 * The shop's services, shown as one list with a photo per service. Categories are
 * deliberately not used: the shop sells a short, clear list of services.
 */
export function ServicesSection() {
  const { data: services, isLoading } = useQuery({
    queryKey: ["services", "public"],
    queryFn: () => listServices(),
  });

  const items = services ?? [];
  const hasPlaceholder = items.some((service) => service.is_placeholder);

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
        ) : items.length === 0 ? (
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
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((service) => (
              <Card
                key={service.id}
                className="flex h-full flex-col overflow-hidden border-border/80 transition-shadow hover:shadow-elegant"
              >
                {service.image_url ? (
                  <img
                    src={service.image_url}
                    crossOrigin="anonymous"
                    alt={`${service.name} at Lab-a-Day Laundry Shop`}
                    className="h-44 w-full object-cover"
                    width={800}
                    height={600}
                    loading="lazy"
                  />
                ) : (
                  /* A service still waiting for its photo keeps the grid even. */
                  <div
                    className="flex h-44 w-full items-center justify-center bg-gradient-breeze"
                    aria-hidden="true"
                  >
                    <Waves className="h-10 w-10 text-primary/40" />
                  </div>
                )}

                <CardContent className="flex flex-1 flex-col gap-3 p-5">
                  <h3 className="flex flex-wrap items-center gap-2 font-display text-lg font-bold text-foreground">
                    {service.name}
                    {service.is_placeholder ? <PlaceholderBadge /> : null}
                  </h3>

                  {service.description ? (
                    <p className="text-sm text-muted-foreground">{service.description}</p>
                  ) : null}

                  <p className="mt-auto font-display text-base font-bold text-primary">
                    {servicePricingSummary(service)}
                  </p>

                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    Ready in about {service.estimated_hours} hour
                    {service.estimated_hours === 1 ? "" : "s"}
                  </p>
                </CardContent>
              </Card>
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
