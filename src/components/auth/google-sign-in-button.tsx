import { useCallback, useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  isRedirectReturnAllowed,
  loadAuthSettings,
  loadGoogleIdentity,
  type GoogleIdentity,
} from "@/lib/google-auth";

const PRIMARY = "hsl(191, 85%, 33%)";

/** Chrome mark for the Google identity button. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z"
      />
      <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a11.99 11.99 0 0 0 0 10.76l3.98-3.09z" />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.7 0 3.99 2.47 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

/**
 * "widget"          Google's own account chooser, on top of this page.
 * "redirect"        Full-page round-trip, used where the backend returns here.
 * "unavailable"     Neither route works from this address.
 */
type Mode = "checking" | "widget" | "redirect" | "unavailable";

export function GoogleSignInButton({
  label = "Continue with Google",
  onSignedIn,
}: {
  label?: string;
  onSignedIn?: () => void;
}) {
  const [mode, setMode] = useState<Mode>("checking");
  const [pending, setPending] = useState(false);
  const [buttonWidth, setButtonWidth] = useState(300);
  const holderRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const identityRef = useRef<GoogleIdentity | null>(null);
  const clientIdRef = useRef<string | null>(null);
  const redirectAllowedRef = useRef(false);
  const signedInRef = useRef(onSignedIn);
  signedInRef.current = onSignedIn;

  const finishWithCredential = useCallback(async (credential: string) => {
    setPending(true);
    const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token: credential });
    setPending(false);

    if (error) {
      console.error("Lab a Day: Google sign-in could not finish", error);
      await Swal.fire({
        icon: "warning",
        title: "Google could not finish the sign-in",
        text: "Your Google account was accepted, but the shop could not open the session. Please try again, or sign in with your email or number.",
        confirmButtonColor: PRIMARY,
      });
      return;
    }

    signedInRef.current?.();
  }, []);

  // Decide, once, which route this address can use.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const [identity, settings] = await Promise.all([loadGoogleIdentity(), loadAuthSettings()]);
      if (cancelled) return;

      const clientId = settings?.external_google_client_id ?? "";
      if (identity && settings?.external_google_enabled && clientId) {
        identityRef.current = identity;
        clientIdRef.current = clientId;
        setMode("widget");
        console.info("Lab a Day: Google sign-in runs in this page (no redirect)");
        return;
      }

      const target = `${window.location.origin}${import.meta.env.BASE_URL}`;
      redirectAllowedRef.current = isRedirectReturnAllowed(settings, target);
      setMode(redirectAllowedRef.current ? "redirect" : "unavailable");
      console.info(
        `Lab a Day: Google sign-in falls back to the redirect round-trip (${redirectAllowedRef.current ? "allowed" : "not allowed"} from ${window.location.origin})`,
      );
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Google sizes its button in whole pixels, so keep it inside the card.
  useEffect(() => {
    const measure = () => {
      const holder = measureRef.current;
      if (!holder) return;
      const available = Math.round(holder.clientWidth);
      setButtonWidth(Math.min(400, Math.max(240, available)));
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [mode]);

  useEffect(() => {
    const holder = holderRef.current;
    const identity = identityRef.current;
    const clientId = clientIdRef.current;
    if (mode !== "widget" || !holder || !identity || !clientId) return;

    holder.replaceChildren();
    identity.initialize({
      client_id: clientId,
      ux_mode: "popup",
      auto_select: false,
      cancel_on_tap_outside: true,
      callback: (response) => {
        if (response.credential) void finishWithCredential(response.credential);
      },
    });
    identity.renderButton(holder, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      logo_alignment: "left",
      width: buttonWidth,
    });

    // Google draws nothing when this origin is not authorised for the client,
    // which would leave a bare gap where the button should be, so fall back
    // rather than leave the visitor with no way to sign in.
    const guard = window.setTimeout(() => {
      if (holder.childElementCount === 0) {
        setMode(redirectAllowedRef.current ? "redirect" : "unavailable");
      }
    }, 2000);

    return () => window.clearTimeout(guard);
  }, [mode, buttonWidth, finishWithCredential]);

  const startRedirect = async () => {
    setPending(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}` },
      });
      if (error) throw error;
    } catch (error) {
      setPending(false);
      console.error("Lab a Day: Google sign-in could not start", error);
      await Swal.fire({
        icon: "info",
        title: "Google sign-in is not available right now",
        text: "You can still sign in with your email or number — everything else works normally.",
        confirmButtonText: "Use email or number",
        confirmButtonColor: PRIMARY,
      });
    }
  };

  const explainUnavailable = async () => {
    await Swal.fire({
      icon: "info",
      title: "Google sign-in is not set up for this address",
      html: `This site is being served from <b>${window.location.host}</b>, which is not yet one of the addresses allowed to sign in with Google for this shop.<br><br>Your email or number works normally on every address.`,
      confirmButtonText: "Use email or number",
      confirmButtonColor: PRIMARY,
    });
  };

  const handleClick = () => {
    if (mode === "redirect") return startRedirect();
    return explainUnavailable();
  };

  return (
    <div ref={measureRef} className="w-full">
      <div ref={holderRef} className="flex w-full justify-center" />
      {mode === "widget" ? null : (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleClick}
          disabled={pending || mode === "checking"}
        >
          <GoogleMark />
          {mode === "checking" ? "Loading Google…" : pending ? "Opening Google…" : label}
        </Button>
      )}
    </div>
  );
}
