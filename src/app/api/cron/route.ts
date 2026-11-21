import { NextResponse, type NextRequest } from "next/server";
import { getAccount, recordFollowers, sql } from "@/lib/db";
import { getProfile, refreshToken } from "@/lib/instagram";

// Daily job (vercel.json): save follower count, keep the 60-day token fresh, trim old logs.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const account = await getAccount();
  if (!account) return NextResponse.json({ ok: true, note: "No account connected" });

  const out: Record<string, unknown> = {};
  let token = account.access_token;

  const expires = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0;
  if (expires - Date.now() < 20 * 24 * 3600 * 1000) {
    try {
      const r = await refreshToken(token);
      token = r.access_token;
      await sql`UPDATE account SET access_token = ${token},
        token_expires_at = now() + make_interval(secs => ${r.expires_in}) WHERE id = 1`;
      out.tokenRefreshed = true;
    } catch (e) {
      out.tokenError = (e as Error).message;
    }
  }

  try {
    const me = await getProfile(token);
    if (typeof me.followers_count === "number") {
      await recordFollowers(me.followers_count);
      out.followers = me.followers_count;
    }
  } catch (e) {
    out.profileError = (e as Error).message;
  }

  await sql`DELETE FROM events WHERE status = 'no_match' AND created_at < now() - interval '30 days'`;
  return NextResponse.json({ ok: true, ...out });
}
