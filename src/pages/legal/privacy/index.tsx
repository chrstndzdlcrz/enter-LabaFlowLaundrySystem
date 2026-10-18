import { useQuery } from "@tanstack/react-query";
import { PublicLayout } from "@/components/layout/public-layout";
import { Card, CardContent } from "@/components/ui/card";
import { fetchShopSettings } from "@/lib/api/settings";

/**
 * Plain-language privacy policy. It describes exactly what LabaFlow stores and
 * why — nothing more, and no data selling of any kind.
 */
const SECTIONS = [
  {
    title: "What we collect",
    body: [
      "When you create an account: your name, email address, and — only if you choose to give it — your mobile number, address and a profile photo link.",
      "When you use Google sign-in: your name and email address from your Google account. Nothing else, and we never see your Google password.",
      "When you book or drop off laundry: the services, quantities and instructions on your order, its status history, the payments recorded at the counter, and the e-receipts issued for them.",
      "When you message the shop: the messages in your conversation with our staff.",
      "If you allow notifications: a device identifier so the app can tell you when your order is ready.",
    ],
  },
  {
    title: "Why we keep it",
    body: [
      "To wash, track and release your laundry correctly, and to keep a record of what was received and what was paid.",
      "To notify you when your order is ready for pick-up.",
      "To answer your questions in chat, and to look back at an order if something needs checking.",
    ],
  },
  {
    title: "What we never do",
    body: [
      "We do not sell, rent or trade your information.",
      "We do not use your information for advertising.",
      "We do not ask for your password, your card details or your one-time codes.",
    ],
  },
  {
    title: "Who can see what",
    body: [
      "Your orders, receipts, notifications and chat are visible to you and to the shop's authorised staff and owner.",
      "Other customers cannot see your orders, receipts or conversations. This is enforced by the database itself, not only by the screen you are looking at.",
      "The shop staff can see the contact details you gave, so they can reach you about an order.",
    ],
  },
  {
    title: "How long we keep it",
    body: [
      "Orders and receipts are kept as the shop's business record of the work done and the payment made.",
      "You can change your contact details at any time in your profile, and you can switch your account off yourself (the 'Switch off my account' button). Ask the shop to switch it back on if you change your mind.",
    ],
  },
  {
    title: "Your choices",
    body: [
      "You may ask the shop to show you the information held about your account, to correct it, or to switch the account off.",
      "Browser notifications can be turned off at any time in your browser's site settings.",
    ],
  },
];

export default function PrivacyPolicy() {
  const { data: settings } = useQuery({ queryKey: ["shop-settings"], queryFn: fetchShopSettings });
  const shopName = settings?.shop_name ?? "Lab-a-Day Laundry Shop";

  return (
    <PublicLayout>
      <section className="relative px-4 py-16 sm:px-6">
        <div className="mx-auto w-full max-w-3xl space-y-8">
          <header className="space-y-3">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Privacy policy
            </h1>
            <p className="text-muted-foreground">
              This policy explains what {shopName} collects through LabaFlow, why we keep it, and who can
              see it. We have written it in plain language on purpose.
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
              <h2 className="font-display text-lg font-bold text-foreground">Questions or requests</h2>
              <p className="text-muted-foreground">
                Contact the shop and we will help you with anything about your account or your data:
              </p>
              <ul className="space-y-1 text-muted-foreground">
                <li>{shopName}</li>
                {settings?.address ? <li>{settings.address}</li> : null}
                {settings?.phone ? <li>Mobile: {settings.phone}</li> : null}
                {settings?.email ? <li>Email: {settings.email}</li> : null}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>
    </PublicLayout>
  );
}
