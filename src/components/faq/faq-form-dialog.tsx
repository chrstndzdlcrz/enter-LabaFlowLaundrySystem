import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { createFaq, updateFaq } from "@/lib/api/faqs";
import type { Faq } from "@/lib/api/types";
import { errorMessageFrom, flashSuccess } from "@/lib/alerts";

/** Create or edit an FAQ entry shown on the public site. */
export function FaqFormDialog({ faq, trigger }: { faq?: Faq; trigger?: React.ReactNode }) {
  const editing = Boolean(faq);
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [published, setPublished] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) return;
    setQuestion(faq?.question ?? "");
    setAnswer(faq?.answer ?? "");
    setCategory(faq?.category ?? "");
    setSortOrder(String(faq?.sort_order ?? 0));
    setPublished(faq?.is_published ?? true);
    setFormError(null);
  }, [open, faq]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (question.trim().length < 5) throw new Error("Write the question as customers ask it.");
      if (answer.trim().length < 10) throw new Error("Write an answer customers can actually use.");

      const payload = {
        question: question.trim(),
        answer: answer.trim(),
        category: category.trim() || null,
        sort_order: Number(sortOrder) || 0,
        is_published: published,
      };

      if (editing && faq) await updateFaq(faq.id, payload);
      else await createFaq(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["faqs"] });
      setOpen(false);
      flashSuccess(editing ? "FAQ entry updated" : "FAQ entry added");
    },
    onError: (error) => setFormError(errorMessageFrom(error)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Add FAQ entry
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">{editing ? "Edit FAQ entry" : "New FAQ entry"}</DialogTitle>
          <DialogDescription>
            Published entries appear in the Questions section of the public site.
          </DialogDescription>
        </DialogHeader>

        {formError ? (
          <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        ) : null}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="faq-question">Question</Label>
            <Input
              id="faq-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="How long does a regular wash take?"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="faq-answer">Answer</Label>
            <Textarea
              id="faq-answer"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              rows={5}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="faq-category">Category (optional)</Label>
              <Input
                id="faq-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="Turnaround"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="faq-order">Display order</Label>
              <Input
                id="faq-order"
                type="number"
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
            <Label htmlFor="faq-published" className="text-sm font-medium">
              Published on the website
            </Label>
            <Switch id="faq-published" checked={published} onCheckedChange={setPublished} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : editing ? "Save entry" : "Add entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
