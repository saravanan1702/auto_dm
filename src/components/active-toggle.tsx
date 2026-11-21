"use client";

import { useOptimistic, useTransition } from "react";
import { toggleAutomation } from "@/app/actions";

export function ActiveToggle({ id, active }: { id: number; active: boolean }) {
  const [on, setOn] = useOptimistic(active);
  const [, start] = useTransition();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={on ? "Turn off" : "Turn on"}
      onClick={() =>
        start(async () => {
          setOn(!on);
          await toggleAutomation(id, !on);
        })
      }
      className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition ${on ? "bg-accent" : "bg-border"}`}
    >
      <span className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}
