import AvailabilityDashboard from "@/components/AvailabilityDashboard";

import {
  getPlayerAvailability,
} from "@/lib/player-availability";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

export default async function AvailabilityPage() {
  const data =
    await getPlayerAvailability();

  return (
    <main
      className="
        mx-auto
        w-full
        max-w-7xl
        px-4
        py-8
        sm:px-6
        lg:px-8
      "
    >
      <section
        className="
          rounded-[28px]
          border
          border-[var(--mt-line)]
          bg-gradient-to-br
          from-[var(--mt-black)]
          to-[var(--mt-black)]
          p-6
          sm:p-8
        "
      >
        <div
          className="
            text-xs
            font-black
            uppercase
            tracking-[0.2em]
            text-[var(--mt-gold-dark)]
          "
        >
          Manager Tools
        </div>

        <h1
          className="
            mt-2
            text-3xl
            font-black
            text-[var(--mt-text)]
            sm:text-5xl
          "
        >
          Disponibilidad
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--mt-muted)] sm:text-base">
          Estado actual de lesiones, sanciones y disponibilidad de todos los jugadores de la liga.
        </p>
      </section>

      <div className="mt-8">
        <AvailabilityDashboard
          data={data}
        />
      </div>
    </main>
  );
}
