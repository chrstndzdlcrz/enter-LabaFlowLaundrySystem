import { supabase } from "@/integrations/supabase/client";
import type { Conversation, ConversationParticipant, ConversationWithCustomer, MessageWithSender } from "./types";

/** Customers get their single shop conversation, created on first use. */
export async function getMyConversation(): Promise<Conversation> {
  const { data, error } = await supabase.rpc("get_or_create_my_conversation");
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Your conversation could not be opened.");
  return data as unknown as Conversation;
}

export async function openConversationForCustomer(customerId: string): Promise<Conversation> {
  const { data, error } = await supabase.rpc("staff_open_conversation", { p_customer_id: customerId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("That conversation could not be opened.");
  return data as unknown as Conversation;
}

export async function listStaffConversations(): Promise<ConversationWithCustomer[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*, profiles!conversations_customer_id_fkey(id, full_name, email, is_demo)")
    .order("last_message_at", { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as never;
}

export async function listMessages(conversationId: string): Promise<MessageWithSender[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*, profiles(id, full_name, role)")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []) as never;
}

export async function sendMessage(conversationId: string, body: string): Promise<MessageWithSender> {
  const { data: session } = await supabase.auth.getUser();
  if (!session.user) throw new Error("You are not signed in.");

  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: session.user.id, body: body.trim() })
    .select("*, profiles(id, full_name, role)")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Your message could not be sent.");
  return data as never;
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const { error } = await supabase.rpc("mark_conversation_read", { p_conversation_id: conversationId });
  if (error) throw new Error(error.message);
}

export async function listParticipants(conversationId: string): Promise<ConversationParticipant[]> {
  const { data, error } = await supabase
    .from("conversation_participants")
    .select("*")
    .eq("conversation_id", conversationId);
  if (error) throw new Error(error.message);
  return data ?? [];
}
