import { supabase } from "@/integrations/supabase/client";
import type { Faq } from "./types";

export async function listFaqs(options?: { includeUnpublished?: boolean }): Promise<Faq[]> {
  let query = supabase.from("faqs").select("*").order("sort_order", { ascending: true });
  if (!options?.includeUnpublished) query = query.eq("is_published", true);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createFaq(input: {
  question: string;
  answer: string;
  category: string | null;
  sort_order: number;
  is_published: boolean;
}): Promise<Faq> {
  const { data, error } = await supabase.from("faqs").insert(input).select("*").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("The FAQ entry could not be saved.");
  return data;
}

export async function updateFaq(
  id: string,
  input: Partial<Pick<Faq, "question" | "answer" | "category" | "sort_order" | "is_published">>,
): Promise<Faq> {
  const { data, error } = await supabase.from("faqs").update(input).eq("id", id).select("*").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("The FAQ entry could not be updated.");
  return data;
}

export async function deleteFaq(id: string): Promise<void> {
  const { error } = await supabase.from("faqs").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
