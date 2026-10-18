import { Link } from "react-router-dom";
import { BadgeCheck, Clock, Droplets, Sparkles, Truck, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LABAFLOW_IMAGES } from "@/lib/assets";

const HIGHLIGHTS = [
  { icon: Clock, label: "Ready in 5–7 hours", detail: "Wash in about 5, bedding in about 7" },
  { icon: Droplets, label: "Sorted and weighed", detail: "Recorded on your order" },
  { icon: BadgeCheck, label: "Tracked end to end", detail: "Status you can follow" },
];

export function HeroSection({ shopName }: { shopName: string }) {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-12 sm:px-6 sm:pt-16">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
        <div className="animate-slide-up space-y-7">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <Waves className="h-3.5 w-3.5" aria-hidden="true" />
            {shopName}
          </span>

          <div className="space-y-4">
            <h1 className="font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Laundry day, <span className="text-gradient-ocean">one day at a time</span>.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Book your wash, see the price before you commit, and follow every step from drop-off to
              pick-up. No paper logbooks, no guessing whether it is ready.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="shadow-elegant">
              <Link to="/register">Book a laundry service</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/login">Sign in to track an order</Link>
            </Button>
          </div>

          <ul className="grid gap-3 pt-2 sm:grid-cols-3">
            {HIGHLIGHTS.map((item) => (
              <li key={item.label} className="flex items-start gap-3 rounded-xl bg-card/70 p-3 backdrop-blur">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="space-y-0.5">
                  <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                  <span className="block text-xs text-muted-foreground">{item.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative animate-fade-in">
          <div className="absolute -inset-4 rounded-[2rem] bg-gradient-ocean opacity-15 blur-2xl" aria-hidden="true" />
          <img
            src={LABAFLOW_IMAGES.hero}
            crossOrigin="anonymous"
            alt="Folded linens stacked beside the washing machines inside Lab-a-Day Laundry Shop"
            className="relative w-full rounded-[1.75rem] border border-border object-cover shadow-elegant"
            width={1024}
            height={576}
          />
          <Card className="relative -mt-10 ml-4 mr-4 border-border/80 bg-card/95 backdrop-blur sm:ml-8 sm:mr-8">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="space-y-0.5">
                  <span className="block text-sm font-semibold text-foreground">Digital receipt on file</span>
                  <span className="block text-xs text-muted-foreground">Every completed transaction</span>
                </span>
              </span>
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Truck className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="space-y-0.5">
                  <span className="block text-sm font-semibold text-foreground">Walk-in or pre-booked</span>
                  <span className="block text-xs text-muted-foreground">Same counter, same tracking</span>
                </span>
              </span>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
