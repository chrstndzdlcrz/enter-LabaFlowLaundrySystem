import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ToneBadge } from "@/components/common/status-badge";
import { PageHeader } from "@/components/common/page-header";
import { QueryState } from "@/components/common/query-state";
import { FaqAccordion } from "@/components/faq/faq-accordion";
import { FaqFormDialog } from "@/components/faq/faq-form-dialog";
import { deleteFaq, listFaqs, updateFaq } from "@/lib/api/faqs";
import { alertError, confirmAction, errorMessageFrom, flashSuccess } from "@/lib/alerts";

export default function ManageFaqs() {
  const queryClient = useQueryClient();
  const faqsQuery = useQuery({
    queryKey: ["faqs", "admin"],
    queryFn: () => listFaqs({ includeUnpublished: true }),
  });

  const faqs = faqsQuery.data ?? [];
  const published = faqs.filter((faq) => faq.is_published);

  const togglePublished = useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) =>
      updateFaq(id, { is_published: isPublished }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["faqs"] });
      flashSuccess("FAQ visibility updated");
    },
    onError: async (error) => alertError("The entry could not be updated", errorMessageFrom(error)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const confirmed = await confirmAction({
        title: "Delete this FAQ entry?",
        text: "It disappears from the public site immediately. This cannot be undone.",
        confirmLabel: "Delete entry",
        danger: true,
      });
      if (!confirmed) return false;
      await deleteFaq(id);
      return true;
    },
    onSuccess: async (done) => {
      if (!done) return;
      await queryClient.invalidateQueries({ queryKey: ["faqs"] });
      flashSuccess("FAQ entry deleted");
    },
    onError: async (error) => alertError("The entry could not be deleted", errorMessageFrom(error)),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="FAQ entries"
        description="The questions customers ask most, published on the public site."
        actions={<FaqFormDialog />}
      />

      <QueryState
        isLoading={faqsQuery.isLoading}
        error={faqsQuery.error}
        isEmpty={faqs.length === 0}
        emptyTitle="No FAQ entries yet"
        emptyDescription="Add the questions staff answer most often at the counter."
        emptyAction={<FaqFormDialog />}
      >
        <div className="grid gap-3">
          {faqs.map((faq) => (
            <Card key={faq.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-display font-semibold text-foreground">{faq.question}</span>
                      {faq.is_published ? (
                        <ToneBadge tone="success">Published</ToneBadge>
                      ) : (
                        <ToneBadge tone="neutral">Draft</ToneBadge>
                      )}
                      {faq.category ? <ToneBadge tone="info">{faq.category}</ToneBadge> : null}
                    </p>
                    <p className="max-w-3xl text-sm text-muted-foreground">{faq.answer}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-2">
                      <EyeOff className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                      <Switch
                        checked={faq.is_published}
                        onCheckedChange={(checked) =>
                          togglePublished.mutate({ id: faq.id, isPublished: checked })
                        }
                        aria-label={`Publish ${faq.question}`}
                      />
                    </span>
                    <FaqFormDialog
                      faq={faq}
                      trigger={
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => remove.mutate(faq.id)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">Delete entry</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </QueryState>

      {published.length > 0 ? (
        <Card>
          <CardContent className="space-y-3 p-5">
            <p className="font-display font-semibold text-foreground">
              How customers see it ({published.length} published)
            </p>
            <FaqAccordion faqs={published} idPrefix="preview" />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
