import { Link } from "react-router-dom";
import { ArrowLeft, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OceanBackground } from "@/components/layout/ocean-background";
import { Card, CardContent } from "@/components/ui/card";

/** Shared shell for the sign-in and registration screens. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col bg-gradient-breeze">
      <OceanBackground />
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2 self-start">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Back to home
          </Link>
        </Button>

        <Link to="/" className="mb-6 flex items-center gap-2 self-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-ocean text-primary-foreground shadow-elegant">
            <Waves className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="font-display text-xl font-extrabold tracking-tight text-foreground">LabaFlow</span>
        </Link>

        <Card className="border-border/80 shadow-elegant">
          <CardContent className="space-y-6 p-6 sm:p-8">
            <div className="space-y-1 text-center">
              <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
            {children}
          </CardContent>
        </Card>

        {footer ? <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div> : null}
      </div>
    </div>
  );
}
