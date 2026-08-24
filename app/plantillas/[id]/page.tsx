import Link from "next/link";

import PlayersTable from "@/components/PlayersTable";
import { getClubName } from "@/lib/club-names";
import { getDropboxClient } from "@/lib/dropbox";
import { parseEsmsPlantilla } from "@/lib/parser-esms";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const team =
    decodeURIComponent(id).toUpperCase();

  const dbx = getDropboxClient();

  const path =
    `/ESO - Evolution Soccer Online/Plantillas/${team}.txt`;

  const download =
    await dbx.filesDownload({
      path,
    });

  const text =
    await download.result.fileBlob.text();

  const players =
    parseEsmsPlantilla(text);

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
          hover:bg-slate-700
        "
      >
        ← Volver a Plantillas
      </Link>

      <div className="mt-8">
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

        <h1 className="mt-2 text-4xl font-bold">
          {getClubName(team)}
        </h1>

        <p className="mt-1 text-slate-500">
          {team}
        </p>

        <p className="mt-3 text-slate-400">
          {players.length} jugadores
        </p>
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