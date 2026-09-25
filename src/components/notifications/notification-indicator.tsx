"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api/client";

export function NotificationIndicator() {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => {
      apiRequest<{ unreadCount: number }>("/api/v1/notifications/", {
        query: { limit: 1 },
        signal: controller.signal,
      })
        .then((page) => setUnread(page.unreadCount))
        .catch(() => undefined);
    };
    refresh();
    window.addEventListener("lsms:notifications-read", refresh);
    return () => {
      controller.abort();
      window.removeEventListener("lsms:notifications-read", refresh);
    };
  }, []);
  return (
    <Link
      href="/notifications/"
      className="relative grid size-11 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
      aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
    >
      <Bell size={19} aria-hidden="true" />
      {unread > 0 && (
        <span className="absolute right-0 top-0 rounded-full bg-red-700 px-1.5 text-[10px] font-bold text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
