import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  icon?: React.ReactNode;
  valueClassName?: string;
};

export function StatCard({ label, value, icon, valueClassName }: Props) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className={cn("truncate text-xl font-bold", valueClassName)}>
            {value}
          </p>
        </div>
        {icon && <div className="shrink-0 text-muted-foreground">{icon}</div>}
      </CardContent>
    </Card>
  );
}
