import Image from "next/image";
import Link from "next/link";

import PlayersTable from "@/components/PlayersTable";
import { getClubLogo } from "@/lib/club-logo";
import { getClubName } from "@/lib/club-names";
import { getDropboxClient } from "@/lib/dropbox";
import { parseEsmsPlantilla } from "@/lib/parser-esms";

/*
 * Las plantillas individuales deben obtener siempre
 * la versión actual del archivo de Dropbox.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const team = decodeURIComponent(id).toUpperCase();

  const dbx = getDropboxClient();

  const path =
    `/ESO - Evolution Soccer Online/Plantillas/${team}.txt`;

  const download = await dbx.filesDownload({
    path,
  });

  const fileBlob = download.result.fileBlob;

  if (!fileBlob) {
    throw new Error(
      `No se pudo descargar la plantilla ${team} desde Dropbox`
    );
  }

  const text = await fileBlob.text();

  const players = parseEsmsPlantilla(text);

  const clubName = getClubName(team);
  const clubLogo = getClubLogo(team);

  return (
    <div>
      <Link
        href="/plantillas"
        className="
          inline-flex
          rounded-lg
          bg-slate-800
          px-4
          py-2
          text-sm
          font-semibold
          text-white
          transition
          hover:bg-slate-700
        "
      >
        ← Volver a Plantillas
      </Link>

      <div className="mt-8 flex items-center gap-6">
        <div
          className="
            relative
            h-24
            w-24
            shrink-0
            rounded-2xl
            bg-slate-950
            p-3
          "
        >
          <Image
            src={clubLogo}
            alt={`Escudo de ${clubName}`}
            fill
            sizes="96px"
            className="object-contain p-3"
            priority
          />
        </div>

        <div>
          <p
            className="
              text-xs
              font-bold
              uppercase
              tracking-widest
              text-blue-400
            "
          >
            Plantilla oficial ESMS
          </p>

          <h1 className="mt-2 text-4xl font-bold text-white">
            {clubName}
          </h1>

          <div className="mt-2 flex items-center gap-3">
            <span
              className="
                rounded-md
                bg-slate-800
                px-2
                py-1
                text-xs
                font-bold
                text-slate-300
              "
            >
              {team}
            </span>

            <span className="text-sm text-slate-400">
              {players.length} jugadores
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <PlayersTable
          players={players}
          team={team}
        />
      </div>
    </div>
  );
}