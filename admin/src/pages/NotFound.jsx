import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-[28px] border border-[var(--line)] bg-[var(--card)] p-10 text-center shadow-[var(--shadow)]">
        <p
          className="bg-clip-text text-[64px] font-extrabold leading-none tracking-tight text-transparent"
          style={{ backgroundImage: "var(--grad)" }}
        >
          404
        </p>
        <h1 className="mt-4 text-lg font-bold text-[var(--ink)]">Page not found</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--mute)]">
          This route is not created yet. Head back to the dashboard to keep working.
        </p>

        <Link to="/" className="btn-primary mt-7">
          <ArrowLeft size={16} />
          Go to Dashboard
        </Link>
      </div>
    </main>
  );
}
