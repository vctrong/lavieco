"use client";

import type { ReactNode } from "react";

import { ToastProvider } from "@lavieco/ui";

import { TEXT } from "../constants/text";

/** Toasts for every dashboard page, with the admin's Vietnamese labels. */
export function AdminToasts({ children }: { children: ReactNode }) {
  return <ToastProvider labels={TEXT.vi.toast}>{children}</ToastProvider>;
}
