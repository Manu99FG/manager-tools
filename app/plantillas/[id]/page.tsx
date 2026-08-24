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
  // Obtenemos el código del equipo desde la URL
  const { id } = await params;

  const team = decodeURIComponent(id).toUpperCase();

  // Conectamos con Dropbox
  const dbx = getDropboxClient();

  // Ruta oficial de las plantillas ESMS
  const path =
    `/ESO - Evolution Soccer Online/Plantillas/${team}.txt`;

  // Descargamos la plantilla
  const download = await dbx.filesDownload({
    path,
  });

  /*
   * Dropbox debería devolver fileBlob cuando
   * descargamos un archivo.
   *
   * TypeScript considera que puede ser undefined,
   * así que lo comprobamos antes de utilizarlo.
   */
  const fileBlob = download.result.fileBlob;

  if (!fileBlob) {
    throw new Error(
      `No se pudo descargar la plantilla ${team} desde Dropbox`
    );
  }

  // Convertimos el archivo descargado a texto
  const text = await fileBlob.text();

  // Interpretamos el formato ESMS
  const players = parseEsmsPlantilla(text);

  return (
    <div>
      {/* VOLVER */}
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

      {/* CABECERA */}
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

        <h1 className="mt-2 text-4xl font-bold text-white">
          {getClubName(team)}
        </h1>

        <p className="mt-1 text-slate-500">
          {team}
        </p>

        <p className="mt-3 text-slate-400">
          {players.length} jugadores
        </p>
      </div>

      {/* TABLA DE JUGADORES */}
      <div className="mt-8">
        <PlayersTable
          players={players}
          team={team}
        />
      </div>
    </div>
  );
}