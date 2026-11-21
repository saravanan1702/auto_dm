"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { checkPassword, createSession, SESSION_COOKIE, verifySession } from "@/lib/auth";
import { ensureSchema, sql } from "@/lib/db";

async function requireAuth() {
  const c = await cookies();
  if (!(await verifySession(c.get(SESSION_COOKIE)?.value))) redirect("/login");
}

export async function login(_: unknown, form: FormData) {
  await new Promise((r) => setTimeout(r, 400)); // slow down guessing
  if (!checkPassword(String(form.get("password") ?? ""))) return { error: "Wrong password" };
  const s = await createSession();
  (await cookies()).set(SESSION_COOKIE, s.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: s.maxAge,
    path: "/",
  });
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

const lines = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);

export async function saveAutomation(_: unknown, form: FormData) {
  await requireAuth();
  await ensureSchema();
  const id = Number(form.get("id")) || null;
  const name = String(form.get("name") ?? "").trim();
  const trigger = form.get("trigger_type") === "dm" ? "dm" : "comment";
  const mode = ["any", "contains", "exact"].includes(String(form.get("match_mode")))
    ? String(form.get("match_mode"))
    : "contains";
  const keywords = lines(form.get("keywords"));
  const dm = String(form.get("dm_message") ?? "").trim();
  const publicReplies = String(form.get("public_replies") ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const media = trigger === "comment" ? String(form.get("media_id") ?? "") || null : null;
  const caption = media ? String(form.get("media_caption") ?? "") || null : null;
  const thumb = media ? String(form.get("media_thumbnail") ?? "") || null : null;
  const once = form.get("once_per_user") === "on";
  const active = form.get("active") === "on";

  if (!name) return { error: "Give the automation a name" };
  if (!dm) return { error: "Write the DM message" };
  if (dm.length > 1000) return { error: "DM message must be under 1000 characters" };
  if (mode !== "any" && keywords.length === 0) return { error: "Add at least one keyword, or choose 'Any comment'" };

  if (id) {
    await sql`UPDATE automations SET name=${name}, trigger_type=${trigger}, media_id=${media},
      media_caption=${caption}, media_thumbnail=${thumb}, match_mode=${mode}, keywords=${keywords},
      dm_message=${dm}, public_replies=${publicReplies}, once_per_user=${once}, active=${active},
      updated_at=now() WHERE id=${id}`;
  } else {
    await sql`INSERT INTO automations (name, trigger_type, media_id, media_caption, media_thumbnail,
      match_mode, keywords, dm_message, public_replies, once_per_user, active)
      VALUES (${name}, ${trigger}, ${media}, ${caption}, ${thumb}, ${mode}, ${keywords}, ${dm},
      ${publicReplies}, ${once}, ${active})`;
  }
  revalidatePath("/", "layout");
  redirect("/automations");
}

export async function toggleAutomation(id: number, active: boolean) {
  await requireAuth();
  await sql`UPDATE automations SET active=${active}, updated_at=now() WHERE id=${id}`;
  revalidatePath("/", "layout");
}

export async function deleteAutomation(id: number) {
  await requireAuth();
  await sql`DELETE FROM automations WHERE id=${id}`;
  revalidatePath("/", "layout");
  redirect("/automations");
}

export async function disconnectInstagram() {
  await requireAuth();
  await ensureSchema();
  await sql`DELETE FROM account WHERE id = 1`;
  revalidatePath("/", "layout");
}
