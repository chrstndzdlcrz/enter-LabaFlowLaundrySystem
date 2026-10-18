import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Cpu, Info, Link2, Plus, Radio, Unlink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToneBadge } from "@/components/common/status-badge";
import { PageHeader } from "@/components/common/page-header";
import { QueryState } from "@/components/common/query-state";
import { SUPABASE_URL } from "@/integrations/supabase/client";
import {
  assignRfidTag,
  createRfidDevice,
  detachRfidTag,
  listRfidDevices,
  listRfidEvents,
  listRfidTags,
  setRfidDeviceActive,
  setRfidTagActive,
} from "@/lib/api/rfid";
import { listOrders } from "@/lib/api/orders";
import { useAuth } from "@/hooks/use-auth";
import { alertError, confirmAction, errorMessageFrom, flashSuccess } from "@/lib/alerts";
import { formatDateTime, formatRelative } from "@/lib/format";

const RESULT_TONES: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  ok: "success",
  unknown_tag: "warning",
  inactive_tag: "warning",
  inactive_order: "warning",
  invalid_transition: "danger",
  unauthorized: "danger",
  error: "danger",
};

export default function ManageRfid() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [deviceLabel, setDeviceLabel] = useState("");
  const [deviceLocation, setDeviceLocation] = useState("");
  const [tagUid, setTagUid] = useState("");
  const [tagOrderId, setTagOrderId] = useState("");
  const [tagLabel, setTagLabel] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const devicesQuery = useQuery({ queryKey: ["rfid-devices"], queryFn: listRfidDevices });
  const tagsQuery = useQuery({ queryKey: ["rfid-tags"], queryFn: listRfidTags });
  const eventsQuery = useQuery({ queryKey: ["rfid-events"], queryFn: () => listRfidEvents(50) });
  const ordersQuery = useQuery({ queryKey: ["orders", "manage"], queryFn: () => listOrders({ limit: 100 }) });

  const devices = devicesQuery.data ?? [];
  const tags = tagsQuery.data ?? [];
  const events = eventsQuery.data ?? [];
  const activeOrders = (ordersQuery.data ?? []).filter(
    (order) => !["completed", "cancelled"].includes(order.status),
  );

  const endpoint = `${SUPABASE_URL}/functions/v1/rfid-scan`;
  const lastSeen = devices
    .map((device) => device.last_seen_at)
    .filter((value): value is string => Boolean(value))
    .sort()
    .pop();

  const addDevice = useMutation({
    mutationFn: async () => {
      if (deviceLabel.trim().length < 2) throw new Error("Give the reader a name, like “Counter reader”.");
      return createRfidDevice({ label: deviceLabel.trim(), location: deviceLocation.trim() || null });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rfid-devices"] });
      setDeviceLabel("");
      setDeviceLocation("");
      setFormError(null);
      flashSuccess("Reader registered");
    },
    onError: (error) => setFormError(errorMessageFrom(error)),
  });

  const toggleDevice = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => setRfidDeviceActive(id, isActive),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rfid-devices"] });
      flashSuccess("Reader status updated");
    },
    onError: async (error) => alertError("The reader could not be updated", errorMessageFrom(error)),
  });

  const linkTag = useMutation({
    mutationFn: async () => {
      if (tagUid.trim().length < 4) throw new Error("Enter the tag UID exactly as the reader reports it.");
      if (!tagOrderId) throw new Error("Choose the order this tag belongs to.");
      return assignRfidTag({ tagUid: tagUid.trim(), orderId: tagOrderId, label: tagLabel.trim() || null });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rfid-tags"] });
      setTagUid("");
      setTagLabel("");
      setFormError(null);
      flashSuccess("Tag linked to the order");
    },
    onError: (error) => setFormError(errorMessageFrom(error)),
  });

  const toggleTag = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => setRfidTagActive(id, isActive),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rfid-tags"] });
      flashSuccess("Tag status updated");
    },
    onError: async (error) => alertError("The tag could not be updated", errorMessageFrom(error)),
  });

  const detach = useMutation({
    mutationFn: async (id: string) => {
      const confirmed = await confirmAction({
        title: "Unlink this tag from the order?",
        text: "Scans of this tag will be reported as unassigned until it is linked again.",
        confirmLabel: "Unlink tag",
        danger: true,
      });
      if (!confirmed) return false;
      await detachRfidTag(id);
      return true;
    },
    onSuccess: async (done) => {
      if (!done) return;
      await queryClient.invalidateQueries({ queryKey: ["rfid-tags"] });
      flashSuccess("Tag unlinked");
    },
    onError: async (error) => alertError("The tag could not be unlinked", errorMessageFrom(error)),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="RFID readers"
        description="The API boundary for the counter reader. LabaFlow records real scans — it never invents them."
        actions={
          lastSeen ? (
            <Badge variant="outline" className="rounded-full border-success/30 bg-success/10 text-success">
              Last device check-in {formatRelative(lastSeen)}
            </Badge>
          ) : (
            <Badge variant="outline" className="rounded-full border-warning/35 bg-warning/10 text-warning">
              No reader has checked in yet
            </Badge>
          )
        }
      />

      <Card className="border-info/30 bg-info/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-base text-info">
            <Info className="h-4 w-4" aria-hidden="true" />
            How the hardware connects
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            The proposed reader is an ESP32 with an RC522 RFID module, an OLED status display, an LED and a
            buzzer. It posts each scan to the endpoint below and displays whatever comes back.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-lg border border-border bg-card px-3 py-1.5 font-mono text-xs text-foreground">
              POST {endpoint}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void navigator.clipboard?.writeText(endpoint);
                flashSuccess("Endpoint copied");
              }}
            >
              <Copy className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              Copy
            </Button>
          </div>
          <p>
            The reader authenticates with an <code className="font-mono text-xs">x-device-key</code> header whose
            value is stored as the shop's own secret on the backend. It is never shipped inside this web app.
            Register the reader below first, otherwise the endpoint answers{" "}
            <code className="font-mono text-xs">device_not_registered</code>.
          </p>
          <p className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-warning">
            Hardware is not connected. Until an ESP32 actually runs and checks in, staff should keep updating
            statuses from the order screens — those updates stay fully available.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Radio className="h-4 w-4 text-primary" aria-hidden="true" />
              Registered readers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <QueryState
              isLoading={devicesQuery.isLoading}
              error={devicesQuery.error}
              isEmpty={devices.length === 0}
              emptyIcon={Cpu}
              emptyTitle="No readers registered"
              emptyDescription="Register the counter reader so its scans are accepted."
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reader</TableHead>
                    <TableHead>Last check-in</TableHead>
                    <TableHead>Last result</TableHead>
                    <TableHead className="text-right">Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell>
                        <span className="block font-medium text-foreground">{device.label}</span>
                        <span className="block text-xs text-muted-foreground">{device.location ?? "—"}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {device.last_seen_at ? formatDateTime(device.last_seen_at) : "Never"}
                      </TableCell>
                      <TableCell>
                        {device.last_result ? (
                          <ToneBadge tone={RESULT_TONES[device.last_result] ?? "neutral"}>
                            {device.last_result.replace(/_/g, " ")}
                          </ToneBadge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Switch
                          checked={device.is_active}
                          disabled={!isAdmin}
                          onCheckedChange={(checked) => toggleDevice.mutate({ id: device.id, isActive: checked })}
                          aria-label={`Activate ${device.label}`}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </QueryState>

            {isAdmin ? (
              <div className="space-y-3 rounded-xl border border-border p-4">
                <p className="font-display text-sm font-semibold text-foreground">Register a reader</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="device-label">Reader name</Label>
                    <Input
                      id="device-label"
                      value={deviceLabel}
                      onChange={(event) => setDeviceLabel(event.target.value)}
                      placeholder="Counter reader"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="device-location">Location (optional)</Label>
                    <Input
                      id="device-location"
                      value={deviceLocation}
                      onChange={(event) => setDeviceLocation(event.target.value)}
                      placeholder="Front counter"
                    />
                  </div>
                </div>
                {formError ? <p className="text-xs text-destructive">{formError}</p> : null}
                <Button onClick={() => addDevice.mutate()} disabled={addDevice.isPending}>
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  {addDevice.isPending ? "Registering…" : "Register reader"}
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Only the shop owner can register or deactivate readers.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Link2 className="h-4 w-4 text-primary" aria-hidden="true" />
              Tags linked to orders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tag-uid">Tag UID</Label>
                  <Input
                    id="tag-uid"
                    value={tagUid}
                    onChange={(event) => setTagUid(event.target.value.toUpperCase())}
                    placeholder="A1B2C3D4"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tag-label">Label (optional)</Label>
                  <Input
                    id="tag-label"
                    value={tagLabel}
                    onChange={(event) => setTagLabel(event.target.value)}
                    placeholder="Blue basket 3"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tag-order">Order</Label>
                <Select value={tagOrderId} onValueChange={setTagOrderId}>
                  <SelectTrigger id="tag-order">
                    <SelectValue placeholder="Choose an active order" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeOrders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.order_code} · {order.customer_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formError ? <p className="text-xs text-destructive">{formError}</p> : null}
              <Button onClick={() => linkTag.mutate()} disabled={linkTag.isPending || activeOrders.length === 0}>
                <Link2 className="mr-2 h-4 w-4" aria-hidden="true" />
                {linkTag.isPending ? "Linking…" : "Link tag to order"}
              </Button>
              {activeOrders.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  There are no active orders to link a tag to right now.
                </p>
              ) : null}
            </div>

            <QueryState
              isLoading={tagsQuery.isLoading}
              error={tagsQuery.error}
              isEmpty={tags.length === 0}
              emptyTitle="No tags linked"
              emptyDescription="Link a physical tag to an order so the reader can move that order along."
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tag</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tags.map((tag) => (
                    <TableRow key={tag.id}>
                      <TableCell>
                        <span className="block font-mono text-sm text-foreground">{tag.tag_uid}</span>
                        <span className="block text-xs text-muted-foreground">{tag.label ?? "—"}</span>
                      </TableCell>
                      <TableCell>
                        {tag.orders ? (
                          <span className="block text-sm text-foreground">
                            {tag.orders.order_code}
                            <span className="block text-xs text-muted-foreground">
                              {tag.orders.customer_name} · {tag.orders.status.replace(/_/g, " ")}
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Switch
                            checked={tag.is_active}
                            onCheckedChange={(checked) => toggleTag.mutate({ id: tag.id, isActive: checked })}
                            aria-label={`Activate tag ${tag.tag_uid}`}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => detach.mutate(tag.id)}
                          >
                            <Unlink className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only">Unlink tag</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </QueryState>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Scan log</CardTitle>
        </CardHeader>
        <CardContent>
          <QueryState
            isLoading={eventsQuery.isLoading}
            error={eventsQuery.error}
            isEmpty={events.length === 0}
            emptyTitle="No scans received"
            emptyDescription="Every accepted or rejected scan is logged here with its reason, including unregistered devices."
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Reader</TableHead>
                    <TableHead>Tag</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead className="hidden lg:table-cell">Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(event.created_at)}
                      </TableCell>
                      <TableCell className="text-sm text-foreground">
                        {event.rfid_devices?.label ?? "Unknown device"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {event.tag_uid ?? "—"}
                      </TableCell>
                      <TableCell>
                        <ToneBadge tone={RESULT_TONES[event.result] ?? "neutral"}>
                          {event.result.replace(/_/g, " ")}
                        </ToneBadge>
                      </TableCell>
                      <TableCell className="hidden max-w-[360px] lg:table-cell">
                        <span className="block truncate text-xs text-muted-foreground">
                          {event.detail ?? "—"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </QueryState>
        </CardContent>
      </Card>
    </div>
  );
}
