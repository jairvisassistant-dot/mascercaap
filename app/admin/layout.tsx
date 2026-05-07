import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin — Mas Cerca AP",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white antialiased">
      {children}
    </div>
  );
}
