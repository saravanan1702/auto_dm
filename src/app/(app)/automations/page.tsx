import { connection } from "next/server";
import Link from "next/link";
import { ensureSchema, sql } from "@/lib/db";
import { ActiveToggle } from "@/components/active-toggle";
import { Empty } from "@/components/ui";

export default async function AutomationsPage() {
  await connection(); // always render with live data
  await ensureSchema();
  const rows = await sql`SELECT a.*,
      count(e.id) FILTER (WHERE e.status = 'sent')::int AS sent,
      count(e.id) FILTER (WHERE e.status = 'sent' AND e.created_at >= now() - interval '7 days')::int AS week
    FROM automations a LEFT JOIN events e ON e.automation_id = a.id
    GROUP BY a.id ORDER BY a.active DESC, a.id DESC`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Automations</h1>
        <Link href="/automations/new" className="btn-primary">+ New</Link>
      </div>

      {rows.length === 0 ? (
        <Empty title="No automations yet">
          Example: when someone comments <b>LINK</b> on a reel, DM them your link.
        </Empty>
      ) : (
        <ul className="space-y-3">
          {rows.map((a) => (
            <li key={a.id} className="card flex items-stretch gap-3 p-3">
              <Link href={`/automations/${a.id}`} className="flex min-w-0 flex-1 gap-3">
                {a.media_thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.media_thumbnail} alt="" className="size-16 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="grid size-16 shrink-0 place-items-center rounded-lg bg-surface-2 text-[11px] font-medium text-muted text-center leading-tight">
                    {a.trigger_type === "dm" ? "DM\nkeyword" : "All posts"}
                  </div>
                )}
                <div className="min-w-0 py-0.5">
                  <div className="truncate font-medium">{a.name}</div>
                  <div className="mt-0.5 truncate text-xs text-muted">
                    {a.trigger_type === "dm" ? "When someone DMs " : "When someone comments "}
                    {a.match_mode === "any" ? "anything" : a.keywords.map((k: string) => `“${k}”`).join(", ")}
                  </div>
                  <div className="mt-1.5 text-xs tabular-nums">
                    <b>{a.sent}</b> <span className="text-muted">sent · {a.week} this week</span>
                  </div>
                </div>
              </Link>
              <ActiveToggle id={a.id} active={a.active} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
