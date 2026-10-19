/**
 * Service pricing rules, mirroring the database function `service_line_total`.
 *
 * The database is the authority: it recomputes every line when an order is
 * created, so a wrong preview here can never produce a wrong charge. This helper
 * exists so the customer sees the same figure before submitting.
 */

export type PricedService = {
  price: number | string;
  unit: string;
  base_quantity?: number | string | null;
  increment_quantity?: number | string | null;
  increment_price?: number | string | null;
  max_quantity?: number | string | null;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

function num(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** True when the price covers a base quantity and then steps up per increment. */
export function isTiered(service: PricedService): boolean {
  const base = num(service.base_quantity);
  return base !== null && base > 0;
}

/** The largest quantity the shop accepts in a single wash, if it caps it. */
export function serviceMaxQuantity(service: PricedService): number | null {
  return num(service.max_quantity);
}

/** The base quantity included in the price (minimum charge). */
export function serviceBaseQuantity(service: PricedService): number | null {
  return num(service.base_quantity);
}

/** Price for one service line. Mirrors the SQL function exactly. */
export function serviceLineTotal(service: PricedService, quantity: number): number {
  const price = num(service.price) ?? 0;
  const qty = Number(quantity) || 0;
  const base = num(service.base_quantity);
  const increment = num(service.increment_quantity) ?? 1;
  const incrementPrice = num(service.increment_price) ?? 0;

  if (base === null || base <= 0) return round2(price * qty);

  const extra = Math.max(qty - base, 0);
  if (extra === 0) return round2(price);

  const steps = Math.ceil(extra / Math.max(increment, 0.001));
  return round2(price + steps * incrementPrice);
}

/** Keeps a quantity inside the shop's per-wash cap. */
export function clampQuantity(service: PricedService, quantity: number): number {
  const max = serviceMaxQuantity(service);
  const qty = Math.max(Number(quantity) || 0, 0);
  return max !== null && qty > max ? max : qty;
}

const money = (value: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);

const unitWord = (unit: string) =>
  ({ kg: "kg", piece: "piece", load: "load", service: "service" })[unit] ?? unit;

/** One-line price explanation used on cards, the booking cart and receipts. */
export function servicePricingSummary(service: PricedService): string {
  const price = num(service.price) ?? 0;
  const unit = unitWord(service.unit);
  const base = num(service.base_quantity);

  if (base === null || base <= 0) return `${money(price)} per ${unit}`;

  const increment = num(service.increment_quantity) ?? 1;
  const incrementPrice = num(service.increment_price) ?? 0;
  const max = num(service.max_quantity);

  const parts = [`${money(price)} for the first ${base} ${unit}`];
  if (incrementPrice > 0) {
    parts.push(`${money(incrementPrice)} per extra ${increment === 1 ? unit : `${increment} ${unit}`}`);
  }
  if (max !== null) parts.push(`maximum ${max} ${unit} per wash`);
  return parts.join(" · ");
}

/** Short hint shown inside the quantity control. */
export function serviceQuantityHint(service: PricedService): string | null {
  const base = num(service.base_quantity);
  if (base === null || base <= 0) return null;
  const max = num(service.max_quantity);
  const unit = unitWord(service.unit);
  return max !== null
    ? `Minimum charge covers up to ${base} ${unit}; most we take per wash is ${max} ${unit}.`
    : `Minimum charge covers up to ${base} ${unit}.`;
}

/**
 * Turnaround as the shop quotes it. Wash time depends on how many loads are
 * already queued, so a range is shown when the shop sets a fastest time.
 */
export function serviceTurnaround(service: {
  estimated_hours: number | string;
  estimated_hours_min?: number | string | null;
}): string {
  const max = Number(service.estimated_hours) || 0;
  const min = num(service.estimated_hours_min ?? null);

  if (min !== null && min > 0 && min < max) return `${min}–${max} hours`;
  return `${max} hour${max === 1 ? "" : "s"}`;
}

/** How full a supply is, against the level the shop wants to keep. */
export function stockPercent(item: {
  quantity: number | string | null;
  full_stock_level?: number | string | null;
}): number | null {
  const level = num(item.full_stock_level);
  if (level === null || level <= 0) return null;
  const quantity = num(item.quantity) ?? 0;
  return Math.round(Math.max(Math.min((quantity / level) * 100, 999), 0) * 10) / 10;
}

export type StockTone = "success" | "warning" | "danger" | "neutral";

/** Colour band for the stock level: comfortable, getting low, or critical. */
export function stockTone(percent: number | null, atOrBelowReorder: boolean): StockTone {
  if (percent === null) return atOrBelowReorder ? "warning" : "neutral";
  if (percent < 25) return "danger";
  if (percent < 60 || atOrBelowReorder) return "warning";
  return "success";
}

/** "1 pack + 300 ml" style summary of a millilitre stock level. */
export function packSummary(item: {
  quantity: number | string | null;
  unit?: string | null;
  pack_size?: number | string | null;
  pack_label?: string | null;
}): string | null {
  const packSize = num(item.pack_size);
  if (packSize === null || packSize <= 0) return null;

  const quantity = num(item.quantity) ?? 0;
  const packs = Math.floor(quantity / packSize);
  const remainder = Math.round(quantity - packs * packSize);
  const unit = item.unit ?? "";
  const label = item.pack_label ?? "pack";

  const parts: string[] = [];
  if (packs > 0) parts.push(`${packs} ${label}${packs === 1 ? "" : "s"}`);
  if (remainder > 0 || packs === 0) parts.push(`${remainder} ${unit}`);
  return parts.join(" + ");
}
