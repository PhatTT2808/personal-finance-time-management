import { formatCurrency } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Row = { category: string; total: number };

// Simple CSS bar list (no chart library) showing expense share by category.
export function ExpenseByCategory({ rows }: { rows: Row[] }) {
  const max = rows.reduce((m, r) => Math.max(m, r.total), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Chi tiêu theo danh mục</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Chưa có chi tiêu trong tháng này.
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.category}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{r.category}</span>
                  <span className="font-medium">{formatCurrency(r.total)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-rose-500"
                    style={{
                      width: `${max > 0 ? (r.total / max) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
