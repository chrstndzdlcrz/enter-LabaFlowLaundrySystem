import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { getReceiptForOrder, recordPayment } from "@/lib/api/orders";
import { fetchShopSettings, paymentChannelsOf } from "@/lib/api/settings";
import { GcashPanel } from "@/components/payments/gcash-panel";
import { alertError, errorMessageFrom, flashSuccess } from "@/lib/alerts";
import { formatCurrency } from "@/lib/format";

/**
 * Records a counter payment. The database applies it, issues or refreshes the
 * e-receipt, and completes the order once it is fully paid.
 */
export function PaymentDialog({
  orderId,
  orderCode,
  total,
  amountPaid,
  trigger,
}: {
  orderId: string;
  orderCode: string;
  total: number;
  amountPaid: number;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [channel, setChannel] = useState("Cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  const remaining = Math.max(Number(total) - Number(amountPaid), 0);

  const { data: settings } = useQuery({ queryKey: ["shop-settings"], queryFn: fetchShopSettings });
  const channels = paymentChannelsOf(settings);

  useEffect(() => {
    if (open) setAmount(remaining > 0 ? remaining.toFixed(2) : "");
  }, [open, remaining]);

  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = Number(amount);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error("Enter an amount greater than zero.");
      }
      if (parsed > remaining) {
        throw new Error(
          `That is more than the ${formatCurrency(remaining)} still due on this order. Adjust the amount or the discount first.`,
        );
      }
      if (channel !== "Cash" && reference.trim() === "") {
        throw new Error(`Add the ${channel} reference number so the payment can be traced.`);
      }

      await recordPayment({
        orderId,
        amount: parsed,
        channel,
        referenceNo: reference.trim() || null,
        notes: notes.trim() || null,
      });

      const receipt = await getReceiptForOrder(orderId);
      return receipt;
    },
    onSuccess: async (receipt) => {
      await queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      await queryClient.invalidateQueries({ queryKey: ["receipts"] });
      setOpen(false);
      setReference("");
      setNotes("");
      flashSuccess(
        receipt?.is_final
          ? `Paid — receipt ${receipt.receipt_no} issued`
          : `Payment recorded — receipt ${receipt?.receipt_no ?? ""} updated`,
      );
    },
    onError: async (error) => {
      await alertError("The payment could not be recorded", errorMessageFrom(error));
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button>Record payment</Button>}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Record payment for {orderCode}</DialogTitle>
          <DialogDescription>
            Total {formatCurrency(total)} · paid {formatCurrency(amountPaid)} ·{" "}
            <span className="font-semibold text-foreground">{formatCurrency(remaining)} still due</span>
          </DialogDescription>
        </DialogHeader>

        {remaining <= 0 ? (
          <p className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
            <ReceiptText className="h-4 w-4" aria-hidden="true" />
            This order is fully paid. Its e-receipt is available from the order page.
          </p>
        ) : null}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="payment-amount">Amount received</Label>
            <Input
              id="payment-amount"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              disabled={remaining <= 0}
            />
            <p className="text-xs text-muted-foreground">
              Partial payments are allowed; the receipt is marked final once the order is fully paid.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-channel">Payment channel</Label>
            <Select value={channel} onValueChange={setChannel} disabled={remaining <= 0}>
              <SelectTrigger id="payment-channel">
                <SelectValue placeholder="Choose a channel" />
              </SelectTrigger>
              <SelectContent>
                {channels.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {channel !== "Cash" ? (
            <div className="space-y-2">
              <Label htmlFor="payment-reference">{channel} reference number</Label>
              <Input
                id="payment-reference"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="e.g. GC-8842193"
                disabled={remaining <= 0}
              />
            </div>
          ) : null}

          {channel === "GCash" && remaining > 0 ? (
            <GcashPanel amountDue={remaining} orderCode={orderCode} />
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="payment-notes">Note (optional)</Label>
            <Textarea
              id="payment-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              placeholder="e.g. Paid at the counter by the customer's sister."
              disabled={remaining <= 0}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || remaining <= 0}
          >
            <Banknote className="mr-2 h-4 w-4" aria-hidden="true" />
            {mutation.isPending ? "Recording…" : "Record payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
