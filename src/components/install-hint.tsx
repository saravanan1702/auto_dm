"use client";

import { useEffect, useState } from "react";

type BIPEvent = Event & { prompt: () => Promise<void> };

export function InstallHint() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    const h = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  return (
    <section className="card p-4 space-y-2">
      <h2 className="font-semibold">Install on your phone</h2>
      {installed ? (
        <p className="text-sm text-good">Installed — you’re using the app version.</p>
      ) : (
        <>
          {evt && (
            <button className="btn-primary" onClick={() => evt.prompt().then(() => setEvt(null))}>
              Install AutoDM
            </button>
          )}
          <ul className="text-sm text-muted list-disc pl-5 space-y-1">
            <li><b>Android (Chrome):</b> menu ⋮ → “Add to Home screen” / “Install app”.</li>
            <li><b>iPhone (Safari):</b> Share button → “Add to Home Screen”.</li>
          </ul>
        </>
      )}
    </section>
  );
}
