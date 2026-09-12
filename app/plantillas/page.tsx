import ClubCard from "@/components/ClubCard";
import { getClubLogo } from "@/lib/club-logo";
import { getClubName } from "@/lib/club-names";
import { getPlantillasFiles } from "@/lib/plantillas";

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
    <div className="w-full pb-10">
      <section className="relative overflow-hidden rounded-[13px] border border-[var(--mt-line)] bg-[var(--mt-surface)] px-6 py-7 shadow-[0_12px_35px_rgba(42,35,20,.06)] sm:px-8 sm:py-9">
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#6b5019,#b58a2d,#d1b466,#9a7425)]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[.16em] text-[var(--mt-gold)]">Base de datos</div>
            <h1 className="mt-2 text-3xl font-black tracking-[-.04em] text-[var(--mt-text)] sm:text-4xl">Plantillas</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--mt-muted)]">
              Consulta los equipos y sus plantillas oficiales ESMS, sincronizadas con los datos de la liga.
            </p>
          </div>
          <div className="w-fit rounded-[13px] border border-[var(--mt-line)] bg-[var(--mt-surface)] px-4 py-3">
            <div className="text-[9px] font-black uppercase tracking-[.12em] text-[var(--mt-muted)]">Equipos</div>
            <div className="mt-1 text-2xl font-black text-[var(--mt-text)]">{teams.length}</div>
          </div>
        </div>
      </section>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {teamsWithLogos.map((team) => (
          <ClubCard key={team.path} code={team.code} name={team.clubName} logo={team.logo} modified={team.modified} />
        ))}
      </div>
    </div>
  );
}
