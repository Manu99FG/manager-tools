import Image from "next/image";
import Link from "next/link";

import PlayersTable from "@/components/PlayersTable";
import { getClubLogo } from "@/lib/club-logo";
import { getClubName } from "@/lib/club-names";
import { getDropboxClient, getDropboxRosterPath } from "@/lib/dropbox";
import { parseEsmsPlantilla } from "@/lib/parser-esms";
import {
  getPlayerIdMap,
  getPlayerIdentityKey,
} from "@/lib/player-history";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const team = decodeURIComponent(id).toUpperCase();
  const dbx = await getDropboxClient();
  const path = await getDropboxRosterPath(team, "live");
  const download = await dbx.filesDownload({ path });
  const fileBlob = download.result.fileBlob;

  if (!fileBlob) {
    throw new Error(`No se pudo descargar la plantilla ${team} desde Dropbox`);
  }

  const text = await fileBlob.text();
  const parsedPlayers = parseEsmsPlantilla(text);
  let playerIdMap = new Map<string, string>();

  try {
    playerIdMap = await getPlayerIdMap();
  } catch (error) {
    console.error(`No se pudieron obtener los IDs históricos de ${team}:`, error);
  }

  const players = parsedPlayers.map((player) => ({
    ...player,
    playerId:
      playerIdMap.get(getPlayerIdentityKey(player.name, player.nat)) ?? null,
  }));

  const clubName = getClubName(team);
  const clubLogo = getClubLogo(team);

  return (
    <div className="w-full pb-10">
      <div className="mb-5 flex items-center justify-between gap-4">
        <Link
          href="/plantillas"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] px-4 text-[11px] font-extrabold text-[var(--mt-text)] shadow-[0_1px_2px_rgba(0,0,0,.04)] transition hover:border-[var(--mt-gold)] hover:text-[var(--mt-gold-dark)]"
        >
          <span className="text-base leading-none">←</span>
          Plantillas
        </Link>
        <span className="hidden text-[10px] font-bold uppercase tracking-[.14em] text-[var(--mt-muted)] sm:block">
          Base de datos · Liga de Leyendas
        </span>
      </div>

      <section className="relative overflow-hidden rounded-[13px] border border-[var(--mt-line)] bg-[var(--mt-surface)] shadow-[0_12px_35px_rgba(42,35,20,.07)]">
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#6b5019,#b58a2d,#d1b466,#9a7425)]" />
        <div className="absolute right-0 top-0 h-full w-[42%] opacity-[.055] [background:radial-gradient(circle_at_65%_45%,#9a7425_0%,transparent_58%)]" />

        <div className="relative grid min-h-[190px] grid-cols-[96px_1fr] items-center gap-5 px-5 py-7 sm:grid-cols-[128px_1fr_auto] sm:gap-7 sm:px-8 lg:px-10">
          <div className="relative h-24 w-24 overflow-hidden rounded-[13px] border border-[var(--mt-line)] bg-[var(--mt-surface)] shadow-[0_8px_22px_rgba(40,34,22,.08)] sm:h-32 sm:w-32">
            <Image src={clubLogo} alt={clubName} fill sizes="128px" className="object-contain p-4" priority />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[var(--mt-surface-soft)] px-2.5 py-1 text-[9px] font-black uppercase tracking-[.12em] text-[var(--mt-gold)]">
                {team}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[var(--mt-muted)]">
                Plantilla oficial ESMS
              </span>
            </div>
            <h1 className="mt-3 truncate text-[clamp(1.8rem,5vw,3.5rem)] font-black tracking-[-.045em] text-[var(--mt-text)]">
              {clubName}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] font-semibold text-[var(--mt-muted)]">
              <span><b className="text-[var(--mt-text)]">{players.length}</b> jugadores</span>
              <span className="hidden h-4 w-px bg-[var(--mt-line)] sm:block" />
              <span>Datos sincronizados con Dropbox</span>
            </div>
          </div>

          <div className="hidden items-center gap-3 rounded-[13px] border border-[var(--mt-line)] bg-[var(--mt-surface)] px-4 py-3 lg:flex">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--mt-gold)] text-sm font-black text-[var(--mt-text)]">LL</div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-[.13em] text-[var(--mt-muted)]">Base de datos</div>
              <div className="mt-0.5 text-[11px] font-extrabold text-[var(--mt-text)]">Liga de Leyendas</div>
            </div>
          </div>
        </div>

        <nav className="relative flex overflow-x-auto border-t border-[var(--mt-line)] bg-[var(--mt-surface)] px-3 sm:px-6">
          <Link href={`/plantillas/${team}`} className="relative min-w-max px-4 py-4 text-[10px] font-black uppercase tracking-[.1em] text-[var(--mt-gold)] after:absolute after:inset-x-4 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[var(--mt-gold)]">Plantilla</Link>
          <Link href={`/clubes/${team}/historial#estadisticas`} className="min-w-max px-4 py-4 text-[10px] font-black uppercase tracking-[.1em] text-[var(--mt-muted)] transition hover:text-[var(--mt-gold-dark)]">Estadísticas</Link>
          <Link href={`/clubes/${team}/historial`} className="min-w-max px-4 py-4 text-[10px] font-black uppercase tracking-[.1em] text-[var(--mt-muted)] transition hover:text-[var(--mt-gold-dark)]">Historial</Link>
          <Link href={`/clubes/${team}/historial#palmares`} className="min-w-max px-4 py-4 text-[10px] font-black uppercase tracking-[.1em] text-[var(--mt-muted)] transition hover:text-[var(--mt-gold-dark)]">Palmarés</Link>
        </nav>
      </section>

      <section className="mt-5 overflow-hidden rounded-[13px] border border-[var(--mt-line)] bg-[var(--mt-surface)] shadow-[0_10px_30px_rgba(42,35,20,.055)]">
        <PlayersTable players={players} team={team} />
      </section>
    </div>
  );
}
