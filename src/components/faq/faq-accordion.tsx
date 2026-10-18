import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { Faq } from "@/lib/api/types";

/** Keyboard-accessible expand/collapse list of questions and answers. */
export function FaqAccordion({ faqs, idPrefix = "faq" }: { faqs: Faq[]; idPrefix?: string }) {
  return (
    <Accordion type="single" collapsible className="w-full">
      {faqs.map((faq) => (
        <AccordionItem key={faq.id} value={`${idPrefix}-${faq.id}`} className="border-border">
          <AccordionTrigger className="text-left font-display text-base font-semibold hover:no-underline">
            {faq.question}
          </AccordionTrigger>
          <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
            {faq.answer}
            {faq.category ? (
              <span className="mt-3 block text-[11px] font-medium uppercase tracking-[0.14em] text-primary">
                {faq.category}
              </span>
            ) : null}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
