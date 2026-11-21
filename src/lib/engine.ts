/** Decides which automation (if any) fires for an incoming comment / DM, and sends the reply. */
import { Automation, ensureSchema, getAccount, sql } from "./db";
import { replyToComment, sendDm, sendPrivateReply } from "./instagram";

export function matches(a: Pick<Automation, "match_mode" | "keywords">, text: string) {
  if (a.match_mode === "any") return true;
  const t = text.toLowerCase().trim();
  const kws = a.keywords.map((k) => k.toLowerCase().trim()).filter(Boolean);
  if (kws.length === 0) return true;
  if (a.match_mode === "exact") return kws.some((k) => t === k);
  return kws.some((k) => t.includes(k));
}

export function fill(template: string, username?: string | null) {
  return template.replace(/\{username\}/gi, username ? `@${username}` : "there");
}

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

/** Claims a webhook item exactly once (Meta retries webhooks). Returns the event id or null if seen. */
async function claim(source: string, sourceId: string, fields: Record<string, string | null>) {
  const rows = await sql`INSERT INTO events (source, source_id, media_id, ig_user_id, username, incoming_text, status)
    VALUES (${source}, ${sourceId}, ${fields.media_id}, ${fields.ig_user_id}, ${fields.username}, ${fields.text}, 'processing')
    ON CONFLICT (source_id) DO NOTHING RETURNING id`;
  return rows[0]?.id as number | undefined;
}

async function finish(eventId: number, status: string, automationId: number | null, error?: string) {
  await sql`UPDATE events SET status = ${status}, automation_id = ${automationId}, error = ${error ?? null}
    WHERE id = ${eventId}`;
}

async function alreadySent(automationId: number, igUserId: string) {
  const r = await sql`SELECT 1 FROM events WHERE automation_id = ${automationId}
    AND ig_user_id = ${igUserId} AND status = 'sent' LIMIT 1`;
  return r.length > 0;
}

type CommentValue = {
  id: string;
  text?: string;
  parent_id?: string;
  from?: { id: string; username?: string };
  media?: { id: string; media_product_type?: string };
};

export async function handleComment(v: CommentValue) {
  await ensureSchema();
  const account = await getAccount();
  if (!account || !v?.id || !v.from?.id) return;
  if (v.from.id === account.ig_user_id) return; // ignore our own replies

  const text = v.text ?? "";
  const mediaId = v.media?.id ?? null;
  const eventId = await claim("comment", `c_${v.id}`, {
    media_id: mediaId,
    ig_user_id: v.from.id,
    username: v.from.username ?? null,
    text,
  });
  if (!eventId) return;

  // Post-specific automations first, then "all posts" ones.
  const autos = (await sql`SELECT * FROM automations
    WHERE active AND trigger_type = 'comment' AND (media_id IS NULL OR media_id = ${mediaId})
    ORDER BY (media_id IS NULL), id`) as Automation[];
  const a = autos.find((x) => matches(x, text));
  if (!a) return finish(eventId, "no_match", null);

  if (a.once_per_user && (await alreadySent(a.id, v.from.id))) {
    return finish(eventId, "skipped", a.id, "Already sent to this user");
  }

  try {
    await sendPrivateReply(account.access_token, account.ig_user_id, v.id, fill(a.dm_message, v.from.username));
    await finish(eventId, "sent", a.id);
  } catch (e) {
    return finish(eventId, "failed", a.id, (e as Error).message);
  }

  if (a.public_replies.length) {
    try {
      await replyToComment(account.access_token, v.id, fill(pick(a.public_replies), v.from.username));
    } catch (e) {
      console.error("public reply failed", e);
    }
  }
}

type MessagingItem = {
  sender?: { id: string };
  recipient?: { id: string };
  message?: { mid: string; text?: string; is_echo?: boolean };
};

export async function handleMessage(m: MessagingItem) {
  await ensureSchema();
  const account = await getAccount();
  const msg = m.message;
  if (!account || !msg?.mid || msg.is_echo || !m.sender?.id || !msg.text) return;
  if (m.sender.id === account.ig_user_id) return;

  const eventId = await claim("dm", `m_${msg.mid}`, {
    media_id: null,
    ig_user_id: m.sender.id,
    username: null,
    text: msg.text,
  });
  if (!eventId) return;

  const autos = (await sql`SELECT * FROM automations
    WHERE active AND trigger_type = 'dm' ORDER BY id`) as Automation[];
  const a = autos.find((x) => matches(x, msg.text!));
  if (!a) return finish(eventId, "no_match", null);

  if (a.once_per_user && (await alreadySent(a.id, m.sender.id))) {
    return finish(eventId, "skipped", a.id, "Already sent to this user");
  }
  try {
    await sendDm(account.access_token, account.ig_user_id, m.sender.id, fill(a.dm_message, null));
    await finish(eventId, "sent", a.id);
  } catch (e) {
    await finish(eventId, "failed", a.id, (e as Error).message);
  }
}
