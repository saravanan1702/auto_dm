/** Single-user password login with an HMAC-signed session cookie. Works in Node and Edge. */
import { timingSafeEqual } from "./instagram";

export const SESSION_COOKIE = "autodm_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

async function hmac(data: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) throw new Error("SESSION_SECRET must be at least 16 characters");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createSession() {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  return { value: `${exp}.${await hmac(String(exp))}`, maxAge: MAX_AGE };
}

export async function verifySession(value: string | undefined) {
  if (!value) return false;
  const [exp, sig] = value.split(".");
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  try {
    return timingSafeEqual(await hmac(exp), sig);
  } catch {
    return false;
  }
}

export function checkPassword(input: string) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  return timingSafeEqual(input, pw);
}
