import { Droplets, Shirt, Sparkles, Timer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LABAFLOW_IMAGES } from "@/lib/assets";

/**
 * The shop's equipment, described in terms of what it means for the customer.
 *
 * Deliberately free of machine counts, brands and equipment the shop has not
 * confirmed: everything here follows from the services, the per-wash weight
 * limits and the supplies the owner gave us.
 */
const POINTS = [
  {
    icon: Droplets,
    title: "Washed one load at a time",
    text: "Every order takes a wash cycle of its own inside the weight we allow — up to 10 kg of everyday laundry, or 9 kg of bedding — so heavy items are never mixed with a light load.",
  },
  {
    icon: Sparkles,
    title: "Real soap, measured per load",
    text: "Surf liquid detergent and Surf fabric conditioner, with Zonrox colour-safe bleach, measured for each load instead of poured by eye.",
  },
  {
    icon: Timer,
    title: "Dried before it is folded",
    text: "Your laundry is fully dried in the shop, never damp, which is why an everyday load is ready in about 5 hours and bedding in about 7.",
  },
  {
    icon: Shirt,
    title: "Folded by hand",
    text: "Everything is folded by hand before it is packed, and items that need pressing — shirts, dresses, barongs — are pressed before handover.",
  },
];

export function EquipmentSection() {
  return (
    <section id="equipment" className="relative px-4 py-16 sm:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="space-y-5">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                Our equipment
              </span>
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                What your laundry goes through
              </h2>
              <p className="text-muted-foreground">
                A neighbourhood shop with commercial machines behind the counter. That is what lets a
                full load come back in a few hours — and why thick items like comforters and bedsheets
                get a wash of their own.
              </p>
            </div>

            <ul className="space-y-4">
              {POINTS.map((point) => (
                <li key={point.title} className="flex gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <point.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="space-y-1">
                    <span className="block font-display font-semibold text-foreground">
                      {point.title}
                    </span>
                    <span className="block text-sm text-muted-foreground">{point.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <img
              src={LABAFLOW_IMAGES.equipment}
              alt="A commercial washing machine beside the folding table at Lab-a-Day Laundry Shop"
              className="w-full rounded-[1.75rem] border border-border object-cover shadow-elegant"
              width={1000}
              height={747}
              loading="lazy"
              decoding="async"
            />
            <Card className="border-border/80">
              <CardContent className="flex flex-col gap-2 p-5">
                <p className="font-display font-semibold text-foreground">Care between the machines</p>
                <p className="text-sm text-muted-foreground">
                  Whites, colours and heavy items are sorted before washing, and each order is weighed
                  and recorded, so what you hand over is what you get back — with an e-receipt to match.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
