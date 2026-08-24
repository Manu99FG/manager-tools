import { getDropboxClient } from "@/lib/dropbox";
import { parseEsmsPlantilla, type EsmsPlayer } from "@/lib/parser-esms";
import { getPlantillasFiles } from "@/lib/plantillas";
import { getClubName } from "@/lib/club-names";

export type GlobalEsmsPlayer = EsmsPlayer & {
  teamCode: string;
  teamName: string;
};

export async function getAllPlayers(): Promise<GlobalEsmsPlayer[]> {
  const teams = await getPlantillasFiles();

  const dbx = getDropboxClient();

  const results = await Promise.all(
    teams.map(async (team) => {
      try {
        const download = await dbx.filesDownload({
          path: team.path,
        });

        const fileBlob = download.result.fileBlob;

        if (!fileBlob) {
          console.warn(
            `No se pudo descargar ${team.filename}`
          );

          return [];
        }

        const text = await fileBlob.text();

        const players = parseEsmsPlantilla(text);

        return players.map((player) => ({
          ...player,

          teamCode: team.name,
          teamName: getClubName(team.name),
        }));
      } catch (error) {
        console.error(
          `Error cargando ${team.filename}:`,
          error
        );

        return [];
      }
    })
  );

  return results.flat();
}