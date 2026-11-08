"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError("");
    setIsSubmitting(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.get("email"), password: data.get("password") }),
    }).catch(() => null);

    setIsSubmitting(false);
    if (!response) return setError("Can't reach the server. Check your connection.");
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return setError(body.error ?? "Sign-in failed. Try again.");
    }
    // The session cookie is set; refresh so server pages see we're signed in.
    router.push("/admin");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-labelledby="login-title"
      className="flex w-full max-w-sm flex-col gap-6 rounded-panel bg-surface p-8 shadow-soft"
    >
      <div className="flex flex-col gap-1">
        <p className="font-mono text-label uppercase text-ink-muted">Shelter admin</p>
        <h1 id="login-title" className="font-display text-title text-ink-strong">
          Sign in
        </h1>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="login-email" className="font-mono text-label uppercase text-ink-muted">
          Email
        </label>
        <input id="login-email" name="email" type="email" autoComplete="username" required className="field" />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="login-password" className="font-mono text-label uppercase text-ink-muted">
          Password
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="field"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-pill bg-accent px-6 py-3.5 font-semibold text-accent-ink transition-all duration-300 ease-out-soft hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-glow disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none"
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
