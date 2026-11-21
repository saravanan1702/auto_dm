"use client";

import { useActionState, useState } from "react";
import { saveAutomation, deleteAutomation } from "@/app/actions";
import type { Automation } from "@/lib/db";
import type { IgMedia } from "@/lib/instagram";

type Props = { automation?: Automation; media: IgMedia[]; mediaError?: string | null };

export function AutomationForm({ automation: a, media, mediaError }: Props) {
  const [state, action, pending] = useActionState(saveAutomation, null);
  const [trigger, setTrigger] = useState<"comment" | "dm">(a?.trigger_type ?? "comment");
  const [mode, setMode] = useState(a?.match_mode ?? "contains");
  const [mediaId, setMediaId] = useState<string>(a?.media_id ?? "");
  const [msg, setMsg] = useState(a?.dm_message ?? "Hey {username}! 👋 Here's the link you asked for: ");
  const selected = media.find((m) => m.id === mediaId);
  const thumb = (m: IgMedia) => m.thumbnail_url || m.media_url;

  return (
    <form action={action} className="space-y-4">
      {a && <input type="hidden" name="id" value={a.id} />}
      <input type="hidden" name="trigger_type" value={trigger} />
      <input type="hidden" name="media_id" value={trigger === "comment" ? mediaId : ""} />
      <input type="hidden" name="media_caption" value={selected?.caption?.slice(0, 200) ?? a?.media_caption ?? ""} />
      <input type="hidden" name="media_thumbnail" value={(selected && thumb(selected)) ?? a?.media_thumbnail ?? ""} />

      <section className="card p-4 space-y-3">
        <label className="block space-y-1.5">
          <span className="label">Name</span>
          <input name="name" required defaultValue={a?.name} placeholder="e.g. Free guide reel" className="input" />
        </label>
        <div className="space-y-1.5">
          <span className="label">Trigger</span>
          <div className="grid grid-cols-2 gap-2">
            {(["comment", "dm"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTrigger(t)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                  trigger === t ? "border-accent bg-accent/10 text-accent" : "border-border text-muted"
                }`}
              >
                {t === "comment" ? "Comment on post / reel" : "Someone DMs me"}
              </button>
            ))}
          </div>
        </div>
      </section>

      {trigger === "comment" && (
        <section className="card p-4 space-y-3">
          <div>
            <div className="label">Which post or reel?</div>
            <div className="hint">Pick one, or leave on “All posts” to watch every post and reel.</div>
          </div>
          {mediaError && <p className="text-sm text-danger">Couldn’t load your posts: {mediaError}</p>}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-80 overflow-y-auto pr-1">
            <button
              type="button"
              onClick={() => setMediaId("")}
              className={`aspect-[3/4] rounded-xl border-2 grid place-items-center text-xs font-semibold text-center px-2 ${
                mediaId === "" ? "border-accent text-accent bg-accent/10" : "border-border text-muted"
              }`}
            >
              All posts &amp; reels
            </button>
            {/* keep a previously-picked post visible even if it's not in the latest 30 */}
            {a?.media_id && !media.some((m) => m.id === a.media_id) && (
              <MediaTile id={a.media_id} src={a.media_thumbnail} caption={a.media_caption} active={mediaId === a.media_id} onPick={setMediaId} />
            )}
            {media.map((m) => (
              <MediaTile
                key={m.id}
                id={m.id}
                src={thumb(m) ?? null}
                caption={m.caption ?? null}
                reel={m.media_product_type === "REELS"}
                active={mediaId === m.id}
                onPick={setMediaId}
              />
            ))}
          </div>
        </section>
      )}

      <section className="card p-4 space-y-3">
        <div className="label">Keywords</div>
        <div className="flex flex-wrap gap-2">
          {[
            ["contains", "Contains keyword"],
            ["exact", "Exact match"],
            ["any", trigger === "comment" ? "Any comment" : "Any message"],
          ].map(([v, l]) => (
            <label key={v} className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${mode === v ? "border-accent bg-accent/10 text-accent" : "border-border text-muted"}`}>
              <input type="radio" name="match_mode" value={v} checked={mode === v} onChange={() => setMode(v as never)} className="sr-only" />
              {l}
            </label>
          ))}
        </div>
        {mode !== "any" && (
          <label className="block space-y-1.5">
            <input name="keywords" defaultValue={a?.keywords.join(", ")} placeholder="link, guide, send" className="input" />
            <span className="hint">Separate with commas. Not case-sensitive. Any one keyword is enough.</span>
          </label>
        )}
      </section>

      <section className="card p-4 space-y-3">
        <label className="block space-y-1.5">
          <span className="label">DM message</span>
          <textarea name="dm_message" rows={5} required maxLength={1000} value={msg} onChange={(e) => setMsg(e.target.value)} className="input resize-y" />
          <span className="hint flex justify-between">
            <span>Use {"{username}"} to insert their @name. Links are clickable in DMs.</span>
            <span>{msg.length}/1000</span>
          </span>
        </label>
        {trigger === "comment" && (
          <label className="block space-y-1.5">
            <span className="label">Public reply under the comment <span className="font-normal text-muted">(optional)</span></span>
            <textarea
              name="public_replies"
              rows={3}
              defaultValue={a?.public_replies.join("\n")}
              placeholder={"Sent! Check your DMs 📩\nDone {username}, check your inbox ✨"}
              className="input resize-y"
            />
            <span className="hint">One per line. A random one is used each time so replies don’t look copy-pasted.</span>
          </label>
        )}
      </section>

      <section className="card divide-y divide-border">
        <Check name="once_per_user" label="Only DM each person once" hint="Stops repeat DMs if someone comments many times." defaultChecked={a?.once_per_user ?? true} />
        <Check name="active" label="Active" hint="Turn off to pause without deleting." defaultChecked={a?.active ?? true} />
      </section>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}

      <div className="flex gap-2">
        <button disabled={pending} className="btn-primary flex-1 sm:flex-none">{pending ? "Saving…" : a ? "Save changes" : "Create automation"}</button>
        {a && (
          <button
            type="button"
            className="btn-ghost text-danger"
            onClick={() => confirm("Delete this automation? Its activity history is kept.") && deleteAutomation(a.id)}
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}

function MediaTile(p: { id: string; src: string | null; caption: string | null; reel?: boolean; active: boolean; onPick: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => p.onPick(p.id)}
      title={p.caption ?? ""}
      className={`relative aspect-[3/4] overflow-hidden rounded-xl border-2 bg-surface-2 ${p.active ? "border-accent" : "border-transparent"}`}
    >
      {p.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.src} alt="" loading="lazy" className="size-full object-cover" />
      ) : (
        <span className="p-2 text-[11px] text-muted line-clamp-4">{p.caption || "Post"}</span>
      )}
      {p.reel && <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[10px] font-semibold text-white">Reel</span>}
      {p.active && <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-accent text-[11px] text-white">✓</span>}
    </button>
  );
}

function Check({ name, label, hint, defaultChecked }: { name: string; label: string; hint: string; defaultChecked: boolean }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 p-4">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="hint">{hint}</span>
      </span>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-5 accent-[var(--accent)]" />
    </label>
  );
}
