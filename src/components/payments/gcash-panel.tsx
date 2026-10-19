import { useQuery } from "@tanstack/react-query";
import { QrCode, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { fetchShopSettings, paymentChannelsOf } from "@/lib/api/settings";
import { canBuildAmountQr, payloadForAmount } from "@/lib/qrph";
import { formatCurrency } from "@/lib/format";

/**
 * How to pay by GCash for a specific amount.
 *
 * When the shop has saved its own QR payload, the QR below is built from that
 * payload with this order's amount already set — the customer scans it and only has
 * to confirm. Otherwise the shop's plain QR image is shown with the amount beside
 * it, for the customer to type in GCash.
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
  const payload = settings?.gcash_qr_payload ?? "";
  const amountReady = canBuildAmountQr(payload);
  const gcashNumber = settings?.gcash_number?.trim() || settings?.phone?.trim() || "";
  const gcashName = settings?.gcash_name?.trim();

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center">
      {amountReady ? (
        <span className="flex h-40 w-40 shrink-0 items-center justify-center rounded-xl border border-border bg-card p-2">
          <QRCodeSVG
            value={payloadForAmount(payload, amountDue)}
            size={144}
            level="M"
            marginSize={1}
            title={`GCash payment for ${formatCurrency(amountDue)}`}
          />
        </span>
      ) : qrUrl ? (
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
        {amountReady ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Scan this code with GCash. The amount{" "}
            <span className="font-medium text-foreground">{formatCurrency(amountDue)}</span> and the shop
            account are already set — check them and confirm.
            {orderCode ? (
              <>
                {" "}
                Put <span className="font-medium text-foreground">{orderCode}</span> in the message so the
                payment can be matched to your order.
              </>
            ) : null}
          </p>
        ) : (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Scan the shop's GCash QR, enter{" "}
            <span className="font-medium text-foreground">{formatCurrency(amountDue)}</span>
            {orderCode ? (
              <>
                {" "}
                and put <span className="font-medium text-foreground">{orderCode}</span> in the message
              </>
            ) : null}
            , then send. Show the confirmation or reference number to the staff — the payment is recorded
            on your order once the shop confirms it.
          </p>
        )}
      </div>
    </div>
  );
}
