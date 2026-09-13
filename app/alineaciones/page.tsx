import ManualShtChecker from "@/components/ManualShtChecker";
import ShtCreator from "@/components/ShtCreator";
import { getAllPlayers } from "@/lib/all-players";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LineupsPage() {
  const [playersResult] = await Promise.allSettled([getAllPlayers()]);
  const players = playersResult.status === "fulfilled" ? playersResult.value : [];
  const dataUnavailable = playersResult.status === "rejected";

  return (
    <div className="w-full min-w-0 space-y-8 pb-10">
      <header className="mb-2">
        <h1 className="text-2xl font-bold text-[var(--mt-text)] sm:text-3xl lg:text-4xl">
          Alineaciones
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--mt-muted)] sm:text-base">
          Crea tu hoja de partido, comprueba que cumple las reglas del simulador original y envíala a la competición correspondiente.
        </p>
        <p className="mt-1 text-xs text-[var(--mt-muted)] sm:text-sm">
          {players.length} jugadores disponibles para construir alineaciones.
        </p>
        {dataUnavailable && (
          <p className="mt-3 rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface-soft)] px-4 py-3 text-sm text-[var(--mt-muted)]">
            Algunas fuentes de datos no están disponibles ahora mismo. Puedes seguir usando el comprobador y volver a cargar la página cuando se restablezca la conexión.
          </p>
        )}
      </header>

      <section aria-labelledby="crear-alineacion" className="space-y-3">
        <div>
          <h2 id="crear-alineacion" className="text-xl font-semibold text-[var(--mt-text)]">
            Crear o editar una alineación
          </h2>
          <p className="mt-1 text-sm text-[var(--mt-muted)]">
            Selecciona el equipo, coloca a los jugadores y añade las órdenes tácticas y sustituciones.
          </p>
        </div>
        <ShtCreator players={players} />
      </section>

      <section aria-labelledby="comprobar-alineacion" className="space-y-3">
        <div>
          <h2 id="comprobar-alineacion" className="text-xl font-semibold text-[var(--mt-text)]">
            Comprobar una alineación existente
          </h2>
          <p className="mt-1 text-sm text-[var(--mt-muted)]">
            Importa tu archivo ABREVIATURAsht.txt o pega su contenido para detectar errores de formato, posiciones y condiciones.
          </p>
        </div>
        <ManualShtChecker players={players} />
      </section>

    </div>
  );
}
