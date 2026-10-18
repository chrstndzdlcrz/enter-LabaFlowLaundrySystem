import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Menu, Phone, Waves } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { OceanBackground } from "./ocean-background";
import { fetchShopSettings } from "@/lib/api/settings";
import { useAuth } from "@/hooks/use-auth";

const LINKS = [
  { label: "Services & prices", href: "#services" },
  { label: "Our equipment", href: "#equipment" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Questions", href: "#faq" },
];

function BrandMark() {
  return (
    <span className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-ocean text-primary-foreground shadow-elegant">
        <Waves className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-display text-lg font-extrabold tracking-tight text-foreground">LabaFlow</span>
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Laundry, tracked
        </span>
      </span>
    </span>
  );
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, role } = useAuth();
  const location = useLocation();
  const { data: settings } = useQuery({ queryKey: ["shop-settings"], queryFn: fetchShopSettings });

  const dashboardPath = role === "customer" || !role ? "/app" : "/manage";
  const onLanding = location.pathname === "/";

  return (
    <div className="relative flex min-h-screen flex-col bg-gradient-breeze">
      <OceanBackground />

      <header className="relative z-20 border-b border-border/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" aria-label="LabaFlow home">
            <BrandMark />
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={onLanding ? link.href : `/${link.href}`}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <Button asChild>
                <Link to={dashboardPath}>Go to dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button asChild>
                  <Link to="/register">Create account</Link>
                </Button>
              </>
            )}
          </div>

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="outline" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <SheetTitle className="font-display">Menu</SheetTitle>
              <div className="mt-6 flex flex-col gap-2">
                {LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={onLanding ? link.href : `/${link.href}`}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                  >
                    {link.label}
                  </a>
                ))}
                <div className="mt-4 flex flex-col gap-2">
                  {user ? (
                    <Button asChild>
                      <Link to={dashboardPath}>Go to dashboard</Link>
                    </Button>
                  ) : (
                    <>
                      <Button asChild variant="outline">
                        <Link to="/login">Sign in</Link>
                      </Button>
                      <Button asChild>
                        <Link to="/register">Create account</Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="relative z-10 flex-1">{children}</main>

      <footer className="relative z-10 border-t border-border/70 bg-card/70 backdrop-blur">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
          <div className="space-y-3">
            <BrandMark />
            <p className="max-w-xs text-sm text-muted-foreground">
              {settings?.tagline ?? "Fresh laundry, one day at a time."}
            </p>
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-display font-semibold text-foreground">{settings?.shop_name ?? "Lab-a-Day Laundry Shop"}</p>
            {settings?.address ? (
              <p className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                {settings.address}
              </p>
            ) : null}
            {settings?.phone ? (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                {settings.phone}
              </p>
            ) : null}
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-display font-semibold text-foreground">Your account</p>
            <div className="flex flex-col gap-1">
              <Link to="/login" className="text-muted-foreground hover:text-foreground">
                Sign in
              </Link>
              <Link to="/register" className="text-muted-foreground hover:text-foreground">
                Create an account
              </Link>
              <Link to="/app/orders" className="text-muted-foreground hover:text-foreground">
                Track an order
              </Link>
            </div>
          </div>
        </div>
        <div className="border-t border-border/70 py-4 text-center text-xs text-muted-foreground">
          LabaFlow for {settings?.shop_name ?? "Lab-a-Day Laundry Shop"} — walk-in and drop-off counter service.
        </div>
      </footer>
    </div>
  );
}
