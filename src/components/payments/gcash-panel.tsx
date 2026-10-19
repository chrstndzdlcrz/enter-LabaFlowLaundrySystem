import { useQuery } from "@tanstack/react-query";
import { QrCode, Smartphone } from "lucide-react";
import { fetchShopSettings, paymentChannelsOf } from "@/lib/api/settings";
import { formatCurrency } from "@/lib/format";

/**
 * How to pay by GCash for a specific amount.
 *
 * The QR is the shop's own GCash code, so the transfer lands in the seller's
 * account. A personal GCash QR does not carry an amount, so the amount due is
 * printed beside it and the payer enters it in GCash — with the order code as the
 * reference so staff can match the payment.
 */
export function GcashPanel({
  amountDue,
  orderCode,
}: {
  amountDue: number;
  orderCode?: string | null;
}) {
  const { data: settings } = useQuery({ queryKey: ["shop-settings"], queryFn: fetchShopSettings });

  if (!paymentChannelsOf(settings).includes("GCash")) return null;

  const qrUrl = settings?.gcash_qr_url?.trim();
  const gcashNumber = settings?.gcash_number?.trim() || settings?.phone?.trim() || "";
  const gcashName = settings?.gcash_name?.trim();

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center">
      {qrUrl ? (
        <img
          src={qrUrl}
          crossOrigin="anonymous"
          alt="The shop's GCash QR code"
          className="h-36 w-36 shrink-0 rounded-xl border border-border bg-card object-contain p-1"
        />
      ) : (
        <span className="flex h-36 w-36 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-2 text-center text-[11px] text-muted-foreground">
          <QrCode className="h-8 w-8 text-primary/50" aria-hidden="true" />
          The shop has not added its GCash QR yet
        </span>
      )}

      <div className="space-y-1.5">
        <p className="flex items-center gap-2 font-display font-semibold text-foreground">
          <Smartphone className="h-4 w-4 text-primary" aria-hidden="true" />
          Pay {formatCurrency(amountDue)} by GCash
        </p>
        {gcashNumber ? (
          <p className="text-sm text-muted-foreground">
            Send to <span className="font-medium text-foreground">{gcashNumber}</span>
            {gcashName ? ` — ${gcashName}` : ""}
          </p>
        ) : null}
        <p className="text-xs leading-relaxed text-muted-foreground">
          Scan the shop's GCash QR, enter <span className="font-medium text-foreground">{formatCurrency(amountDue)}</span>
          {orderCode ? (
            <>
              {" "}
              and put <span className="font-medium text-foreground">{orderCode}</span> in the message
            </>
          ) : null}
          , then send. Show the confirmation or reference number to the staff — the payment is recorded
          on your order once the shop confirms it.
        </p>
      </div>
    </div>
  );
}
