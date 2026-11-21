import { NextResponse, type NextRequest } from "next/server";
import { ensureSchema, recordFollowers, sql } from "@/lib/db";
import { exchangeCode, getProfile, subscribeWebhooks } from "@/lib/instagram";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const back = (msg: string, ok = false) =>
    NextResponse.redirect(new URL(`/settings?${ok ? "ok" : "error"}=${encodeURIComponent(msg)}`, req.url));

  const err = url.searchParams.get("error_description") || url.searchParams.get("error");
  if (err) return back(err);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state || state !== req.cookies.get("ig_oauth_state")?.value) {
    return back("Login expired or state mismatch. Please try again.");
  }

  try {
    const { access_token, expires_in } = await exchangeCode(code.replace(/#_$/, ""));
    const me = await getProfile(access_token);
    await ensureSchema();
    await sql`INSERT INTO account (id, ig_user_id, username, profile_picture_url, access_token, token_expires_at)
      VALUES (1, ${me.user_id}, ${me.username}, ${me.profile_picture_url ?? null}, ${access_token},
              now() + make_interval(secs => ${expires_in}))
      ON CONFLICT (id) DO UPDATE SET ig_user_id = EXCLUDED.ig_user_id, username = EXCLUDED.username,
        profile_picture_url = EXCLUDED.profile_picture_url, access_token = EXCLUDED.access_token,
        token_expires_at = EXCLUDED.token_expires_at, connected_at = now()`;
    if (typeof me.followers_count === "number") await recordFollowers(me.followers_count);
    await subscribeWebhooks(access_token);
    const res = back(`Connected @${me.username}`, true);
    res.cookies.delete("ig_oauth_state");
    return res;
  } catch (e) {
    return back((e as Error).message);
  }
}
