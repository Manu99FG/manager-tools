import {
  getPlantillasFiles,
} from "@/lib/plantillas";

import {
  getDropboxClient,
} from "@/lib/dropbox";

import {
  parseEsmsPlantilla,
  type EsmsPlayer,
} from "@/lib/parser-esms";

import {
  getPlayerIdMap,
  getPlayerIdentityKey,
} from "@/lib/player-history";

/* =========================================================
   TIPO GLOBAL
========================================================= */

export type GlobalEsmsPlayer =
  EsmsPlayer & {
    teamCode: string;
    teamName: string;

    /*
     * UUID permanente del jugador
     * guardado en Supabase.
     */
    playerId:
      | string
      | null;
  };

type GetAllPlayersOptions = {
  includePlayerIds?:
    boolean;
};

/* =========================================================
   OBTENER TODOS LOS JUGADORES
========================================================= */

export async function getAllPlayers(
  options: GetAllPlayersOptions = {}
): Promise<
  GlobalEsmsPlayer[]
> {
  const {
    includePlayerIds = true,
  } = options;

  const files =
    await getPlantillasFiles();

  const dbx =
    getDropboxClient();

  /* =======================================================
     DESCARGAR PLANTILLAS EN PARALELO
  ======================================================= */

  const rosterResults =
    await Promise.all(
      files.map(
        async (file) => {
          try {
            /*
             * file.path ya contiene la ruta
             * completa dentro de Dropbox.
             */
            const response =
              await dbx.filesDownload({
                path:
                  file.path,
              });

            const fileBlob =
              response.result.fileBlob;

            if (!fileBlob) {
              console.error(
                `No se pudo descargar la plantilla ${file.name}`
              );

              return [];
            }

            const text =
              await fileBlob.text();

            const parsed =
              parseEsmsPlantilla(
                text
              );

            return parsed.map(
              (
                player
              ): GlobalEsmsPlayer => ({
                ...player,

                /*
                 * En PlantillaFile:
                 *
                 * name = AJA, ARS, RMA...
                 */
                teamCode:
                  file.name,

                /*
                 * Actualmente PlantillaFile
                 * no contiene el nombre largo.
                 *
                 * De momento usamos también
                 * el código.
                 */
                teamName:
                  file.name,

                playerId:
                  null,
              })
            );
          } catch (
            error
          ) {
            console.error(
              `Error leyendo ${file.name}:`,
              error
            );

            return [];
          }
        }
      )
    );

  /* =======================================================
     UNIR TODAS LAS PLANTILLAS
  ======================================================= */

  const allPlayers:
    GlobalEsmsPlayer[] = [];

  for (
    const roster of rosterResults
  ) {
    allPlayers.push(
      ...roster
    );
  }

  /* =======================================================
     IMPORTADOR HISTÓRICO

     Cuando estamos importando los snapshots
     no necesitamos volver a consultar IDs.
  ======================================================= */

  if (
    !includePlayerIds
  ) {
    return allPlayers;
  }

  /* =======================================================
     ASOCIAR UUID DE SUPABASE
  ======================================================= */

  try {
    const playerIdMap =
      await getPlayerIdMap();

    return allPlayers.map(
      (player) => {
        const identityKey =
          getPlayerIdentityKey(
            player.name,
            player.nat
          );

        const playerId =
          playerIdMap.get(
            identityKey
          ) ?? null;

        return {
          ...player,
          playerId,
        };
      }
    );
  } catch (
    error
  ) {
    /*
     * Si Supabase no responde,
     * no queremos romper:
     *
     * - Plantillas
     * - Buscador
     * - Creador
     *
     * Simplemente el enlace histórico
     * no estará disponible temporalmente.
     */

    console.error(
      "No se pudieron asociar los IDs históricos de los jugadores:",
      error
    );

    return allPlayers;
  }
}