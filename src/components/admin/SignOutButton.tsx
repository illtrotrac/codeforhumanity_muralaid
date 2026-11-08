"use client";

import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="font-mono text-label uppercase text-ink-muted underline-offset-4 transition-colors duration-300 hover:text-ink hover:underline"
    >
      Sign out
    </button>
  );
}
