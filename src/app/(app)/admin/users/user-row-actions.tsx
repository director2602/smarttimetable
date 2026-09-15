"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setUserStatus } from "./actions";

export default function UserRowActions({ userId, status }: { userId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const next = status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
  return (
    <button
      disabled={pending}
      className="text-brand-600 hover:underline text-xs"
      onClick={() => startTransition(async () => { await setUserStatus(userId, next as any); router.refresh(); })}
    >
      {status === "ACTIVE" ? "Suspend" : "Activate"}
    </button>
  );
}
