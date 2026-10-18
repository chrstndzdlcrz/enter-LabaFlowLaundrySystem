import { Link } from "react-router-dom";
import { ArrowRight, MessageSquare, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LABAFLOW_IMAGES } from "@/lib/assets";
import { useAuth } from "@/hooks/use-auth";
import type { ShopSettings } from "@/lib/api/types";

export function CtaSection({ settings }: { settings: ShopSettings | undefined }) {
  const { user, role } = useAuth();
  const dashboardPath = role === "customer" || !role ? "/app" : "/manage";

  return (
    <section className="relative px-4 pb-20 pt-4 sm:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="relative overflow-hidden rounded-[2rem] border border-border shadow-elegant">
          <img
            src={LABAFLOW_IMAGES.bubbleTexture}
            crossOrigin="anonymous"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-background/80" aria-hidden="true" />
          <div className="relative px-6 py-12 sm:px-12 sm:py-16">
            <div className="max-w-xl space-y-5">
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                Ready for laundry you can actually track?
              </h2>
              <p className="text-muted-foreground">
                {settings?.address ? (
                  <span className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {settings.address}
                  </span>
                ) : (
                  "Drop by the counter, or pre-book and skip the queue."
                )}
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                {user ? (
                  <Button asChild size="lg">
                    <Link to={dashboardPath}>
                      Go to my dashboard
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                ) : (
                  <Button asChild size="lg">
                    <Link to="/register">
                      Create your free account
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                )}
                <Button asChild size="lg" variant="outline">
                  <Link to="/login">
                    <MessageSquare className="mr-2 h-4 w-4" aria-hidden="true" />
                    Sign in to message the shop
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
