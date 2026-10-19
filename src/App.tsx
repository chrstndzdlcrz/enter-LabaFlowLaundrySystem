import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ErrorBoundary } from "@/components/common/error-boundary";
import { AuthProvider } from "./providers/auth-provider";
import { routers } from "./router";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/**
 * Registers the offline app shell for the installable mobile experience. Only the
 * production build registers it, so development and preview never serve cached
 * assets. The path follows the deployment base, so a project-site deployment
 * (e.g. /repo/) finds its own service worker.
 */
function useOfflineShell() {
  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
      void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error) => {
        console.error("Lab a Day: offline shell could not be registered", error);
      });
    });
  }, []);
}

/** "" for a root deployment, "/repo" for a GitHub project site. */
const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, "");

const App = () => {
  useOfflineShell();
  const router = createBrowserRouter(routers, { basename: routerBasename || "/" });
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ErrorBoundary>
            <RouterProvider router={router} />
          </ErrorBoundary>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
