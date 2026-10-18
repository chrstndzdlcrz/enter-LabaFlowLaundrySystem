import {
  Bell,
  Boxes,
  CalendarCheck,
  ClipboardList,
  LayoutDashboard,
  MessageSquare,
  Package,
  PlusCircle,
  Radio,
  Receipt,
  Settings,
  HelpCircle,
  UserCog,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
  adminOnly?: boolean;
};

export type NavGroup = { title: string; items: NavItem[] };

export const customerNav: NavGroup[] = [
  {
    title: "My laundry",
    items: [
      { label: "Dashboard", to: "/app", icon: LayoutDashboard, end: true },
      { label: "Book a service", to: "/app/book", icon: PlusCircle },
      { label: "My orders", to: "/app/orders", icon: ClipboardList },
      { label: "Receipts", to: "/app/receipts", icon: Receipt },
    ],
  },
  {
    title: "Keep in touch",
    items: [
      { label: "Notifications", to: "/app/notifications", icon: Bell },
      { label: "Chat with the shop", to: "/app/chat", icon: MessageSquare },
      { label: "My profile", to: "/app/profile", icon: UserCog },
    ],
  },
];

export const manageNav: NavGroup[] = [
  {
    title: "Counter",
    items: [
      { label: "Dashboard", to: "/manage", icon: LayoutDashboard, end: true },
      { label: "Orders", to: "/manage/orders", icon: ClipboardList },
      { label: "Bookings", to: "/manage/bookings", icon: CalendarCheck },
      { label: "Receipts", to: "/manage/receipts", icon: Receipt },
      { label: "Customer chat", to: "/manage/chat", icon: MessageSquare },
    ],
  },
  {
    title: "Shop operations",
    items: [
      { label: "Supplies & stock", to: "/manage/inventory", icon: Boxes },
      { label: "Services & prices", to: "/manage/services", icon: Package, adminOnly: true },
      { label: "Sales reports", to: "/manage/reports", icon: Users, adminOnly: true },
      { label: "RFID readers", to: "/manage/rfid", icon: Radio },
    ],
  },
  {
    title: "Shop administration",
    items: [
      { label: "Staff & roles", to: "/manage/staff", icon: UserCog, adminOnly: true },
      { label: "FAQ entries", to: "/manage/faqs", icon: HelpCircle, adminOnly: true },
      { label: "Shop settings", to: "/manage/settings", icon: Settings, adminOnly: true },
    ],
  },
];
