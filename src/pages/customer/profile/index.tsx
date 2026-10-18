import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { LogOut, Save, UserX } from "lucide-react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/common/page-header";
import { useAuth } from "@/hooks/use-auth";
import { deactivateMyAccount, updateMyProfile } from "@/lib/api/profiles";
import { PHONE_PATTERN, ROLE_LABELS } from "@/lib/constants";
import { alertError, alertSuccess, confirmAction, errorMessageFrom, flashSuccess } from "@/lib/alerts";

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name"),
  phone: z
    .string()
    .trim()
    .refine((value) => value === "" || PHONE_PATTERN.test(value), "Enter a valid mobile number"),
  address: z.string().trim(),
  avatar_url: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^https?:\/\//i.test(value),
      "Enter a full image link starting with http:// or https://",
    ),
});

type FormValues = z.infer<typeof schema>;

export default function CustomerProfile() {
  const { profile, role, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: "", phone: "", address: "", avatar_url: "" },
  });

  // Keep the form in step with the loaded profile.
  useEffect(() => {
    if (!profile) return;
    form.reset({
      full_name: profile.full_name ?? "",
      phone: profile.phone ?? "",
      address: profile.address ?? "",
      avatar_url: profile.avatar_url ?? "",
    });
  }, [profile, form]);

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) =>
      updateMyProfile({
        full_name: values.full_name.trim(),
        phone: values.phone.trim() || null,
        address: values.address.trim() || null,
        avatar_url: values.avatar_url.trim() || null,
      }),
    onSuccess: async () => {
      await refreshProfile();
      flashSuccess("Your profile has been saved");
    },
    onError: async (error) => {
      await alertError("Your profile could not be saved", errorMessageFrom(error));
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      const confirmed = await confirmAction({
        title: "Switch off your account?",
        text: "You will be signed out and will not be able to sign in again until a shop administrator switches the account back on. Your order history and receipts are kept.",
        confirmLabel: "Switch off my account",
        danger: true,
      });
      if (!confirmed) return false;
      await deactivateMyAccount();
      return true;
    },
    onSuccess: async (done) => {
      if (!done) return;
      await signOut();
      await alertSuccess("Your account is switched off", "Contact the shop if you want it switched back on.");
      navigate("/");
    },
    onError: async (error) => {
      await alertError("The account could not be switched off", errorMessageFrom(error));
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My profile"
        description="Keep your contact details current — staff use them when something about an order needs confirming."
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Contact details</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={form.handleSubmit((values) => {
                setFormError(null);
                saveMutation.mutate(values);
              })}
              className="space-y-4"
              noValidate
            >
              {formError ? (
                <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {formError}
                </p>
              ) : null}

              {form.watch("avatar_url") ? (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 p-3">
                  <img
                    src={form.watch("avatar_url")}
                    crossOrigin="anonymous"
                    alt="Your profile photo"
                    className="h-14 w-14 rounded-full border border-border object-cover"
                  />
                  <p className="text-xs text-muted-foreground">
                    This is the photo shown on your account. If you signed in with Google, it was taken
                    from your Google profile automatically.
                  </p>
                </div>
              ) : null}

              <Form {...form}>
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full name</FormLabel>
                      <FormControl>
                        <Input autoComplete="name" {...field} />
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
                        <Input inputMode="tel" autoComplete="tel" placeholder="+63 917 000 0000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input autoComplete="street-address" placeholder="Purok 2, Lab-a-Day" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="avatar_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profile photo link (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://…" {...field} />
                      </FormControl>
                      <FormDescription>
                        Paste a public image link. Profile photos are stored as links, not uploaded files.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Form>

              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={saveMutation.isPending}>
                  <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                  {saveMutation.isPending ? "Saving…" : "Save changes"}
                </Button>
                <Button type="button" variant="outline" onClick={() => form.reset()}>
                  Reset form
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium text-foreground">{profile?.email ?? "—"}</span>
              </p>
              <p className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Role</span>
                <Badge variant="outline" className="rounded-full">
                  {role ? ROLE_LABELS[role] : "—"}
                </Badge>
              </p>
              <p className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Status</span>
                <Badge
                  variant="outline"
                  className={
                    profile?.is_active
                      ? "rounded-full border-success/30 bg-success/10 text-success"
                      : "rounded-full border-warning/35 bg-warning/10 text-warning"
                  }
                >
                  {profile?.is_active ? "Active" : "Switched off"}
                </Badge>
              </p>
              <Button variant="outline" className="w-full" onClick={() => void signOut().then(() => navigate("/"))}>
                <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                Sign out
              </Button>
            </CardContent>
          </Card>

          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="font-display text-base text-destructive">Switch off my account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This signs you out and blocks sign-in until a shop administrator switches the account back on.
                Your orders and receipts stay on record.
              </p>
              <Button
                variant="destructive"
                onClick={() => deactivateMutation.mutate()}
                disabled={deactivateMutation.isPending}
              >
                <UserX className="mr-2 h-4 w-4" aria-hidden="true" />
                {deactivateMutation.isPending ? "Switching off…" : "Switch off my account"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
