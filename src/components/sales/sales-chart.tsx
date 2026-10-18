import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/format";
import type { SalesRow } from "@/lib/api/reports";

const CHANNEL_COLORS = ["hsl(191 85% 33%)", "hsl(174 68% 42%)", "hsl(199 88% 38%)", "hsl(152 58% 30%)", "hsl(33 92% 34%)"];

/** Sales bucketed by day/week/month, split per payment channel. */
export function SalesChart({ rows }: { rows: SalesRow[] }) {
  const channels = Array.from(new Set(rows.map((row) => row.channel)));
  const buckets = Array.from(new Set(rows.map((row) => row.bucket))).sort();

  const data = buckets.map((bucket) => {
    const entry: Record<string, string | number> = {
      bucket: new Date(bucket).toLocaleDateString("en-PH", { month: "short", day: "numeric" }),
    };
    for (const channel of channels) {
      const match = rows.find((row) => row.bucket === bucket && row.channel === channel);
      entry[channel] = match ? Number(match.total) : 0;
    }
    return entry;
  });

  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No payments were recorded in this period.
      </p>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="bucket" stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickFormatter={(value: number) => `₱${value}`}
          />
          <Tooltip
            formatter={(value: number, name: string) => [formatCurrency(value), name]}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--card))",
              color: "hsl(var(--card-foreground))",
            }}
          />
          <Legend />
          {channels.map((channel, index) => (
            <Bar
              key={channel}
              dataKey={channel}
              stackId="sales"
              fill={CHANNEL_COLORS[index % CHANNEL_COLORS.length]}
              radius={[6, 6, 0, 0]}
            >
              {data.map((_, cellIndex) => (
                <Cell key={cellIndex} fill={CHANNEL_COLORS[index % CHANNEL_COLORS.length]} />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
