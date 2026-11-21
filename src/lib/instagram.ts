/**
 * Thin wrapper over the official Instagram API (Instagram Login flavour).
 * Docs: https://developers.facebook.com/docs/instagram-platform
 */
const GRAPH = "https://graph.instagram.com";
export const GRAPH_VERSION = process.env.IG_GRAPH_VERSION || "v23.0";

export const IG_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
];

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export function appUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function redirectUri() {
  return `${appUrl()}/api/auth/instagram/callback`;
}

export function authorizeUrl(state: string) {
  const p = new URLSearchParams({
    client_id: env("IG_APP_ID"),
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: IG_SCOPES.join(","),
    state,
  });
  return `https://www.instagram.com/oauth/authorize?${p}`;
}

async function igFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const msg = data?.error?.message || data?.error_message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

/** code -> short-lived token -> long-lived (60 day) token */
export async function exchangeCode(code: string) {
  const body = new URLSearchParams({
    client_id: env("IG_APP_ID"),
    client_secret: env("IG_APP_SECRET"),
    grant_type: "authorization_code",
    redirect_uri: redirectUri(),
    code,
  });
  const short = await igFetch<{ access_token: string; user_id: number | string }>(
    "https://api.instagram.com/oauth/access_token",
    { method: "POST", body },
  );
  const long = await igFetch<{ access_token: string; expires_in: number }>(
    `${GRAPH}/access_token?${new URLSearchParams({
      grant_type: "ig_exchange_token",
      client_secret: env("IG_APP_SECRET"),
      access_token: short.access_token,
    })}`,
  );
  return long;
}

export async function refreshToken(token: string) {
  return igFetch<{ access_token: string; expires_in: number }>(
    `${GRAPH}/refresh_access_token?${new URLSearchParams({
      grant_type: "ig_refresh_token",
      access_token: token,
    })}`,
  );
}

export type IgProfile = {
  user_id: string;
  username: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  profile_picture_url?: string;
};

export async function getProfile(token: string) {
  const p = new URLSearchParams({
    fields: "user_id,username,followers_count,follows_count,media_count,profile_picture_url",
    access_token: token,
  });
  const me = await igFetch<IgProfile>(`${GRAPH}/${GRAPH_VERSION}/me?${p}`);
  me.user_id = String(me.user_id);
  return me;
}

export type IgMedia = {
  id: string;
  caption?: string;
  media_type: string;
  media_product_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp: string;
};

export async function listMedia(token: string, limit = 30) {
  const p = new URLSearchParams({
    fields: "id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp",
    limit: String(limit),
    access_token: token,
  });
  const r = await igFetch<{ data: IgMedia[] }>(`${GRAPH}/${GRAPH_VERSION}/me/media?${p}`);
  return r.data;
}

/** Subscribe this account to webhook events for our app. */
export async function subscribeWebhooks(token: string) {
  const p = new URLSearchParams({
    subscribed_fields: "comments,messages",
    access_token: token,
  });
  return igFetch<{ success: boolean }>(`${GRAPH}/${GRAPH_VERSION}/me/subscribed_apps?${p}`, {
    method: "POST",
  });
}

/** Private reply: DM the person who left a comment (allowed once per comment, within 7 days). */
export async function sendPrivateReply(token: string, igUserId: string, commentId: string, text: string) {
  return igFetch(`${GRAPH}/${GRAPH_VERSION}/${igUserId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { comment_id: commentId }, message: { text } }),
  });
}

/** Normal DM reply to someone who messaged you (24h window). */
export async function sendDm(token: string, igUserId: string, recipientId: string, text: string) {
  return igFetch(`${GRAPH}/${GRAPH_VERSION}/${igUserId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }),
  });
}

/** Public reply under the comment. */
export async function replyToComment(token: string, commentId: string, text: string) {
  const p = new URLSearchParams({ message: text, access_token: token });
  return igFetch(`${GRAPH}/${GRAPH_VERSION}/${commentId}/replies?${p}`, { method: "POST" });
}

/** Verifies the X-Hub-Signature-256 header Meta sends with every webhook. */
export async function verifySignature(rawBody: string, header: string | null) {
  if (!header?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env("IG_APP_SECRET")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const hex = Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
  return timingSafeEqual(hex, header.slice(7));
}

export function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
