import { connection } from "next/server";
import Link from "next/link";
import { ensureSchema, getAccount, recordFollowers, sql, TZ } from "@/lib/db";
import { getProfile } from "@/lib/instagram";
import { BarChart, LineChart } from "@/components/charts";
import { Empty, Stat, StatusPill, timeAgo } from "@/components/ui";

export default async function Dashboard() {
  await connection(); // always render with live data
  await ensureSchema();
  const account = await getAccount();

  if (!account) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center space-y-4">
        <div className="brand-badge mx-auto size-14 rounded-2xl" />
        <h1 className="text-xl font-semibold">Connect your Instagram</h1>
        <p className="text-sm text-muted">
          Link your Instagram professional (Business or Creator) account to start sending automatic DMs.
        </p>
        <Link href="/settings" className="btn-primary">Go to settings</Link>
      </div>
    );
  }

  // Live follower count (also saves today's reading for the growth chart).
  let followers: number | null = null;
  let profileError: string | null = null;
  try {
    const me = await getProfile(account.access_token);
    if (typeof me.followers_count === "number") {
      followers = me.followers_count;
      await recordFollowers(followers);
    }
  } catch (e) {
    profileError = (e as Error).message;
  }

  const [stats] = await sql`SELECT
      count(*) FILTER (WHERE status = 'sent')::int AS total_sent,
      count(*) FILTER (WHERE status = 'sent' AND created_at >= (date_trunc('day', now() AT TIME ZONE ${TZ}) AT TIME ZONE ${TZ}))::int AS today_sent,
      count(*) FILTER (WHERE status = 'sent' AND created_at >= now() - interval '7 days')::int AS week_sent,
      count(*) FILTER (WHERE status = 'failed' AND created_at >= now() - interval '7 days')::int AS week_failed,
      count(*) FILTER (WHERE source = 'comment' AND created_at >= now() - interval '7 days')::int AS week_comments,
      count(DISTINCT ig_user_id) FILTER (WHERE status = 'sent')::int AS people
    FROM events`;

  const daily = await sql`SELECT to_char(d, 'YYYY-MM-DD') AS label, COALESCE(c.n, 0)::int AS value
    FROM generate_series((now() AT TIME ZONE ${TZ})::date - 13, (now() AT TIME ZONE ${TZ})::date, interval '1 day') d
    LEFT JOIN (
      SELECT (created_at AT TIME ZONE ${TZ})::date AS day, count(*) AS n
      FROM events WHERE status = 'sent' GROUP BY 1
    ) c ON c.day = d::date ORDER BY d`;

  const snaps = await sql`SELECT to_char(day, 'YYYY-MM-DD') AS label, followers AS value
    FROM follower_snapshots WHERE day >= (now() AT TIME ZONE ${TZ})::date - 30 ORDER BY day`;

  const growth = (days: number) => {
    if (!snaps.length) return null;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const base = snaps.find((s) => new Date(s.label) >= cutoff) ?? snaps[0];
    return snaps[snaps.length - 1].value - base.value;
  };
  const g7 = growth(7);
  const g30 = growth(30);
  const sign = (n: number | null) => (n === null ? "—" : n > 0 ? `+${n}` : String(n));

  const top = await sql`SELECT a.id, a.name, a.active, a.trigger_type,
      count(e.id) FILTER (WHERE e.status = 'sent')::int AS sent
    FROM automations a LEFT JOIN events e ON e.automation_id = a.id
    GROUP BY a.id ORDER BY sent DESC, a.id DESC LIMIT 5`;

  const recent = await sql`SELECT e.*, a.name AS automation_name FROM events e
    LEFT JOIN automations a ON a.id = e.automation_id
    WHERE e.status <> 'no_match' ORDER BY e.created_at DESC LIMIT 6`;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        {account.profile_picture_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={account.profile_picture_url} alt="" className="size-11 rounded-full object-cover" />
        ) : (
          <div className="brand-badge size-11 rounded-full" />
        )}
        <div>
          <h1 className="text-lg font-semibold leading-tight">@{account.username}</h1>
          <p className="text-sm text-muted">
            {profileError ? <span className="text-danger">Instagram: {profileError}</span> : "Connected and listening for comments"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="DMs sent today" value={stats.today_sent} sub={`${stats.week_sent} in last 7 days`} />
        <Stat label="Total DMs sent" value={stats.total_sent} sub={`${stats.people} unique people`} />
        <Stat
          label="Followers"
          value={followers ?? (snaps.at(-1)?.value ?? "—")}
          sub={`${sign(g7)} this week · ${sign(g30)} in 30 days`}
          tone={g7 && g7 > 0 ? "good" : g7 && g7 < 0 ? "danger" : undefined}
        />
        <Stat
          label="Comments (7 days)"
          value={stats.week_comments}
          sub={stats.week_failed ? `${stats.week_failed} DMs failed` : "No failures"}
          tone={stats.week_failed ? "danger" : undefined}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="text-sm font-semibold">DMs sent · last 14 days</h2>
          <div className="mt-3"><BarChart data={daily as never} /></div>
        </section>
        <section className="card p-4">
          <h2 className="text-sm font-semibold">Follower growth · last 30 days</h2>
          <div className="mt-3"><LineChart data={snaps as never} /></div>
        </section>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="card">
          <div className="flex items-center justify-between px-4 pt-4">
            <h2 className="text-sm font-semibold">Top automations</h2>
            <Link href="/automations/new" className="text-sm font-medium text-accent">+ New</Link>
          </div>
          {top.length === 0 ? (
            <p className="p-4 text-sm text-muted">No automations yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-border">
              {top.map((a) => (
                <li key={a.id}>
                  <Link href={`/automations/${a.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className={`size-2 shrink-0 rounded-full ${a.active ? "bg-good" : "bg-muted"}`} />
                      <span className="truncate text-sm">{a.name}</span>
                    </span>
                    <span className="text-sm tabular-nums text-muted">{a.sent} sent</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="flex items-center justify-between px-4 pt-4">
            <h2 className="text-sm font-semibold">Recent activity</h2>
            <Link href="/activity" className="text-sm font-medium text-accent">See all</Link>
          </div>
          {recent.length === 0 ? (
            <p className="p-4 text-sm text-muted">Nothing yet. Comment a keyword on your reel to test.</p>
          ) : (
            <ul className="mt-2 divide-y divide-border">
              {recent.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm">
                      <span className="font-medium">{e.username ? `@${e.username}` : "Someone"}</span>{" "}
                      <span className="text-muted">“{e.incoming_text}”</span>
                    </div>
                    <div className="text-xs text-muted">{e.automation_name ?? "—"} · {timeAgo(e.created_at)}</div>
                  </div>
                  <StatusPill status={e.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      {top.length === 0 && (
        <Empty title="Create your first automation">
          <Link href="/automations/new" className="text-accent font-medium">Set up a keyword → DM rule</Link>
        </Empty>
      )}
    </div>
  );
}
