"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAction } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary w-full" disabled={pending}>
      {pending ? "Signing in..." : "Sign in"}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, undefined);

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-900 px-4">
      <div className="card w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <div className="text-brand-700 font-bold text-2xl tracking-tight">S-CUBUS</div>
          <div className="text-slate-500 text-sm mt-1">Timetable Management</div>
        </div>
        <form action={formAction} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input name="email" type="email" required className="input" placeholder="owner@demo.local" />
          </div>
          <div>
            <label className="label">Password</label>
            <input name="password" type="password" required className="input" />
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <SubmitButton />
        </form>
        <p className="text-xs text-slate-400 mt-6 text-center">
          Demo Owner: owner@demo.local / Admin@12345 — change this before going live.
        </p>
      </div>
    </div>
  );
}
