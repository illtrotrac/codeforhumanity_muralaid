import type { Metadata } from "next";
import { AdminBoard } from "@/components/admin/AdminBoard";

// The folder name "admin" makes this page live at /admin.
export const metadata: Metadata = {
  title: "Shelter admin · MuralAid",
};

export default function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12 lg:py-16">
      <AdminBoard />
    </main>
  );
}
