import { connection } from "next/server";
import { getAccount } from "@/lib/db";
import { appUrl, redirectUri } from "@/lib/instagram";
import { disconnectInstagram, logout } from "@/app/actions";
import { InstallHint } from "@/components/install-hint";
import { daysUntil } from "@/components/ui";

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  await connection(); // always render with live data
  const sp = await searchParams;
  const account = await getAccount();
  const missing = ["DATABASE_URL", "ADMIN_PASSWORD", "SESSION_SECRET", "IG_APP_ID", "IG_APP_SECRET", "IG_WEBHOOK_VERIFY_TOKEN", "APP_URL", "CRON_SECRET"].filter(
    (k) => !process.env[k],
  );
  const days = account?.token_expires_at ? daysUntil(account.token_expires_at) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>

      {typeof sp.ok === "string" && <p className="card border-good/40 bg-good/10 p-3 text-sm text-good">{sp.ok}</p>}
      {typeof sp.error === "string" && <p className="card border-danger/40 bg-danger/10 p-3 text-sm text-danger">{sp.error}</p>}
      {missing.length > 0 && (
        <p className="card border-warn/40 bg-warn/10 p-3 text-sm text-warn">
          Missing environment variables: {missing.join(", ")}
        </p>
      )}

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Instagram account</h2>
        {account ? (
          <>
            <div className="flex items-center gap-3">
              {account.profile_picture_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={account.profile_picture_url} alt="" className="size-12 rounded-full object-cover" />
              ) : (
                <div className="brand-badge size-12 rounded-full" />
              )}
              <div>
                <div className="font-medium">@{account.username}</div>
                <div className="text-xs text-muted">
                  Access token {days !== null ? `valid for ~${days} days (auto-renews daily)` : "expiry unknown"}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href="/api/auth/instagram" className="btn-ghost">Reconnect</a>
              <form action={disconnectInstagram}>
                <button className="btn-ghost text-danger">Disconnect</button>
              </form>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted">
              You’ll be sent to Instagram’s own login page. This app never sees your password — Instagram gives it a
              token that only allows reading your posts/comments and sending messages.
            </p>
            <a href="/api/auth/instagram" className="btn-primary">Connect Instagram</a>
          </>
        )}
      </section>

      <section className="card p-4 space-y-2">
        <h2 className="font-semibold">Meta developer setup values</h2>
        <p className="text-sm text-muted">Paste these into your app at developers.facebook.com (see README).</p>
        <Row label="OAuth redirect URL" value={redirectUri()} />
        <Row label="Webhook callback URL" value={`${appUrl()}/api/webhook`} />
        <Row label="Privacy policy URL" value={`${appUrl()}/privacy`} />
        <p className="hint">Webhook fields to subscribe: comments, messages.</p>
      </section>

      <InstallHint />

      <form action={logout}>
        <button className="btn-ghost w-full">Log out</button>
      </form>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <code className="block select-all break-all rounded-lg bg-surface-2 px-2.5 py-1.5 text-[13px]">{value}</code>
    </div>
  );
}
