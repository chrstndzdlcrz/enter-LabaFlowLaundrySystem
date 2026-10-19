import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToneBadge } from "@/components/common/status-badge";
import { PageHeader } from "@/components/common/page-header";
import { QueryState } from "@/components/common/query-state";
import { fetchShopSettings, paymentChannelsOf, updateShopSettings } from "@/lib/api/settings";
import { CONSUMPTION_STAGES } from "@/lib/constants";
import { alertError, confirmAction, errorMessageFrom, flashSuccess } from "@/lib/alerts";

const CURRENCIES = ["PHP", "USD", "SGD", "AED"];

export default function ManageSettings() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({ queryKey: ["shop-settings"], queryFn: fetchShopSettings });

  const [form, setForm] = useState({
    shop_name: "",
    tagline: "",
    address: "",
    phone: "",
    email: "",
    currency: "PHP",
    receipt_footer: "",
    consumption_stage: "in_progress",
    default_low_stock_threshold: "5",
    gcash_qr_url: "",
    gcash_name: "",
    gcash_number: "",
  });
  const [channels, setChannels] = useState<string[]>([]);
  const [newChannel, setNewChannel] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!settingsQuery.data) return;
    const settings = settingsQuery.data;
    setForm({
      shop_name: settings.shop_name,
      tagline: settings.tagline ?? "",
      address: settings.address ?? "",
      phone: settings.phone ?? "",
      email: settings.email ?? "",
      currency: settings.currency,
      receipt_footer: settings.receipt_footer ?? "",
      consumption_stage: settings.consumption_stage,
      default_low_stock_threshold: String(settings.default_low_stock_threshold),
      gcash_qr_url: settings.gcash_qr_url ?? "",
      gcash_name: settings.gcash_name ?? "",
      gcash_number: settings.gcash_number ?? settings.phone ?? "",
    });
    setChannels(paymentChannelsOf(settings));
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (form.shop_name.trim().length < 2) throw new Error("Enter the shop name customers will see.");
      const threshold = Number(form.default_low_stock_threshold);
      if (!Number.isFinite(threshold) || threshold < 0) {
        throw new Error("Enter a default reorder level of zero or more.");
      }
      if (channels.length === 0) {
        throw new Error("Keep at least one payment channel so staff can record payments.");
      }

      return updateShopSettings({
        shop_name: form.shop_name.trim(),
        tagline: form.tagline.trim() || null,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        currency: form.currency,
        receipt_footer: form.receipt_footer.trim() || null,
        consumption_stage: form.consumption_stage,
        default_low_stock_threshold: threshold,
        payment_channels: channels as never,
        gcash_qr_url: form.gcash_qr_url.trim() || null,
        gcash_name: form.gcash_name.trim() || null,
        gcash_number: form.gcash_number.trim() || null,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["shop-settings"] });
      flashSuccess("Shop settings saved");
    },
    onError: async (error) => {
      setFormError(errorMessageFrom(error));
      await alertError("The settings could not be saved", errorMessageFrom(error));
    },
  });

  const addChannel = () => {
    const value = newChannel.trim();
    if (value === "") return;
    if (channels.some((channel) => channel.toLowerCase() === value.toLowerCase())) {
      setNewChannel("");
      return;
    }
    setChannels([...channels, value]);
    setNewChannel("");
  };

  const removeChannel = async (channel: string) => {
    const confirmed = await confirmAction({
      title: `Remove ${channel} as a payment channel?`,
      text: "Staff will no longer be able to record payments through this channel. Existing payments are unaffected.",
      confirmLabel: "Remove channel",
      danger: true,
    });
    if (!confirmed) return;
    setChannels(channels.filter((item) => item !== channel));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shop settings"
        description="Shop details shown on the site and receipts, plus how LabaFlow handles stock and payments."
        actions={
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="mr-2 h-4 w-4" aria-hidden="true" />
            {saveMutation.isPending ? "Saving…" : "Save settings"}
          </Button>
        }
      />

      {formError ? (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      <QueryState isLoading={settingsQuery.isLoading} error={settingsQuery.error}>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Shop details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="settings-name">Shop name</Label>
                <Input
                  id="settings-name"
                  value={form.shop_name}
                  onChange={(event) => setForm({ ...form, shop_name: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-tagline">Tagline</Label>
                <Input
                  id="settings-tagline"
                  value={form.tagline}
                  onChange={(event) => setForm({ ...form, tagline: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-address">Address</Label>
                <Input
                  id="settings-address"
                  value={form.address}
                  onChange={(event) => setForm({ ...form, address: event.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="settings-phone">Phone</Label>
                  <Input
                    id="settings-phone"
                    value={form.phone}
                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-email">Email</Label>
                  <Input
                    id="settings-email"
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-currency">Currency</Label>
                <Select
                  value={form.currency}
                  onValueChange={(value) => setForm({ ...form, currency: value })}
                >
                  <SelectTrigger id="settings-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-footer">Receipt footer</Label>
                <Textarea
                  id="settings-footer"
                  value={form.receipt_footer}
                  onChange={(event) => setForm({ ...form, receipt_footer: event.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">Stock rules</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="settings-stage">Deduct supplies when</Label>
                  <Select
                    value={form.consumption_stage}
                    onValueChange={(value) => setForm({ ...form, consumption_stage: value })}
                  >
                    <SelectTrigger id="settings-stage">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONSUMPTION_STAGES.map((stage) => (
                        <SelectItem key={stage.value} value={stage.value}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Consumption uses the rules on the Services page. Orders only deduct once; changing this stage
                    affects orders that have not reached it yet.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-threshold">Default reorder level for new supplies</Label>
                  <Input
                    id="settings-threshold"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={form.default_low_stock_threshold}
                    onChange={(event) =>
                      setForm({ ...form, default_low_stock_threshold: event.target.value })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">GCash payments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Customers and staff see this when a payment is due: the amount to send, and your own
                  GCash QR. Because it is your QR, the money goes straight to your account.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="settings-gcash-qr">Your GCash QR image link</Label>
                  <Input
                    id="settings-gcash-qr"
                    value={form.gcash_qr_url}
                    onChange={(event) => setForm({ ...form, gcash_qr_url: event.target.value })}
                    placeholder="https://…"
                  />
                  <p className="text-xs text-muted-foreground">
                    Open GCash → your QR code → save or screenshot it, then paste a public link to that
                    image here. Leave it empty and the app will ask customers to pay at the counter.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="settings-gcash-name">GCash account name</Label>
                    <Input
                      id="settings-gcash-name"
                      value={form.gcash_name}
                      onChange={(event) => setForm({ ...form, gcash_name: event.target.value })}
                      placeholder="Lab-a-Day Laundry Shop"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settings-gcash-number">GCash number to send to</Label>
                    <Input
                      id="settings-gcash-number"
                      value={form.gcash_number}
                      onChange={(event) => setForm({ ...form, gcash_number: event.target.value })}
                      placeholder="09611308218"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">Payment channels</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {channels.map((channel) => (
                    <span
                      key={channel}
                      className="flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-sm text-foreground"
                    >
                      {channel}
                      <button
                        type="button"
                        onClick={() => void removeChannel(channel)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`Remove ${channel}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[200px] flex-1 space-y-2">
                    <Label htmlFor="settings-channel">Add a channel</Label>
                    <Input
                      id="settings-channel"
                      value={newChannel}
                      onChange={(event) => setNewChannel(event.target.value)}
                      placeholder="e.g. Maya, bank transfer"
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addChannel();
                        }
                      }}
                    />
                  </div>
                  <Button type="button" variant="outline" onClick={addChannel}>
                    <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                    Add
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Channels are how payments are recorded at the counter. Cash and GCash are enabled by default.
                  LabaFlow does not process payments — it records what the counter collected.
                </p>
                <ToneBadge tone="info">Save the settings to apply channel changes</ToneBadge>
              </CardContent>
            </Card>
          </div>
        </div>
      </QueryState>
    </div>
  );
}
