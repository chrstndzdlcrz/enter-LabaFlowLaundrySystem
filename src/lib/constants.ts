/** Shared domain constants for LabaFlow. */

export type UserRole = "customer" | "staff" | "admin";

export const USER_ROLES: UserRole[] = ["customer", "staff", "admin"];

export const ROLE_LABELS: Record<UserRole, string> = {
  customer: "Customer",
  staff: "Staff / Seller",
  admin: "Admin / Owner",
};

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "received"
  | "in_progress"
  | "ready_for_pickup"
  | "completed"
  | "cancelled";

/** The processing lifecycle, in order. Mirrors the database trigger exactly. */
export const ORDER_FLOW: OrderStatus[] = [
  "pending",
  "confirmed",
  "received",
  "in_progress",
  "ready_for_pickup",
  "completed",
];

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; short: string; description: string; tone: "neutral" | "info" | "progress" | "success" | "warning" | "danger" }
> = {
  pending: {
    label: "Booking received",
    short: "Pending",
    description: "Waiting for the shop to confirm your booking.",
    tone: "warning",
  },
  confirmed: {
    label: "Confirmed",
    short: "Confirmed",
    description: "The shop confirmed your booking. Bring your laundry to the counter.",
    tone: "info",
  },
  received: {
    label: "Received at counter",
    short: "Received",
    description: "We have your laundry and have started logging it in.",
    tone: "info",
  },
  in_progress: {
    label: "In progress",
    short: "In progress",
    description: "Washing, drying or pressing is underway.",
    tone: "progress",
  },
  ready_for_pickup: {
    label: "Ready for pick-up",
    short: "Ready",
    description: "Your laundry is done. You can claim it at the counter.",
    tone: "success",
  },
  completed: {
    label: "Completed / released",
    short: "Completed",
    description: "Paid and released to the customer.",
    tone: "success",
  },
  cancelled: {
    label: "Cancelled",
    short: "Cancelled",
    description: "This order was cancelled.",
    tone: "danger",
  },
};

/** Allowed manual transitions, matching the server-side lifecycle guard. */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["received", "cancelled"],
  received: ["in_progress", "cancelled"],
  in_progress: ["ready_for_pickup", "cancelled"],
  ready_for_pickup: ["completed", "in_progress"],
  completed: [],
  cancelled: [],
};

export const SERVICE_UNITS = [
  { value: "kg", label: "per kilogram" },
  { value: "piece", label: "per piece" },
  { value: "load", label: "per load" },
  { value: "service", label: "per service" },
];

/** Compact suffix used next to a price, e.g. "₱45.00 / kg". */
export const UNIT_SUFFIX: Record<string, string> = {
  kg: "/ kg",
  piece: "/ piece",
  load: "/ load",
  service: "/ service",
};

/** What the customer types into the quantity field for each unit. */
export const UNIT_QUANTITY_LABEL: Record<string, string> = {
  kg: "Weight in kilograms",
  piece: "Number of pieces",
  load: "Number of loads",
  service: "Number of services",
};

export const INVENTORY_REASONS = [
  { value: "purchase", label: "Purchase / restock" },
  { value: "consumption", label: "Shop consumption" },
  { value: "adjustment", label: "Correction / count" },
  { value: "waste", label: "Waste or spillage" },
  { value: "return", label: "Returned to supplier" },
];

export const CONSUMPTION_STAGES: { value: OrderStatus; label: string }[] = [
  { value: "received", label: "When the order is received at the counter" },
  { value: "in_progress", label: "When the order starts processing" },
  { value: "ready_for_pickup", label: "When the order is ready for pick-up" },
  { value: "completed", label: "When the order is completed" },
];

export const DEFAULT_PAYMENT_CHANNELS = ["Cash", "GCash"];

export const PHONE_PATTERN = /^[+()\d][\d\s()+-]{6,19}$/;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * How the customer asks for the load to be sorted. The shop does not take
 * responsibility for colours that run when the customer chooses "mixed".
 */
export const LOAD_TYPES = [
  {
    value: "whites",
    label: "Whites only",
    hint: "White and light items washed on their own.",
  },
  {
    value: "colored",
    label: "Coloured",
    hint: "Coloured items washed together, separate from the whites.",
  },
  {
    value: "mixed",
    label: "Mixed",
    hint: "Everything in one load. If colours run, that is on the load, not the shop.",
  },
] as const;

export const LOAD_TYPE_LABELS: Record<string, string> = {
  whites: "Whites only",
  colored: "Coloured",
  mixed: "Mixed",
};

export const DEMO_PASSWORD = "LabaFlow123!";
