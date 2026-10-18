import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingState } from "@/components/common/loading-state";
import { FaqAccordion } from "@/components/faq/faq-accordion";
import { listFaqs } from "@/lib/api/faqs";

export function FaqSection() {
  const { data: faqs, isLoading } = useQuery({ queryKey: ["faqs", "public"], queryFn: () => listFaqs() });

  return (
    <section id="faq" className="relative px-4 py-16 sm:px-6">
      <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-4">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Questions we hear at the counter
          </h2>
          <p className="text-muted-foreground">
            Still unsure about something? Create an account and message the shop directly — staff answer
            inside LabaFlow.
          </p>
          <Button asChild variant="outline">
            <Link to="/register">Ask the shop</Link>
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-card/80 p-2 shadow-elegant backdrop-blur sm:p-4">
          {isLoading ? (
            <LoadingState label="Loading questions…" />
          ) : (faqs ?? []).length === 0 ? (
            <EmptyState
              icon={HelpCircle}
              title="No published questions yet"
              description="The shop has not published any FAQ entries yet."
            />
          ) : (
            <FaqAccordion faqs={faqs ?? []} />
          )}
        </div>
      </div>
    </section>
  );
}
