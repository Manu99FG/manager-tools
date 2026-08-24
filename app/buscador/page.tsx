import PlayerSearch from "@/components/PlayerSearch";
import { getAllPlayers } from "@/lib/all-players";

/*
 * Queremos obtener la información actual
 * de las plantillas de Dropbox.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BuscadorPage() {
  const players =
    await getAllPlayers();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-white">
          Buscador
        </h1>

        <p className="mt-2 text-slate-400">
          Busca jugadores entre todas las plantillas oficiales.
        </p>

        <p className="mt-1 text-sm text-slate-500">
          {players.length} jugadores disponibles
        </p>
      </div>

      <PlayerSearch
        players={players}
      />
    </div>
  );
}