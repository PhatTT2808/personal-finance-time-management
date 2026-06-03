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
    <Card className="relative border-white/10 bg-white/[0.045] shadow-2xl shadow-black/20 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-sky-300/45 before:to-transparent">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <p className={cn("mt-2 truncate text-2xl font-black tracking-tight text-white", valueClassName)}>
            {value}
          </p>
        </div>
        {icon && <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-sky-300/20 bg-sky-400/10 text-sky-300 shadow-[0_0_24px_rgba(56,189,248,0.12)]">{icon}</div>}
      </CardContent>
    </Card>
  );
}
