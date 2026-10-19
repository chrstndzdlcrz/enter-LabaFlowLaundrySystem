import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlaceholderBadge, ToneBadge } from "@/components/common/status-badge";
import { PageHeader } from "@/components/common/page-header";
import { QueryState } from "@/components/common/query-state";
import { AdjustStockDialog } from "@/components/inventory/adjust-stock-dialog";
import { ItemFormDialog } from "@/components/inventory/item-form-dialog";
import { listInventory, listMovements } from "@/lib/api/inventory";
import { formatDateTime, formatQuantity } from "@/lib/format";
import { packSummary, stockPercent, stockTone, type StockTone } from "@/lib/pricing";

const BAR_TONE: Record<StockTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  neutral: "bg-muted-foreground",
};

const ALL_ITEMS = "all";

const REASON_LABELS: Record<string, string> = {
  consumption: "Shop consumption",
  purchase: "Purchase / restock",
  adjustment: "Correction",
  waste: "Waste",
  return: "Returned to supplier",
};

export default function ManageInventory() {
  const [itemFilter, setItemFilter] = useState<string>(ALL_ITEMS);
  const [showHidden, setShowHidden] = useState(false);

  const inventoryQuery = useQuery({ queryKey: ["inventory"], queryFn: listInventory });
  const movementsQuery = useQuery({
    queryKey: ["inventory-movements", itemFilter],
    queryFn: () => listMovements({ itemId: itemFilter === ALL_ITEMS ? undefined : itemFilter, limit: 60 }),
  });

  const allItems = inventoryQuery.data ?? [];
  const items = allItems.filter((item) => showHidden || item.is_active);
  const lowStock = items.filter((item) => Number(item.quantity) <= Number(item.low_stock_threshold));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplies & stock"
        description="Soap and everything else the shop consumes, how full each supply is, and the reorder level you keep."
        actions={
          <>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Switch
                checked={showHidden}
                onCheckedChange={setShowHidden}
                aria-label="Show supplies that are no longer used"
              />
              Show hidden
            </label>
            <ItemFormDialog />
          </>
        }
      />

      {lowStock.length > 0 ? (
        <Card className="border-warning/40 bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-display text-base text-warning">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              Reorder soon
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {lowStock.map((item) => item.name).join(", ")} {lowStock.length === 1 ? "is" : "are"} at or below the
            reorder level.
          </CardContent>
        </Card>
      ) : null}

      <QueryState
        isLoading={inventoryQuery.isLoading}
        error={inventoryQuery.error}
        isEmpty={items.length === 0}
        emptyIcon={Boxes}
        emptyTitle="No supplies tracked yet"
        emptyDescription="Add the supplies the shop uses so stock and consumption can be tracked."
        emptyAction={<ItemFormDialog />}
      >
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/60">
                <TableHead>Supply</TableHead>
                <TableHead className="text-right">On hand</TableHead>
                <TableHead className="text-right">Reorder at</TableHead>
                <TableHead>Stock status</TableHead>
                <TableHead className="hidden sm:table-cell text-right">Cost / unit</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const low = Number(item.quantity) <= Number(item.low_stock_threshold);
                const percent = stockPercent(item);
                const tone = stockTone(percent, low);
                const packs = packSummary(item);
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">{item.name}</span>
                        {item.is_placeholder ? <PlaceholderBadge /> : null}
                        {!item.is_active ? <ToneBadge tone="neutral">Inactive</ToneBadge> : null}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-foreground">
                      {formatQuantity(item.quantity, item.unit)}
                      {item.full_stock_level ? (
                        <span className="block text-xs font-normal text-muted-foreground">
                          of {formatQuantity(item.full_stock_level, item.unit)}
                        </span>
                      ) : null}
                      {packs ? (
                        <span className="block text-xs font-normal text-primary">≈ {packs}</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatQuantity(item.low_stock_threshold, item.unit)}
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-[9rem] flex-col gap-1.5">
                        <span className="flex flex-wrap items-center gap-2">
                          {percent !== null ? (
                            <ToneBadge tone={tone}>{percent}% of full</ToneBadge>
                          ) : low ? (
                            <ToneBadge tone="warning">Reorder</ToneBadge>
                          ) : (
                            <ToneBadge tone="success">In stock</ToneBadge>
                          )}
                          {low && percent !== null ? <ToneBadge tone="danger">Reorder</ToneBadge> : null}
                        </span>
                        {percent !== null ? (
                          <span
                            className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
                            role="img"
                            aria-label={`${percent}% of the full level`}
                          >
                            <span
                              className={`block h-full rounded-full ${BAR_TONE[tone]}`}
                              style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
                            />
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-right text-muted-foreground sm:table-cell">
                      {item.cost_per_unit ? `₱${Number(item.cost_per_unit).toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <AdjustStockDialog item={item} />
                        <ItemFormDialog
                          item={item}
                          trigger={
                            <Button variant="ghost" size="sm">
                              Edit
                            </Button>
                          }
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </QueryState>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="font-display text-lg">Stock movements</CardTitle>
          <Select value={itemFilter} onValueChange={setItemFilter}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="All supplies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_ITEMS}>All supplies</SelectItem>
              {items.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <QueryState
            isLoading={movementsQuery.isLoading}
            error={movementsQuery.error}
            isEmpty={(movementsQuery.data ?? []).length === 0}
            emptyTitle="No stock movements yet"
            emptyDescription="Restocks, consumption and corrections will be listed here with who recorded them."
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Supply</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                    <TableHead className="text-right">After</TableHead>
                    <TableHead className="hidden lg:table-cell">Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(movementsQuery.data ?? []).map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(movement.created_at)}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {movement.inventory_items?.name ?? "Supply"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {REASON_LABELS[movement.reason] ?? movement.reason}
                      </TableCell>
                      <TableCell
                        className={
                          Number(movement.delta) < 0
                            ? "text-right font-semibold text-warning"
                            : "text-right font-semibold text-success"
                        }
                      >
                        {Number(movement.delta) > 0 ? "+" : ""}
                        {formatQuantity(movement.delta, movement.inventory_items?.unit)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatQuantity(movement.quantity_after, movement.inventory_items?.unit)}
                      </TableCell>
                      <TableCell className="hidden max-w-[320px] lg:table-cell">
                        <span className="block truncate text-xs text-muted-foreground">
                          {movement.note ?? "—"}
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
