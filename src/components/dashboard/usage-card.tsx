import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatLimit } from "@/lib/billing/plans";

export function UsageCard({ label, used, limit, unit }: { label: string; used: number; limit: number; unit?: string }) {
  const pct = Number.isFinite(limit) && limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const fmt = (n: number) =>
    unit ? `${n.toLocaleString("en-US", { maximumFractionDigits: 1 })} ${unit}` : n.toLocaleString("en-US");
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">
          {fmt(used)}
          <span className="text-sm font-normal text-muted-foreground">
            {" "}
            / {Number.isFinite(limit) ? fmt(limit) : formatLimit(limit)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Progress value={pct} />
      </CardContent>
    </Card>
  );
}
