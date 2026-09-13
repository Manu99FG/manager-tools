import Link from "next/link";

export default function LineupMaintenancePage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-120px)] w-full max-w-[1440px] items-center justify-center p-4 sm:p-6">
      <section className="app-panel w-full max-w-4xl overflow-hidden rounded-[32px] p-7 text-center sm:p-12">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-[var(--mt-line)] bg-[var(--mt-surface-soft)] text-3xl">
          🛠️
        </div>

        <div className="app-eyebrow mt-6">Alineaciones</div>
        <h1 className="mx-auto mt-2 max-w-3xl text-3xl font-black tracking-[-0.05em] text-[var(--mt-text)] sm:text-5xl">
          Sección en mantenimiento
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-[var(--mt-muted)] sm:text-base">
          Estamos trabajando en el apartado de alineaciones para dejarlo preparado para la competición. Volverá a estar disponible próximamente.
        </p>

        <div className="mx-auto mt-7 inline-flex items-center gap-2 rounded-full border border-[var(--mt-line)] bg-[var(--mt-surface-soft)] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--mt-gold-dark)]">
          <span className="h-2 w-2 rounded-full bg-[var(--mt-gold)]" />
          Temporalmente no disponible
        </div>

        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[var(--mt-gold)] px-6 py-3 text-sm font-black text-white transition hover:opacity-90"
          >
            Volver al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
