import { lazy, Suspense } from "react";
import { ProtectedRoute, AdminOnly } from "@/components/auth/protected-route";
import { FullPageLoader } from "@/components/common/loading-state";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { customerNav, manageNav } from "@/components/layout/nav-items";
import Landing from "./pages/landing";
import Login from "./pages/auth/login";
import Register from "./pages/auth/register";
import RoleRedirect from "./pages/auth/redirect";
import NotFound from "./pages/NotFound";

/**
 * The signed-in areas are loaded on demand so the public landing page stays light
 * on mobile. Each area gets its own chunk, including the reporting library.
 */
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

const withFallback = (node: React.ReactNode) => (
  <Suspense fallback={<FullPageLoader />}>{node}</Suspense>
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
    element: <Login />,
  },
  {
    path: "/register",
    name: "register",
    element: <Register />,
  },
  {
    path: "/dashboard",
    name: "dashboardRedirect",
    element: <RoleRedirect />,
  },
  {
    path: "/app",
    name: "customerArea",
    element: <CustomerArea />,
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
        element: withFallback(
          <AdminOnly>
            <ManageServices />
          </AdminOnly>,
        ),
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
        element: withFallback(
          <AdminOnly>
            <ManageFaqs />
          </AdminOnly>,
        ),
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
        element: withFallback(
          <AdminOnly>
            <ManageSettings />
          </AdminOnly>,
        ),
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
