import ShtCreator from "@/components/ShtCreator";
import { getAllPlayers } from "@/lib/all-players";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CreadorPage() {
  const players = await getAllPlayers();

  return (
    <div className="w-full min-w-0">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
          Creador (.sht)
        </h1>

        <p className="mt-2 text-sm text-slate-400 sm:text-base">
          Crea alineaciones ESMS utilizando las plantillas oficiales.
        </p>
      </div>

      <ShtCreator players={players} />
    </div>
  );
}