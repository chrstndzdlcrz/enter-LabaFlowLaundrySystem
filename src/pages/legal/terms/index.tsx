import { useQuery } from "@tanstack/react-query";
import { PublicLayout } from "@/components/layout/public-layout";
import { Card, CardContent } from "@/components/ui/card";
import { fetchShopSettings } from "@/lib/api/settings";
import { useAuth } from "@/hooks/use-auth";

/**
 * Plain-language terms of service. Everything stated here matches how the app and
 * the counter actually work today — the price list in the app, the per-wash
 * weight limits, and payment at the counter.
 */
const SECTIONS = [
  {
    title: "What we do",
    body: [
      "The shop washes, dries and folds the laundry you hand over, and keeps a digital record of your order from drop-off to pick-up.",
      "The order status shown in LabaFlow is updated by our staff as your laundry moves through the shop.",
    ],
  },
  {
    title: "Prices",
    body: [
      "The price list in the app shows each service, the weight or piece it is priced by, and any limit per wash.",
      "The amount shown when you book is what the price list says for the quantities you entered. The final amount is confirmed at the counter, where your laundry is weighed.",
      "A price can be changed by the shop at any time. Orders already recorded keep the prices they were booked at, and every e-receipt shows exactly what was charged.",
    ],
  },
  {
    title: "Bookings and weight limits",
    body: [
      "A booking is a request. We confirm it and take in your laundry at the counter.",
      "Each wash has a maximum weight, shown on the service. Heavier loads must be split into separate bookings, because each service is washed one load at a time.",
    ],
  },
  {
    title: "Payment and receipts",
    body: [
      "Payment is collected at the counter, in cash or by GCash. LabaFlow records the payment and issues your e-receipt; it does not process card payments online.",
      "Your e-receipt is available in your account. Keep it as your record of the transaction.",
    ],
  },
  {
    title: "Pick-up",
    body: [
      "The shop is a drop-off and walk-in counter service. LabaFlow notifies you when your order is ready, and does not dispatch riders.",
      "Please claim your laundry at the counter and present your order code or receipt.",
      "Turnaround times shown in the app are estimates for the shop's normal working pace.",
    ],
  },
  {
    title: "Cancelling",
    body: [
      "You can cancel a booking yourself from the app while it is still waiting for confirmation or has just been confirmed.",
      "Once your laundry is being processed, talk to our staff in chat or at the counter instead.",
    ],
  },
  {
    title: "Your items",
    body: [
      "Please point out anything fragile, stained, or requiring special care when you drop it off, and we will follow those instructions.",
      "If something about your order is not right, tell us at the counter or in chat with your order code and we will check the order record with you.",
    ],
  },
  {
    title: "Your account",
    body: [
      "Keep your password to yourself. The shop will never ask you for it.",
      "Use your own account for your own laundry. Staff accounts are created by the shop, and only the shop owner controls who has access.",
    ],
  },
];

export default function TermsOfService() {
  const { data: settings } = useQuery({ queryKey: ["shop-settings"], queryFn: fetchShopSettings });
  const { user } = useAuth();
  const shopName = settings?.shop_name ?? "Lab-a-Day Laundry Shop";

  return (
    <PublicLayout>
      <section className="relative px-4 py-16 sm:px-6">
        <div className="mx-auto w-full max-w-3xl space-y-8">
          <header className="space-y-3">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Terms of service
            </h1>
            <p className="text-muted-foreground">
              These are the terms for using LabaFlow, the online counter of {shopName}. They describe how
              bookings, prices, payment and pick-up work.
            </p>
          </header>

          <div className="grid gap-4">
            {SECTIONS.map((section) => (
              <Card key={section.title} className="border-border/80">
                <CardContent className="space-y-2 p-5">
                  <h2 className="font-display text-lg font-bold text-foreground">{section.title}</h2>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {section.body.map((line) => (
                      <li key={line} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="space-y-2 p-5 text-sm">
              <h2 className="font-display text-lg font-bold text-foreground">Contact</h2>
              <ul className="space-y-1 text-muted-foreground">
                <li>{shopName}</li>
                {settings?.address ? <li>{settings.address}</li> : null}
                {settings?.phone ? <li>Mobile: {settings.phone}</li> : null}
                {settings?.email ? <li>Email: {settings.email}</li> : null}
              </ul>
              {user ? (
                <p className="text-muted-foreground">
                  Signed in as {user.email}. You can reach the shop any time from the chat in your account.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>
    </PublicLayout>
  );
}
