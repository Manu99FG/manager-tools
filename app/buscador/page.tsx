import PlayerSearch from "@/components/PlayerSearch";

import {
  getAllPlayers,
} from "@/lib/all-players";

export const dynamic =
  "force-dynamic";

export const revalidate = 0;

export default async function BuscadorPage() {
  const players =
    await getAllPlayers();

  return (
    <div className="w-full min-w-0">
      <div className="mb-5 sm:mb-6">
        <h1
          className="
            text-2xl
            font-bold
            text-white

            sm:text-3xl

            lg:text-4xl
          "
        >
          Buscador
        </h1>

        <p
          className="
            mt-2
            text-sm
            text-slate-400

            sm:text-base
          "
        >
          Busca jugadores entre
          todas las plantillas
          oficiales.
        </p>

        <p
          className="
            mt-1
            text-xs
            text-slate-500

            sm:text-sm
          "
        >
          {players.length} jugadores
          disponibles
        </p>
      </div>

      <PlayerSearch
        players={players}
      />
    </div>
  );
}