import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { QueryState } from "@/components/common/query-state";
import { listReceipts } from "@/lib/api/orders";
import { formatCurrency, formatDateTime } from "@/lib/format";

export default function ManageReceipts() {
  const receiptsQuery = useQuery({ queryKey: ["receipts"], queryFn: () => listReceipts() });
  const receipts = receiptsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Receipts issued"
        description="Every receipt the shop has issued, newest first. Open one to reprint it for a customer."
      />

      <QueryState
        isLoading={receiptsQuery.isLoading}
        error={receiptsQuery.error}
        isEmpty={receipts.length === 0}
        emptyIcon={ReceiptText}
        emptyTitle="No receipts issued yet"
        emptyDescription="A receipt is created automatically the first time a payment is recorded on an order."
      >
        <div className="grid gap-3">
          {receipts.map((receipt) => (
            <Card key={receipt.id} className="transition-shadow hover:shadow-elegant">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="space-y-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-display font-bold text-foreground">{receipt.receipt_no}</span>
                    <Badge
                      variant="outline"
                      className={
                        receipt.is_final
                          ? "rounded-full border-success/30 bg-success/10 text-success"
                          : "rounded-full border-warning/35 bg-warning/10 text-warning"
                      }
                    >
                      {receipt.is_final ? "Final" : "Partly paid"}
                    </Badge>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(receipt.issued_at)}
                    {receipt.channel ? ` · ${receipt.channel}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-display text-lg font-bold text-primary">
                    {formatCurrency(receipt.total)}
                  </span>
                  <Link
                    to={`/manage/receipts/${receipt.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Open
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </QueryState>
    </div>
  );
}
