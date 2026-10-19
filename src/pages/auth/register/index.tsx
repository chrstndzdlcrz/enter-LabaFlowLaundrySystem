import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, UserPlus } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { AuthShell } from "@/components/auth/auth-shell";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { supabase } from "@/integrations/supabase/client";
import { EMAIL_PATTERN, PHONE_PATTERN } from "@/lib/constants";
import { errorMessageFrom } from "@/lib/alerts";

const schema = z
  .object({
    full_name: z.string().trim().min(2, "Enter your full name"),
    email: z
      .string()
      .trim()
      .min(1, "Email is required")
      .regex(EMAIL_PATTERN, "Enter a valid email address, like name@example.com"),
    phone: z
      .string()
      .trim()
      .min(1, "Mobile number is required")
      .refine((value) => PHONE_PATTERN.test(value), "Enter a valid mobile number, like 0917 123 4567"),
    password: z.string().min(8, "Use at least 8 characters"),
    confirm_password: z.string(),
  })
  .refine((values) => values.password === values.confirm_password, {
    path: ["confirm_password"],
    message: "The two passwords do not match",
  });

type FormValues = z.infer<typeof schema>;

const Register = () => {
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: "", email: "", phone: "", password: "", confirm_password: "" },
    mode: "onSubmit",
  });

  const onSubmit = async (values: FormValues) => {
    setFormError(null);

    const { data, error } = await supabase.auth.signUp({
      email: values.email.trim(),
      password: values.password,
      options: {
        // Keeps the trailing slash and follows the deployment base, so the
        // confirmation link returns to the deployed app.
        emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
        data: {
          full_name: values.full_name.trim(),
          phone: values.phone.trim() || null,
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
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email address</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" placeholder="name@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mobile number</FormLabel>
                <FormControl>
                  <Input inputMode="tel" autoComplete="tel" placeholder="0917 123 4567" {...field} />
                </FormControl>
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

      <GoogleSignInButton label="Continue with Google" />
    </AuthShell>
  );
};

export default Register;
