import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Plus, ShieldCheck, UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToneBadge } from "@/components/common/status-badge";
import { PageHeader } from "@/components/common/page-header";
import { QueryState } from "@/components/common/query-state";
import { useAuth } from "@/hooks/use-auth";
import { createStaffAccount, listProfiles, setProfileActive, setUserRole } from "@/lib/api/profiles";
import { ROLE_LABELS, type UserRole } from "@/lib/constants";
import { alertError, alertInfo, confirmAction, errorMessageFrom, flashSuccess } from "@/lib/alerts";

function CreateStaffDialog() {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"staff" | "admin">("staff");
  const [formError, setFormError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (fullName.trim().length < 2) throw new Error("Enter the staff member's full name.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        throw new Error("Enter a valid email address for the staff member.");
      }
      return createStaffAccount({
        email: email.trim(),
        full_name: fullName.trim(),
        phone: phone.trim(),
        role,
      });
    },
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["profiles"] });
      setOpen(false);
      setFullName("");
      setEmail("");
      setPhone("");
      await alertInfo(
        "Staff account created",
        `Share these details with ${created.email}: temporary password ${created.temporary_password}. They can change it after signing in. The account was created on the backend, so the password is shown only once here.`,
      );
    },
    onError: (error) => setFormError(errorMessageFrom(error)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Add staff account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">New staff account</DialogTitle>
          <DialogDescription>
            The account is created on the backend with a generated temporary password — it is never chosen in
            the browser.
          </DialogDescription>
        </DialogHeader>

        {formError ? (
          <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        ) : null}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="staff-name">Full name</Label>
            <Input id="staff-name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-email">Email address</Label>
            <Input
              id="staff-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="staff@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-phone">Mobile number (optional)</Label>
            <Input id="staff-phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-role">Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as "staff" | "admin")}>
              <SelectTrigger id="staff-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff / Seller — counter work</SelectItem>
                <SelectItem value="admin">Admin / Owner — full access</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Creating…" : "Create account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ManageStaff() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const profilesQuery = useQuery({ queryKey: ["profiles"], queryFn: listProfiles });
  const profiles = profilesQuery.data ?? [];

  const changeRole = useMutation({
    mutationFn: async ({ id, role, name }: { id: string; role: UserRole; name: string }) => {
      const confirmed = await confirmAction({
        title: `Change ${name}'s role to ${ROLE_LABELS[role]}?`,
        text:
          role === "admin"
            ? "Administrators can manage staff, prices, reports and shop settings."
            : "Their access changes immediately. Staff cannot manage staff, prices or reports.",
        confirmLabel: "Change role",
        danger: role !== "admin",
      });
      if (!confirmed) return false;
      await setUserRole(id, role);
      return true;
    },
    onSuccess: async (done) => {
      if (!done) return;
      await queryClient.invalidateQueries({ queryKey: ["profiles"] });
      flashSuccess("Role updated");
    },
    onError: async (error) => alertError("The role could not be changed", errorMessageFrom(error)),
  });

  const changeActive = useMutation({
    mutationFn: async ({ id, isActive, name }: { id: string; isActive: boolean; name: string }) => {
      if (!isActive) {
        const confirmed = await confirmAction({
          title: `Switch off ${name}'s account?`,
          text: "They will be signed out and blocked from signing in until the account is switched back on.",
          confirmLabel: "Switch off account",
          danger: true,
        });
        if (!confirmed) return false;
      }
      await setProfileActive(id, isActive);
      return true;
    },
    onSuccess: async (done) => {
      if (!done) return;
      await queryClient.invalidateQueries({ queryKey: ["profiles"] });
      flashSuccess("Account status updated");
    },
    onError: async (error) => alertError("The account could not be updated", errorMessageFrom(error)),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff & roles"
        description="Who can work the counter, and who can manage the shop. Role changes are enforced by the backend."
        actions={<CreateStaffDialog />}
      />

      <Card className="border-info/30 bg-info/5">
        <CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
          <span>
            Staff can process orders, record payments and answer customers, but cannot manage staff, change
            prices, or read sales reports. Nobody can promote themselves — the backend refuses it.
          </span>
        </CardContent>
      </Card>

      <QueryState isLoading={profilesQuery.isLoading} error={profilesQuery.error}>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/60">
                <TableHead>Account</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => {
                const isSelf = profile.id === user?.id;
                const name = profile.full_name ?? profile.email ?? "Account";
                return (
                  <TableRow key={profile.id}>
                    <TableCell>
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">{name}</span>
                        {isSelf ? <ToneBadge tone="info">You</ToneBadge> : null}
                        {profile.is_demo ? <ToneBadge tone="warning">Demo</ToneBadge> : null}
                      </span>
                      <span className="block text-xs text-muted-foreground">{profile.email ?? "—"}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{profile.phone ?? "—"}</TableCell>
                    <TableCell>
                      <Select
                        value={profile.role}
                        onValueChange={(value) =>
                          changeRole.mutate({ id: profile.id, role: value as UserRole, name })
                        }
                        disabled={isSelf}
                      >
                        <SelectTrigger className="w-44" aria-label={`Role for ${name}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="customer">{ROLE_LABELS.customer}</SelectItem>
                          <SelectItem value="staff">{ROLE_LABELS.staff}</SelectItem>
                          <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
                        </SelectContent>
                      </Select>
                      {isSelf ? (
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          You cannot change your own role.
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {profile.is_active ? (
                        <ToneBadge tone="success">Active</ToneBadge>
                      ) : (
                        <ToneBadge tone="danger">Switched off</ToneBadge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={profile.is_active}
                        disabled={isSelf}
                        onCheckedChange={(checked) =>
                          changeActive.mutate({ id: profile.id, isActive: checked, name })
                        }
                        aria-label={`Activate ${name}`}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </QueryState>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <UserCog className="h-3.5 w-3.5" aria-hidden="true" />
        Demo accounts created during setup are marked “Demo”. Switch them off once real accounts are in place.
      </p>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
        <span>
          {profiles.filter((profile) => profile.role === "admin").length} administrator
          {profiles.filter((profile) => profile.role === "admin").length === 1 ? "" : "s"} ·{" "}
          {profiles.filter((profile) => profile.role === "staff").length} staff account
          {profiles.filter((profile) => profile.role === "staff").length === 1 ? "" : "s"}
        </span>
      </p>
      <Badge variant="outline" className="rounded-full text-[11px]">
        Accounts created here can sign in immediately — email confirmation is not required for setup.
      </Badge>
    </div>
  );
}
