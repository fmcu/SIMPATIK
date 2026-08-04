import Link from "next/link";
import { ArrowLeft, ShieldX } from "lucide-react";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <section className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
        <ShieldX className="mx-auto size-10 text-destructive" aria-hidden="true" />
        <p className="mt-5 text-sm font-semibold text-primary">Akses ditolak</p>
        <h1 className="mt-2 text-2xl font-bold">Anda tidak memiliki izin</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Halaman ini tidak tersedia untuk role akun Anda.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-semibold transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Kembali ke dasbor
        </Link>
      </section>
    </main>
  );
}
