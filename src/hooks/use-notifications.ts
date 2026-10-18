import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  countUnreadNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications";
import type { Notification } from "@/lib/api/types";
import { useAuth } from "./use-auth";

export type NotificationPermissionState = "unsupported" | "default" | "granted" | "denied";

function readPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return window.Notification.permission as NotificationPermissionState;
}

/**
 * Realtime notifications for the signed-in customer.
 *
 * Delivery here is in-app plus a browser notification while the site is open -
 * something this app can actually prove. Background push depends on the shop's
 * own Firebase credentials and is reported separately by the backend.
 */
export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [permission, setPermission] = useState<NotificationPermissionState>(readPermission);

  const notificationsQuery = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => listNotifications(),
    enabled: Boolean(user?.id),
  });

  const unreadQuery = useQuery({
    queryKey: ["notifications", "unread", user?.id],
    queryFn: countUnreadNotifications,
    enabled: Boolean(user?.id),
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }, [queryClient]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const incoming = payload.new as Notification;
          invalidate();

          // Only notify from the OS when the tab is actually in the background,
          // so an open page does not double-report the same event.
          if (typeof window !== "undefined" && "Notification" in window && window.Notification.permission === "granted") {
            if (document.hidden) {
              try {
                new window.Notification(incoming.title, { body: incoming.body, tag: incoming.id });
              } catch (error) {
                console.error("Lab a Day: browser notification failed", error);
              }
            }
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, invalidate]);

  const markRead = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: invalidate,
  });

  const markAllRead = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: invalidate,
  });

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return "unsupported" as NotificationPermissionState;
    }
    const result = (await window.Notification.requestPermission()) as NotificationPermissionState;
    setPermission(result);
    return result;
  }, []);

  return {
    notifications: notificationsQuery.data ?? [],
    isLoading: notificationsQuery.isLoading,
    error: notificationsQuery.error,
    unreadCount: unreadQuery.data ?? 0,
    permission,
    requestPermission,
    markRead: markRead.mutateAsync,
    markAllRead: markAllRead.mutateAsync,
    isMarkingAll: markAllRead.isPending,
    refresh: invalidate,
  };
}
