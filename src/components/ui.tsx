export function Stat({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone?: "good" | "danger" }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{typeof value === "number" ? value.toLocaleString() : value}</div>
      {sub && <div className={`mt-0.5 text-xs ${tone === "good" ? "text-good" : tone === "danger" ? "text-danger" : "text-muted"}`}>{sub}</div>}
    </div>
  );
}

const statusStyle: Record<string, string> = {
  sent: "bg-good/12 text-good",
  failed: "bg-danger/12 text-danger",
  skipped: "bg-warn/12 text-warn",
  no_match: "bg-surface-2 text-muted",
  processing: "bg-surface-2 text-muted",
};

const statusLabel: Record<string, string> = {
  sent: "DM sent",
  failed: "Failed",
  skipped: "Skipped",
  no_match: "No match",
  processing: "Processing",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusStyle[status] ?? statusStyle.no_match}`}>
      {statusLabel[status] ?? status}
    </span>
  );
}

export function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function daysUntil(iso: string) {
  return Math.round((new Date(iso).getTime() - Date.now()) / 86400000);
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="card p-8 text-center">
      <div className="font-medium">{title}</div>
      {children && <div className="mt-1.5 text-sm text-muted">{children}</div>}
    </div>
  );
}
