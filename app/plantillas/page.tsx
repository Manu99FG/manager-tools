import ClubCard from "@/components/ClubCard";
import { getClubLogo } from "@/lib/club-logo";
import { getClubName } from "@/lib/club-names";
import { getPlantillasFiles } from "@/lib/plantillas";

/*
 * La lista de plantillas se consulta directamente
 * desde Dropbox en cada petición.
 *
 * No queremos que Vercel conserve una versión
 * semanal de esta página.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PlantillasPage() {
  const teams = await getPlantillasFiles();

  const teamsWithLogos = teams.map((team) => {
    const code = team.name.toUpperCase();

    return {
      ...team,
      code,
      clubName: getClubName(code),
      logo: getClubLogo(code),
    };
  });

  return (
    <div>
      <div>
        <h1 className="text-4xl font-bold text-white">
          Plantillas
        </h1>

        <p className="mt-2 text-slate-400">
          Plantillas oficiales sincronizadas con Dropbox.
        </p>

        <p className="mt-1 text-sm text-slate-500">
          {teams.length} equipos
        </p>
      </div>

      <div
        className="
          mt-8
          grid
          gap-5
          sm:grid-cols-2
          xl:grid-cols-3
          2xl:grid-cols-4
        "
      >
        {teamsWithLogos.map((team) => (
          <ClubCard
            key={team.path}
            code={team.code}
            name={team.clubName}
            logo={team.logo}
            modified={team.modified}
          />
        ))}
      </div>
    </div>
  );
}