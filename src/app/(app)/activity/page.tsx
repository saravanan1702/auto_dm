import { connection } from "next/server";
import Link from "next/link";
import { ensureSchema, sql } from "@/lib/db";
import { Empty, StatusPill, timeAgo } from "@/components/ui";

const FILTERS = [
  ["", "All"],
  ["sent", "Sent"],
  ["failed", "Failed"],
  ["skipped", "Skipped"],
  ["no_match", "No match"],
] as const;

export default async function ActivityPage({ searchParams }: PageProps<"/activity">) {
  await connection(); // always render with live data
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "";
  const automation = typeof sp.automation === "string" && /^\d+$/.test(sp.automation) ? Number(sp.automation) : null;
  await ensureSchema();

  const rows = await sql`SELECT e.*, a.name AS automation_name FROM events e
    LEFT JOIN automations a ON a.id = e.automation_id
    WHERE (${status} = '' OR e.status = ${status})
      AND (${automation}::int IS NULL OR e.automation_id = ${automation})
    ORDER BY e.created_at DESC LIMIT 200`;

  const qs = (s: string) => {
    const p = new URLSearchParams();
    if (s) p.set("status", s);
    if (automation) p.set("automation", String(automation));
    const q = p.toString();
    return q ? `/activity?${q}` : "/activity";
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Activity</h1>
        <p className="text-sm text-muted">
          Every comment and DM that reached your account (latest 200).
          {automation && <> Filtered to one automation · <Link href="/activity" className="text-accent">clear</Link></>}
        </p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map(([v, l]) => (
          <Link
            key={v}
            href={qs(v)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${status === v ? "border-accent bg-accent/10 text-accent" : "border-border text-muted"}`}
          >
            {l}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <Empty title="Nothing here yet" />
      ) : (
        <ul className="card divide-y divide-border">
          {rows.map((e) => (
            <li key={e.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm">
                    <span className="font-medium">{e.username ? `@${e.username}` : e.source === "dm" ? "DM" : "Someone"}</span>{" "}
                    <span className="text-muted">{e.source === "dm" ? "messaged" : "commented"}</span>{" "}
                    <span className="break-words">“{e.incoming_text}”</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted">
                    {e.automation_name ? `${e.automation_name} · ` : ""}
                    <time title={new Date(e.created_at).toLocaleString("en-IN")}>{timeAgo(e.created_at)}</time>
                  </div>
                  {e.error && <div className="mt-1 text-xs text-danger break-words">{e.error}</div>}
                </div>
                <StatusPill status={e.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
