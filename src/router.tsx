import { lazy, Suspense } from "react";
import { AdminOnly, ProtectedRoute } from "@/components/auth/protected-route";
import { UnexpectedErrorCard } from "@/components/common/unexpected-error";
import { FullPageLoader } from "@/components/common/loading-state";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { customerNav, manageNav } from "@/components/layout/nav-items";
import Landing from "./pages/landing";
import NotFound from "./pages/NotFound";

/**
 * The signed-in areas are loaded on demand so the public landing page stays light
 * on mobile. Each area gets its own chunk, including the reporting library.
 */
const Login = lazy(() => import("./pages/auth/login"));
const Register = lazy(() => import("./pages/auth/register"));
const RoleRedirect = lazy(() => import("./pages/auth/redirect"));
const PrivacyPolicy = lazy(() => import("./pages/legal/privacy"));
const TermsOfService = lazy(() => import("./pages/legal/terms"));
const CustomerDashboard = lazy(() => import("./pages/customer/dashboard"));
const BookService = lazy(() => import("./pages/customer/book"));
const CustomerOrders = lazy(() => import("./pages/customer/orders"));
const CustomerOrderDetail = lazy(() => import("./pages/customer/order-detail"));
const CustomerReceipts = lazy(() => import("./pages/customer/receipts"));
const CustomerReceiptDetail = lazy(() => import("./pages/customer/receipt-detail"));
const CustomerNotifications = lazy(() => import("./pages/customer/notifications"));
const CustomerChat = lazy(() => import("./pages/customer/chat"));
const CustomerProfile = lazy(() => import("./pages/customer/profile"));
const ManageDashboard = lazy(() => import("./pages/manage/dashboard"));
const ManageOrders = lazy(() => import("./pages/manage/orders"));
const ManageOrderDetail = lazy(() => import("./pages/manage/order-detail"));
const ManageBookings = lazy(() => import("./pages/manage/bookings"));
const ManageInventory = lazy(() => import("./pages/manage/inventory"));
const ManageServices = lazy(() => import("./pages/manage/services"));
const ManageReports = lazy(() => import("./pages/manage/sales"));
const ManageReceipts = lazy(() => import("./pages/manage/receipts"));
const ManageReceiptDetail = lazy(() => import("./pages/manage/receipt-detail"));
const ManageChat = lazy(() => import("./pages/manage/chat"));
const ManageFaqs = lazy(() => import("./pages/manage/faqs"));
const ManageRfid = lazy(() => import("./pages/manage/rfid"));
const ManageStaff = lazy(() => import("./pages/manage/staff"));
const ManageSettings = lazy(() => import("./pages/manage/settings"));

/** Route-level split: the fallback is stable and sized, so nothing jumps. */
const withFallback = (node: React.ReactNode, label?: string) => (
  <Suspense fallback={<FullPageLoader label={label} />}>{node}</Suspense>
);

/** Customer area: their own orders, receipts, notifications, chat and profile. */
const CustomerArea = () => (
  <ProtectedRoute roles={["customer"]}>
    <DashboardLayout
      groups={customerNav}
      areaLabel="Customer area"
      showNotifications
      notificationsPath="/app/notifications"
    />
  </ProtectedRoute>
);

/** Staff and admin area: the counter workflow and shop administration. */
const ManageArea = () => (
  <ProtectedRoute roles={["staff", "admin"]}>
    <DashboardLayout groups={manageNav} areaLabel="Shop operations" />
  </ProtectedRoute>
);

export const routers = [
  {
    path: "/",
    name: "home",
    element: <Landing />,
  },
  {
    path: "/login",
    name: "login",
    element: withFallback(<Login />, "Loading the sign-in screen…"),
    errorElement: <UnexpectedErrorCard />,
  },
  {
    path: "/register",
    name: "register",
    element: withFallback(<Register />, "Loading the registration screen…"),
    errorElement: <UnexpectedErrorCard />,
  },
  {
    // Referenced by the Google sign-in consent screen as the privacy policy.
    path: "/privacy",
    name: "privacyPolicy",
    element: withFallback(<PrivacyPolicy />, "Loading the privacy policy…"),
  },
  {
    // Referenced by the Google sign-in consent screen as the terms of service.
    path: "/terms",
    name: "termsOfService",
    element: withFallback(<TermsOfService />, "Loading the terms of service…"),
  },
  {
    path: "/dashboard",
    name: "dashboardRedirect",
    element: withFallback(<RoleRedirect />),
  },
  {
    path: "/app",
    name: "customerArea",
    element: <CustomerArea />,
    errorElement: <UnexpectedErrorCard />,
    children: [
      { index: true, name: "customerDashboard", element: withFallback(<CustomerDashboard />) },
      { path: "book", name: "customerBookService", element: withFallback(<BookService />) },
      { path: "orders", name: "customerOrders", element: withFallback(<CustomerOrders />) },
      {
        path: "orders/:orderId",
        name: "customerOrderDetail",
        element: withFallback(<CustomerOrderDetail />),
      },
      { path: "receipts", name: "customerReceipts", element: withFallback(<CustomerReceipts />) },
      {
        path: "receipts/:receiptId",
        name: "customerReceiptDetail",
        element: withFallback(<CustomerReceiptDetail />),
      },
      {
        path: "notifications",
        name: "customerNotifications",
        element: withFallback(<CustomerNotifications />),
      },
      { path: "chat", name: "customerChat", element: withFallback(<CustomerChat />) },
      { path: "profile", name: "customerProfile", element: withFallback(<CustomerProfile />) },
    ],
  },
  {
    path: "/manage",
    name: "manageArea",
    element: <ManageArea />,
    errorElement: <UnexpectedErrorCard />,
    children: [
      { index: true, name: "manageDashboard", element: withFallback(<ManageDashboard />) },
      { path: "orders", name: "manageOrders", element: withFallback(<ManageOrders />) },
      {
        path: "orders/:orderId",
        name: "manageOrderDetail",
        element: withFallback(<ManageOrderDetail />),
      },
      { path: "bookings", name: "manageBookings", element: withFallback(<ManageBookings />) },
      { path: "inventory", name: "manageInventory", element: withFallback(<ManageInventory />) },
      {
        path: "services",
        name: "manageServices",
        element: withFallback(<ManageServices />),
      },
      {
        path: "reports",
        name: "manageReports",
        element: withFallback(
          <AdminOnly>
            <ManageReports />
          </AdminOnly>,
        ),
      },
      { path: "receipts", name: "manageReceipts", element: withFallback(<ManageReceipts />) },
      {
        path: "receipts/:receiptId",
        name: "manageReceiptDetail",
        element: withFallback(<ManageReceiptDetail />),
      },
      { path: "chat", name: "manageChat", element: withFallback(<ManageChat />) },
      { path: "rfid", name: "manageRfid", element: withFallback(<ManageRfid />) },
      {
        path: "faqs",
        name: "manageFaqs",
        element: withFallback(<ManageFaqs />),
      },
      {
        path: "staff",
        name: "manageStaff",
        element: withFallback(
          <AdminOnly>
            <ManageStaff />
          </AdminOnly>,
        ),
      },
      {
        path: "settings",
        name: "manageSettings",
        element: withFallback(<ManageSettings />),
      },
    ],
  },
  /* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */
  {
    path: "*",
    name: "404",
    element: <NotFound />,
  },
];

declare global {
  interface Window {
    __routers__: typeof routers;
  }
}

window.__routers__ = routers;
