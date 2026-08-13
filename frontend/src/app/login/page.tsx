"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

import { SimpatikLogo } from "@/components/shared/simpatik-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <main className="grid min-h-screen bg-background lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-sidebar text-white lg:flex lg:flex-col">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)",
            backgroundSize: "26px 26px",
          }}
        />
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-gold/15 blur-3xl" />
        <div className="absolute -bottom-28 -left-24 size-96 rounded-full bg-primary/45 blur-3xl" />

        <div className="relative z-10 flex h-full flex-col p-10 xl:p-12">
          <SimpatikLogo inverse />
          <div className="my-auto max-w-lg">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-gold">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Portal internal terintegrasi
            </div>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight xl:text-5xl">
              Pelaporan kepatuhan lebih tertib, transparan, dan{" "}
              <span className="text-gold">terukur.</span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/70 xl:text-base">
              Kelola penyusunan, validasi, reviu, dan persetujuan laporan UPT dalam satu ruang kerja
              terpadu.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3">
              {[
                { value: "12", label: "UPT" },
                { value: "7", label: "Peran" },
                { value: "1", label: "Alur terpadu" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                >
                  <p className="text-2xl font-extrabold text-gold">{item.value}</p>
                  <p className="mt-1 text-xs text-white/55">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-white/40">
            Akses terbatas untuk pengguna yang telah diaktifkan.
          </p>
        </div>
      </section>

      <section className="dashboard-surface flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <SimpatikLogo />
          </div>
          <div>
            <p className="text-sm font-bold text-primary">Selamat datang kembali</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Masuk ke SIMPATIK</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Gunakan akun internal Anda untuk melanjutkan.
            </p>
          </div>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit} noValidate>
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
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pl-10 pr-10"
                  placeholder="Masukkan password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Eye className="size-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <Button type="submit" size="lg" className="mt-2 w-full" disabled={isSubmitting}>
              {isSubmitting ? "Memproses login..." : "Masuk ke Dashboard"}
              {!isSubmitting ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
            </Button>
          </form>

          <div className="mt-8 flex items-start gap-3 rounded-xl border bg-card p-4 text-xs leading-5 text-muted-foreground shadow-sm">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <p>
              Masalah akses? Hubungi Admin SIMPATIK. Detail kegagalan login disembunyikan untuk
              menjaga keamanan akun.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
