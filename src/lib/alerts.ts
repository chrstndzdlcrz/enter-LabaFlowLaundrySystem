/**
 * SweetAlert2 wrappers so confirmations and alerts share one Oceanic Breeze look
 * and one place to change it.
 *
 * The library is imported on demand: alert boxes only ever appear after someone
 * taps something, so keeping it out of the bundles that render the first screen
 * means the public site does not download it just to be looked at.
 */
import type SwalType from "sweetalert2";

const PRIMARY = "hsl(191, 85%, 33%)";
const DESTRUCTIVE = "hsl(0, 72%, 44%)";
const SUCCESS = "hsl(152, 58%, 30%)";

let alertLibrary: Promise<typeof SwalType> | null = null;

/** Loads SweetAlert2 once, the first time an alert is actually needed. */
export function loadAlerts(): Promise<typeof SwalType> {
  if (!alertLibrary) {
    alertLibrary = import("sweetalert2").then((module) => module.default);
  }
  return alertLibrary;
}

function baseOptions() {
  return {
    confirmButtonColor: PRIMARY,
    cancelButtonColor: "hsl(200, 18%, 40%)",
    customClass: {
      popup: "font-sans rounded-2xl",
      title: "font-display",
      confirmButton: "rounded-xl px-5 py-2.5 font-medium",
      cancelButton: "rounded-xl px-5 py-2.5 font-medium",
    },
    buttonsStyling: true,
    reverseButtons: true,
  };
}

export async function confirmAction(options: {
  title: string;
  text?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  icon?: "warning" | "question" | "info";
}) {
  const Swal = await loadAlerts();
  const result = await Swal.fire({
    ...baseOptions(),
    title: options.title,
    text: options.text,
    icon: options.icon ?? (options.danger ? "warning" : "question"),
    showCancelButton: true,
    confirmButtonText: options.confirmLabel ?? "Confirm",
    cancelButtonText: options.cancelLabel ?? "Cancel",
    confirmButtonColor: options.danger ? DESTRUCTIVE : PRIMARY,
  });
  return result.isConfirmed;
}

export async function alertSuccess(title: string, text?: string) {
  const Swal = await loadAlerts();
  await Swal.fire({
    ...baseOptions(),
    title,
    text,
    icon: "success",
    confirmButtonColor: SUCCESS,
    confirmButtonText: "Done",
  });
}

export async function alertError(title: string, text?: string) {
  const Swal = await loadAlerts();
  await Swal.fire({
    ...baseOptions(),
    title,
    text,
    icon: "error",
    confirmButtonColor: DESTRUCTIVE,
    confirmButtonText: "Close",
  });
}

export async function alertInfo(title: string, text?: string) {
  const Swal = await loadAlerts();
  await Swal.fire({ ...baseOptions(), title, text, icon: "info" });
}

/** Inline, non-blocking feedback for routine saves. */
export function flashSuccess(title: string) {
  void loadAlerts().then((Swal) =>
    Swal.fire({
      ...baseOptions(),
      toast: true,
      position: "top-end",
      icon: "success",
      title,
      showConfirmButton: false,
      timer: 2400,
      timerProgressBar: true,
      customClass: { popup: "font-sans" },
    }),
  );
}

/** Error messages come straight from the backend and are shown as-is. */
export function errorMessageFrom(error: unknown, fallback = "Something went wrong. Please try again.") {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message || fallback;
  const maybe = error as { message?: string; details?: string; hint?: string };
  return maybe.message || maybe.details || maybe.hint || fallback;
}
