import { connection } from "next/server";
import Link from "next/link";
import { loadMedia } from "@/lib/media";
import { AutomationForm } from "@/components/automation-form";

export default async function NewAutomation() {
  await connection(); // always render with live data
  const { media, error } = await loadMedia();
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <Link href="/automations" className="text-sm text-muted">← Automations</Link>
        <h1 className="mt-1 text-xl font-semibold">New automation</h1>
      </div>
      <AutomationForm media={media} mediaError={error} />
    </div>
  );
}
