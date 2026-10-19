/**
 * Google sign-in plumbing.
 *
 * Why the app does not simply bounce to Google and back: the backend only
 * accepts an OAuth round-trip that returns to an origin on its redirect
 * allow-list, and that list holds the Enter preview and published addresses
 * only. A deployment served from anywhere else - this shop's GitHub Pages
 * site - is not on it, so the round-trip is discarded and the browser is sent
 * to the bare backend host instead of back into the app, where it is met with a
 * server sign-in prompt. That is the "Supabase page appears" report.
 *
 * Google's own sign-in widget sidesteps the round-trip: it shows the account
 * chooser in a small window on top of the page and hands back a signed ID
 * token, which the backend exchanges for a session. No redirect target is
 * involved, so it works on any address the site is served from, and it behaves
 * the way people expect a "Continue with Google" button to behave.
 *
 * The redirect round-trip is still used as a fallback, but only where the
 * backend will actually return the browser to this app.
 */
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/integrations/supabase/client";

type GoogleCredentialResponse = {
  credential?: string;
};

export type GoogleIdentity = {
  initialize: (options: {
    client_id: string;
    ux_mode?: "popup" | "redirect";
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    callback: (response: GoogleCredentialResponse) => void;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      type?: "standard" | "icon";
      theme?: "outline" | "filled_blue" | "filled_black";
      size?: "large" | "medium" | "small";
      text?: "signin_with" | "signup_with" | "continue_with" | "signin";
      shape?: "rectangular" | "pill" | "circle" | "square";
      logo_alignment?: "left" | "center";
      width?: number;
    },
  ) => void;
};

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdentity } };
  }
}

export type AuthSettings = {
  external_google_enabled?: boolean;
  external_google_client_id?: string;
  site_url?: string;
  uri_allow_list?: string;
};

let settingsRequest: Promise<AuthSettings | null> | null = null;

/**
 * The project's public authentication settings. `/auth/v1/settings` is readable
 * without a session, so the Google client ID is read from the backend at run
 * time rather than being written into the bundle, where it would go stale the
 * moment the provider configuration changed.
 */
export function loadAuthSettings(): Promise<AuthSettings | null> {
  if (!settingsRequest) {
    settingsRequest = fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
    })
      .then((response) => (response.ok ? (response.json() as Promise<AuthSettings>) : null))
      .catch(() => null);
  }
  return settingsRequest;
}

const GIS_SOURCE = "https://accounts.google.com/gsi/client";
const GIS_TIMEOUT_MS = 6000;

let identityRequest: Promise<GoogleIdentity | null> | null = null;

/** Loads Google's sign-in script once. Resolves to null if it cannot be used. */
export function loadGoogleIdentity(): Promise<GoogleIdentity | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (identityRequest) return identityRequest;

  identityRequest = new Promise<GoogleIdentity | null>((resolve) => {
    const settle = () => resolve(window.google?.accounts?.id ?? null);

    // A blocked or slow script must never leave the button spinning, so the
    // caller is released either way and falls back to the redirect flow.
    const timer = window.setTimeout(settle, GIS_TIMEOUT_MS);

    const done = () => {
      window.clearTimeout(timer);
      settle();
    };

    const script = document.createElement("script");
    script.src = GIS_SOURCE;
    script.async = true;
    script.defer = true;
    script.onload = done;
    script.onerror = done;
    document.head.appendChild(script);
  });

  return identityRequest;
}

/** GoTrue matches allow-list entries as glob patterns. */
function globToRegExp(pattern: string) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const body = escaped.replace(/\*\*|\*|\?/g, (token) => {
    if (token === "**") return ".*";
    if (token === "*") return "[^/]*";
    return "[^/]";
  });
  return new RegExp(`^${body}$`);
}

/**
 * Mirrors the backend's rule: a target is accepted when it sits on the same
 * host and scheme as the site URL, or when it matches an allow-list pattern.
 */
export function isRedirectReturnAllowed(
  settings: AuthSettings | null,
  target: string,
): boolean {
  if (!settings) return false;

  try {
    const wanted = new URL(target);
    if (settings.site_url) {
      const site = new URL(settings.site_url);
      if (site.hostname === wanted.hostname && site.protocol === wanted.protocol) return true;
    }
  } catch {
    return false;
  }

  return (settings.uri_allow_list ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.includes("://"))
    .some((entry) => {
      try {
        return globToRegExp(entry).test(target);
      } catch {
        return false;
      }
    });
}
