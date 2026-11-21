export const metadata = { title: "Privacy · AutoDM" };

export default function Privacy() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 space-y-4 text-sm leading-relaxed">
      <h1 className="text-xl font-semibold">Privacy policy</h1>
      <p>
        AutoDM is a private tool used by a single Instagram account owner to automatically reply to comments and
        messages on their own Instagram account.
      </p>
      <p>
        When someone comments on or messages the connected account, AutoDM receives the comment or message text, the
        sender’s Instagram username and ID from Meta. This is used only to decide whether to send an automatic reply
        and to keep an activity log for the account owner. It is never sold or shared with anyone.
      </p>
      <p>
        Activity logs that did not trigger a reply are deleted after 30 days. To have your data removed, send a direct
        message to the account you interacted with asking for deletion.
      </p>
    </main>
  );
}
