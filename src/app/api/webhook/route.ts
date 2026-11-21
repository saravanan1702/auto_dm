import { after, NextResponse, type NextRequest } from "next/server";
import { verifySignature } from "@/lib/instagram";
import { handleComment, handleMessage } from "@/lib/engine";

export const maxDuration = 30;

// Meta calls this once when you save the webhook URL in the developer dashboard.
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  if (p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === process.env.IG_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(p.get("hub.challenge") ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// Every new comment / DM arrives here.
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!(await verifySignature(raw, req.headers.get("x-hub-signature-256")))) {
    return new NextResponse("Bad signature", { status: 401 });
  }

  let body: { object?: string; entry?: Array<Record<string, unknown>> };
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse("Bad JSON", { status: 400 });
  }

  // Reply 200 right away (Meta expects a fast answer), do the work afterwards.
  after(async () => {
    for (const entry of body.entry ?? []) {
      const changes = (entry.changes as Array<{ field: string; value: never }>) ?? [];
      for (const c of changes) {
        if (c.field === "comments" || c.field === "live_comments") {
          await handleComment(c.value).catch((e) => console.error("comment handler", e));
        }
      }
      const messaging = (entry.messaging as never[]) ?? [];
      for (const m of messaging) {
        await handleMessage(m).catch((e) => console.error("message handler", e));
      }
    }
  });

  return NextResponse.json({ ok: true });
}
