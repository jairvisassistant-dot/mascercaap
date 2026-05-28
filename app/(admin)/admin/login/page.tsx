import Link from "next/link";
import LoginForm from "./LoginForm";

export default function AdminLoginPage() {
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-4 py-12 text-text-main">
      {/* Fondo decorativo */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 8% 12%, rgba(63,143,70,0.07) 0%, transparent 45%), radial-gradient(circle at 92% 88%, rgba(229,138,34,0.05) 0%, transparent 40%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: "radial-gradient(circle, var(--primary-dark) 1px, transparent 1px)", backgroundSize: "26px 26px" }}
      />

      <div className="relative w-full max-w-md">
        <LoginForm />

        <div className="mt-6 text-center">
          <Link
            href="/es"
            className="text-sm text-text-muted transition-colors hover:text-primary"
          >
            ← Volver al sitio
          </Link>
        </div>
      </div>
    </div>
  );
}
