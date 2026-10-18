import type { Database } from "@/integrations/supabase/types";

type PublicSchema = Database["public"];

/** Row aliases for the tables this app reads. */
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];

export type Profile = Tables<"profiles">;
export type ShopSettings = Tables<"shop_settings">;
export type Service = Tables<"services">;
export type InventoryItem = Tables<"inventory_items">;
export type InventoryMovement = Tables<"inventory_movements">;
export type ServiceConsumable = Tables<"service_consumables">;
export type Order = Tables<"orders">;
export type OrderItem = Tables<"order_items">;
export type OrderStatusHistoryRow = Tables<"order_status_history">;
export type Payment = Tables<"payments">;
export type Receipt = Tables<"receipts">;
export type Notification = Tables<"notifications">;
export type DeviceToken = Tables<"device_tokens">;
export type Conversation = Tables<"conversations">;
export type ConversationParticipant = Tables<"conversation_participants">;
export type Message = Tables<"messages">;
export type Faq = Tables<"faqs">;
export type RfidDevice = Tables<"rfid_devices">;
export type RfidTag = Tables<"rfid_tags">;
export type RfidEvent = Tables<"rfid_events">;

export type OrderWithRelations = Order & {
  order_items: OrderItem[];
  payments: Payment[];
  receipts: Pick<Receipt, "id" | "receipt_no" | "is_final" | "total">[];
  /** Embedded through the customer_id foreign key (orders has several profile links). */
  customer: Pick<Profile, "id" | "full_name" | "email" | "phone"> | null;
};

export type OrderListItem = Order & {
  order_items: Pick<OrderItem, "id" | "service_name" | "quantity" | "unit">[];
};

export type InventoryItemWithRecipes = InventoryItem & {
  service_consumables: (ServiceConsumable & { services: Pick<Service, "id" | "name"> | null })[];
};

export type ReceiptWithOrder = Receipt & {
  orders: Pick<Order, "id" | "order_code" | "customer_name" | "customer_phone" | "status" | "is_walk_in"> | null;
};

export type MessageWithSender = Message & {
  profiles: Pick<Profile, "id" | "full_name" | "role"> | null;
};

export type ConversationWithCustomer = Conversation & {
  profiles: Pick<Profile, "id" | "full_name" | "email" | "is_demo"> | null;
};
