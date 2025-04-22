"use client";

import { toast as sonnerToast } from "sonner";

// Wrapper to centralize toast imports and add promise support
export const toast = {
  success: sonnerToast.success,
  error: sonnerToast.error,
  info: sonnerToast.info,
  warning: sonnerToast.warning,
  loading: sonnerToast.loading,
  dismiss: sonnerToast.dismiss,
  promise: sonnerToast.promise,
};
