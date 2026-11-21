import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ensureSchema, sql, type Automation } from "@/lib/db";
import { AutomationForm } from "@/components/automation-form";
import { loadMedia } from "@/lib/media";

export default async function EditAutomation({ params }: PageProps<"/automations/[id]">) {
  await connection(); // always render with live data
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  await ensureSchema();
  const [a] = (await sql`SELECT * FROM automations WHERE id = ${Number(id)}`) as Automation[];
  if (!a) notFound();
  const [{ media, error }, [stats]] = await Promise.all([
    loadMedia(),
    sql`SELECT count(*) FILTER (WHERE status = 'sent')::int AS sent,
               count(*) FILTER (WHERE status = 'failed')::int AS failed,
               count(*) FILTER (WHERE status = 'skipped')::int AS skipped
        FROM events WHERE automation_id = ${a.id}`,
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <Link href="/automations" className="text-sm text-muted">← Automations</Link>
        <h1 className="mt-1 text-xl font-semibold">{a.name}</h1>
        <p className="text-sm text-muted">
          <b className="text-text">{stats.sent}</b> sent · {stats.skipped} skipped · {stats.failed} failed ·{" "}
          <Link href={`/activity?automation=${a.id}`} className="text-accent">View activity</Link>
        </p>
      </div>
      <AutomationForm automation={a} media={media} mediaError={error} />
    </div>
  );
}
