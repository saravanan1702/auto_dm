"use client";

import { useActionState } from "react";
import { login } from "../actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <main className="min-h-dvh grid place-items-center px-4">
      <form action={action} className="card w-full max-w-sm p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="brand-badge size-10 rounded-xl grid place-items-center text-white font-bold">A</div>
          <div>
            <h1 className="text-lg font-semibold">AutoDM</h1>
            <p className="text-sm text-muted">Private dashboard</p>
          </div>
        </div>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Password</span>
          <input name="password" type="password" required autoFocus className="input" autoComplete="current-password" />
        </label>
        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        <button disabled={pending} className="btn-primary w-full">
          {pending ? "Checking…" : "Log in"}
        </button>
      </form>
    </main>
  );
}
