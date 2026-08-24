import ClubCard from "@/components/ClubCard";

import {
  getClubLogo,
} from "@/lib/club-logo";

import {
  getClubName,
} from "@/lib/club-names";

import {
  getPlantillasFiles,
} from "@/lib/plantillas";

export const dynamic =
  "force-dynamic";

export const revalidate = 0;

export default async function PlantillasPage() {
  const teams =
    await getPlantillasFiles();

  const teamsWithLogos =
    teams.map((team) => {
      const code =
        team.name.toUpperCase();

      return {
        ...team,

        code,

        clubName:
          getClubName(code),

        logo:
          getClubLogo(code),
      };
    });

  return (
    <div className="w-full">
      {/* CABECERA */}

      <div>
        <h1
          className="
            text-2xl
            font-bold
            text-white

            sm:text-3xl

            lg:text-4xl
          "
        >
          Plantillas
        </h1>

        <p
          className="
            mt-2
            text-sm
            text-slate-400

            sm:text-base
          "
        >
          Plantillas oficiales
          sincronizadas con Dropbox.
        </p>

        <p
          className="
            mt-1
            text-xs
            text-slate-500

            sm:text-sm
          "
        >
          {teams.length} equipos
        </p>
      </div>

      {/* EQUIPOS */}

      <div
        className="
          mt-6
          grid
          grid-cols-1
          gap-4

          sm:grid-cols-2

          xl:grid-cols-3

          2xl:grid-cols-4
        "
      >
        {teamsWithLogos.map(
          (team) => (
            <ClubCard
              key={team.path}
              code={team.code}
              name={
                team.clubName
              }
              logo={team.logo}
              modified={
                team.modified
              }
            />
          )
        )}
      </div>
    </div>
  );
}