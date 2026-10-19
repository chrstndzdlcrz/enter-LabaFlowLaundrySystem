import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, UserPlus } from "lucide-react";
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
import { EMAIL_PATTERN, PHONE_PATTERN } from "@/lib/constants";
import { errorMessageFrom } from "@/lib/alerts";

/**
 * One field decides what we ask next: an email address or a mobile number.
 *
 * The account itself is always an email address, because that is what the backend
 * authenticates; the mobile number is how the shop reaches the customer and how the
 * customer can sign in later. So whichever of the two the customer types first, we
 * ask for the other one.
 */
const schema = z
  .object({
    full_name: z.string().trim().min(2, "Enter your full name"),
    identifier: z.string().trim().min(1, "Enter your email or number"),
    secondary: z.string().trim(),
    password: z.string().min(8, "Use at least 8 characters"),
    confirm_password: z.string(),
  })
  .superRefine((values, ctx) => {
    const identifier = (values.identifier ?? "").trim();
    const secondary = (values.secondary ?? "").trim();
    const typedEmail = identifier.includes("@");

    if (typedEmail) {
      if (!EMAIL_PATTERN.test(identifier)) {
        ctx.addIssue({ path: ["identifier"], message: "Enter a valid email address" });
      }
      if (secondary === "") {
        ctx.addIssue({ path: ["secondary"], message: "Mobile number is required" });
      } else if (!PHONE_PATTERN.test(secondary)) {
        ctx.addIssue({ path: ["secondary"], message: "Enter a valid mobile number" });
      }
    } else {
      if (!PHONE_PATTERN.test(identifier)) {
        ctx.addIssue({ path: ["identifier"], message: "Enter a valid mobile number" });
      }
      if (secondary === "") {
        ctx.addIssue({ path: ["secondary"], message: "Email address is required" });
      } else if (!EMAIL_PATTERN.test(secondary)) {
        ctx.addIssue({ path: ["secondary"], message: "Enter a valid email address" });
      }
    }

    if (values.password !== values.confirm_password) {
      ctx.addIssue({ path: ["confirm_password"], message: "The two passwords do not match" });
    }
  });

type FormValues = z.infer<typeof schema>;

const Register = () => {
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: "",
      identifier: "",
      secondary: "",
      password: "",
      confirm_password: "",
    },
    mode: "onSubmit",
  });

  // Never assumed to be a string: during a hot reload the form can render once with
  // stale values, and an unguarded read would blank the page.
  const identifier = form.watch("identifier") ?? "";
  const typedEmail = identifier.includes("@");
  const typedNumber = identifier.trim() !== "" && !typedEmail;

  const onSubmit = async (values: FormValues) => {
    setFormError(null);

    const first = (values.identifier ?? "").trim();
    const second = (values.secondary ?? "").trim();
    const email = first.includes("@") ? first : second;
    const phone = first.includes("@") ? second : first;

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: values.password,
      options: {
        // Keeps the trailing slash and follows the deployment base, so the
        // confirmation link returns to the deployed app.
        emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
        data: {
          full_name: values.full_name.trim(),
          phone: phone.trim(),
        },
      },
    });

    if (error) {
      setFormError(
        error.message.toLowerCase().includes("already")
          ? "An account with that email already exists. Try signing in instead."
          : errorMessageFrom(error),
      );
      return;
    }

    if (!data.session) {
      setFormError(
        "Your account was created, but the shop requires email verification before the first sign-in.",
      );
      return;
    }

    navigate("/dashboard", { replace: true });
  };

  return (
    <AuthShell
      title="Create your LabaFlow account"
      subtitle="Pre-book a service, follow your order status and keep every receipt."
      footer={
        <>
          Already registered?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
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
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input autoComplete="name" placeholder="Juan Dela Cruz" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="identifier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email or number</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="username"
                    placeholder="name@example.com or 0917 123 4567"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Use either one — we will ask for the other so the shop can reach you and you can sign
                  in with whichever you remember.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {typedEmail || typedNumber ? (
            <FormField
              control={form.control}
              name="secondary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{typedEmail ? "Mobile number" : "Email address"}</FormLabel>
                  <FormControl>
                    {typedEmail ? (
                      <Input
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="0917 123 4567"
                        {...field}
                      />
                    ) : (
                      <Input
                        type="email"
                        autoComplete="email"
                        placeholder="name@example.com"
                        {...field}
                      />
                    )}
                  </FormControl>
                  <FormDescription>
                    {typedEmail
                      ? "The number the shop will call or text about your orders."
                      : "Your email address — it is the login for your account."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="new-password" placeholder="At least 8 characters" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirm_password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm password</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="new-password" placeholder="Type it again" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </Form>

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
          {form.formState.isSubmitting ? "Creating your account…" : "Create account"}
        </Button>
      </form>

      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <GoogleSignInButton
        label="Continue with Google"
        onSignedIn={() => navigate("/dashboard", { replace: true })}
      />
    </AuthShell>
  );
};

export default Register;
