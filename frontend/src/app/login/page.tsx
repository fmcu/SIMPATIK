"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, LockKeyhole, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await authClient.signIn.email({
        email: email.trim(),
        password,
        rememberMe: true,
      });

      if (result.error) {
        setErrorMessage("Email atau password tidak valid.");
        return;
      }

      const returnTo = new URLSearchParams(window.location.search).get("returnTo");
      const destination = returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
      router.replace(destination);
      router.refresh();
    } catch {
      setErrorMessage("Login belum dapat diproses. Coba lagi beberapa saat.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[minmax(20rem,0.85fr)_minmax(28rem,1.15fr)]">
      <section className="hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary-foreground text-lg font-bold text-primary">
            S
          </span>
          <div>
            <p className="font-bold tracking-wide">SIMPATIK</p>
            <p className="text-xs text-primary-foreground/70">Monitoring Kepatuhan</p>
          </div>
        </div>
        <div className="max-w-md">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground/60">
            Portal internal
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight">
            Satu ruang kerja untuk pelaporan kepatuhan.
          </h1>
          <p className="mt-5 text-base leading-7 text-primary-foreground/75">
            Kelola laporan, reviu, dan status pelaporan UPT secara terpusat.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/60">
          Akses hanya untuk pengguna yang telah diaktifkan oleh Admin SIMPATIK.
        </p>
      </section>
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
                S
              </span>
              <div>
                <p className="font-bold tracking-wide">SIMPATIK</p>
                <p className="text-xs text-muted-foreground">Monitoring Kepatuhan</p>
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-primary">Selamat datang</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Masuk ke akun Anda</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Gunakan email dan password yang telah diberikan oleh administrator.
            </p>
          </div>
          <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
            {errorMessage ? (
              <div
                className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                role="alert"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{errorMessage}</span>
              </div>
            ) : null}
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                Email
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="pl-10"
                  placeholder="nama@instansi.go.id"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <LockKeyhole
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pl-10"
                  placeholder="Masukkan password"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Memproses login..." : "Masuk"}
              {!isSubmitting ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
            </Button>
          </form>
          <p className="mt-8 text-center text-xs leading-5 text-muted-foreground">
            Jika mengalami kendala akses, hubungi Admin SIMPATIK. Informasi detail kegagalan login
            tidak ditampilkan untuk menjaga keamanan akun.
          </p>
        </div>
      </section>
    </main>
  );
}
