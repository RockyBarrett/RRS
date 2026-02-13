"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

export default function ViewTracker({
  token,
  eventType = "page_view",
}: {
  token: string;
  eventType?: string;
}) {
  const sentRef = useRef(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!token) return;
    if (sentRef.current) return;

    // 🚫 Skip tracking for admin / preview views
    if (searchParams.get("admin") === "1") {
      return;
    }

    sentRef.current = true;

    fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token,
        event_type: eventType,
      }),
    }).catch(() => {});
  }, [token, eventType, searchParams]);

  return null;
}