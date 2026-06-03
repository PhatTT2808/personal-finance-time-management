export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-sky-300/80">Tổng quan</p>
        <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
