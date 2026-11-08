import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/admin/LoginForm";
import { getCurrentAdmin } from "@/server/auth";

export const metadata: Metadata = {
  title: "Sign in · MuralAid",
};

export default function LoginPage() {
  return (
    <main className="flex w-full flex-1 items-center justify-center px-6 py-16">
      <Suspense fallback={null}>
        <AlreadySignedIn />
      </Suspense>
      <LoginForm />
    </main>
  );
}

// Already signed in? Skip the form. (Reads cookies, so it sits in Suspense.)
async function AlreadySignedIn() {
  if (await getCurrentAdmin()) redirect("/admin");
  return null;
}
