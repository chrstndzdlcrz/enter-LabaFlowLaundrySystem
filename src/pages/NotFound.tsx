import { Link } from "react-router-dom";
import { Home, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OceanBackground } from "@/components/layout/ocean-background";

const NotFound = () => {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-breeze px-4">
      <OceanBackground />
      <div className="relative z-10 w-full max-w-md space-y-5 rounded-2xl border border-border bg-card/90 p-8 text-center shadow-elegant backdrop-blur">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-ocean text-primary-foreground">
          <Waves className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="space-y-2">
          <p className="font-display text-4xl font-extrabold text-foreground">404</p>
          <h1 className="font-display text-lg font-bold text-foreground">This page is not in the basket</h1>
          <p className="text-sm text-muted-foreground">
            The link may be old, or the page may have moved. Head back to the shop home page.
          </p>
        </div>
        <Button asChild>
          <Link to="/">
            <Home className="mr-2 h-4 w-4" aria-hidden="true" />
            Back to the home page
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
