import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { errorMessageFrom } from "@/lib/alerts";
import { useState } from "react";
import Swal from "sweetalert2";

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

export function GoogleSignInButton({ label = "Continue with Google" }: { label?: string }) {
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    setPending(true);
    try {
      // Normal redirect flow: the trailing-slash origin is part of the exact
      // redirect contract, and Preview should follow the same redirect.
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/` },
      });
      if (error) throw error;
    } catch (error) {
      setPending(false);
      await Swal.fire({
        icon: "error",
        title: "Google sign-in could not start",
        text: errorMessageFrom(error, "Google sign-in is not available right now."),
        confirmButtonColor: "hsl(191, 85%, 33%)",
      });
    }
  };

  return (
    <Button type="button" variant="outline" className="w-full" onClick={handleClick} disabled={pending}>
      <GoogleMark />
      {pending ? "Opening Google…" : label}
    </Button>
  );
}
