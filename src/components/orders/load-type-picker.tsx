import { LOAD_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * How the load should be sorted. Shown when a booking is placed and when a walk-in
 * is logged, because the shop does not take responsibility for colours that run in
 * a mixed load.
 */
export function LoadTypePicker({
  value,
  onChange,
  idPrefix = "load",
}: {
  value: string;
  onChange: (value: string) => void;
  idPrefix?: string;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-foreground">How should we sort the load?</legend>
      <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Load type">
        {LOAD_TYPES.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              id={`${idPrefix}-${option.value}`}
              onClick={() => onChange(option.value)}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-left transition-colors",
                selected
                  ? "border-primary/60 bg-primary/5 shadow-sm"
                  : "border-border hover:bg-secondary",
              )}
            >
              <span className="block text-sm font-semibold text-foreground">{option.label}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                {option.hint}
              </span>
            </button>
          );
        })}
      </div>
      {value === "mixed" ? (
        <p className="text-[11px] leading-snug text-warning">
          Mixed loads carry a risk: colours may run onto lighter items, and the shop cannot take
          responsibility for that.
        </p>
      ) : null}
    </fieldset>
  );
}
