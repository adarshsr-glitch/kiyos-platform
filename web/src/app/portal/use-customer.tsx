"use client";

import { useEffect } from "react";

/** Points the workspace at a customer and reloads it. */
export function UseCustomer({ id }: { id: number }) {
  useEffect(() => {
    document.cookie = `kiyos-case=${id}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
    window.location.replace("/portal");
  }, [id]);
  return null;
}
