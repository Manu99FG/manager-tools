import { getDropboxClient } from "@/lib/dropbox";

const PLANTILLAS_PATH =
  "/ESO - Evolution Soccer Online/Plantillas";

const VALID_TEAM_CODES = new Set([
  "AJA",
  "ARS",
  "ATM",
  "BDO",
  "BLE",
  "BMU",
  "BOC",
  "CEL",
  "CHE",
  "DEP",
  "FCB",
  "FLA",
  "IND",
  "INT",
  "JUV",
  "LIV",
  "MAR",
  "MCI",
  "MIL",
  "MUN",
  "NAP",
  "OPO",
  "PAR",
  "PSG",
  "PSV",
  "RIV",
]);

export type PlantillaFile = {
  name: string;
  filename: string;
  path: string;
  modified: string;
};

export async function getPlantillasFiles(): Promise<
  PlantillaFile[]
> {
  const dbx = getDropboxClient();

  /*
   * Solo listamos la carpeta.
   *
   * No descargamos las 26 plantillas.
   */
  const response = await dbx.filesListFolder({
    path: PLANTILLAS_PATH,
  });

  const plantillas: PlantillaFile[] = [];

  for (const entry of response.result.entries) {
    if (entry[".tag"] !== "file") {
      continue;
    }

    if (!entry.path_lower) {
      continue;
    }

    if (!entry.name.toLowerCase().endsWith(".txt")) {
      continue;
    }

    const code = entry.name
      .replace(/\.txt$/i, "")
      .toUpperCase();

    /*
     * Solo aceptamos códigos oficiales.
     *
     * Así ignoramos automáticamente:
     * ALL.txt
     * SALARIOS.txt
     * Potenciales.txt
     * etc.
     */
    if (!VALID_TEAM_CODES.has(code)) {
      continue;
    }

    plantillas.push({
      name: code,
      filename: entry.name,
      path: entry.path_lower,
      modified: entry.server_modified,
    });
  }

  return plantillas.sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}