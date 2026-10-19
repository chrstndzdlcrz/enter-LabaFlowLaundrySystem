import { useCallback, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, LogIn } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { AuthShell } from "@/components/auth/auth-shell";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { supabase } from "@/integrations/supabase/client";
import { signInWithPhone } from "@/lib/api/auth";
import { EMAIL_PATTERN, PHONE_PATTERN } from "@/lib/constants";
import { errorMessageFrom } from "@/lib/alerts";

/** One field, so the customer can use whichever they remember. */
const schema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Enter your email or number")
    .refine(
      (value) =>
        value.includes("@") ? EMAIL_PATTERN.test(value) : PHONE_PATTERN.test(value),
      "Enter a valid email address, or a valid number",
    ),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormValues = z.infer<typeof schema>;

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  /** Where the visitor was heading before the sign-in wall stopped them. */
  const from = (location.state as { from?: string } | null)?.from;
  const goAfterSignIn = useCallback(() => {
    navigate(from ?? "/dashboard", { replace: true });
  }, [from, navigate]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: "", password: "" },
    mode: "onSubmit",
  });

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    const identifier = values.identifier.trim();

    try {
      if (identifier.includes("@")) {
        const { error } = await supabase.auth.signInWithPassword({
          email: identifier,
          password: values.password,
        });
        if (error) throw error;
      } else {
        // A mobile number is resolved to its account on the backend.
        await signInWithPhone(identifier, values.password);
      }
    } catch (error) {
      // Entered values stay in the form so nothing has to be retyped.
      const message = errorMessageFrom(error);
      setFormError(
        /invalid|credential|not correct/i.test(message)
          ? "That email or number, or the password, is not correct."
          : message,
      );
      return;
    }

    goAfterSignIn();
  };

  return (
    <AuthShell
      title="Sign in to LabaFlow"
      subtitle="Track your laundry, message the shop and keep your receipts in one place."
      footer={
        <>
          New here?{" "}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {formError ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {formError}
          </p>
        ) : null}

        <Form {...form}>
          <FormField
            control={form.control}
            name="identifier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email or number</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="username"
                    inputMode="email"
                    placeholder="name@example.com or 0917 123 4567"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Use the same email or number you registered with.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="current-password" placeholder="Your password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </Form>

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />
          {form.formState.isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <GoogleSignInButton label="Sign in with Google" onSignedIn={goAfterSignIn} />
    </AuthShell>
  );
};

export default Login;
