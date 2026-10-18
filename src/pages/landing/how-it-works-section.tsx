import { ClipboardCheck, PackageCheck, Shirt, UserPlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LABAFLOW_IMAGES } from "@/lib/assets";

const STEPS = [
  {
    icon: UserPlus,
    title: "Create your account",
    text: "Sign up with email or Google. You get your own order history, receipts and chat with the shop.",
  },
  {
    icon: ClipboardCheck,
    title: "Pre-book and see the price",
    text: "Choose your services and quantities. LabaFlow computes the total before you submit anything.",
  },
  {
    icon: Shirt,
    title: "We wash and update as we go",
    text: "Received, in progress, ready for pick-up — staff log every change with a timestamp.",
  },
  {
    icon: PackageCheck,
    title: "Claim and keep your receipt",
    text: "Pay by cash or GCash at the counter and your digital receipt is issued automatically.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative px-4 py-16 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-10">
        <div className="max-w-2xl space-y-3">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            How LabaFlow works
          </h2>
          <p className="text-muted-foreground">
            The same workflow whether you pre-book online or walk in with your laundry bag.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <ol className="space-y-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-ocean text-primary-foreground shadow-elegant">
                  <step.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="space-y-1">
                  <p className="font-display font-semibold text-foreground">
                    <span className="mr-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                      Step {index + 1}
                    </span>
                    {step.title}
                  </p>
                  <p className="text-sm text-muted-foreground">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="grid gap-4 sm:grid-cols-2">
            <img
              src={LABAFLOW_IMAGES.foldedLinens}
              crossOrigin="anonymous"
              alt="Freshly laundered folded towels and bedsheets stacked on a counter"
              className="h-56 w-full rounded-2xl border border-border object-cover shadow-elegant sm:h-64"
              width={800}
              height={600}
            />
            <img
              src={LABAFLOW_IMAGES.counterDropoff}
              crossOrigin="anonymous"
              alt="A staff member receiving a laundry bag from a customer at the shop counter"
              className="h-56 w-full rounded-2xl border border-border object-cover shadow-elegant sm:mt-6 sm:h-64"
              width={800}
              height={600}
            />
            <Card className="border-border/80 sm:col-span-2">
              <CardContent className="flex flex-col gap-2 p-5">
                <p className="font-display font-semibold text-foreground">Walk-ins welcome</p>
                <p className="text-sm text-muted-foreground">
                  Walk-in orders are logged at the counter too. If you want pick-up alerts for a counter
                  drop-off, give the staff your account so the order is linked to you.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
