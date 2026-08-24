import { getDropboxClient } from "@/lib/dropbox";

const PLANTILLAS_PATH =
  "/ESO - Evolution Soccer Online/Plantillas";

export type PlantillaFile = {
  name: string;
  filename: string;
  path: string;
  modified: string;
};

export async function getPlantillasFiles(): Promise<PlantillaFile[]> {
  const dbx = getDropboxClient();

  const response = await dbx.filesListFolder({
    path: PLANTILLAS_PATH,
  });

  const txtFiles = response.result.entries.filter(
    (entry) =>
      entry[".tag"] === "file" &&
      entry.name.toLowerCase().endsWith(".txt")
  );

  const plantillas: PlantillaFile[] = [];

  for (const entry of txtFiles) {
    if (entry[".tag"] !== "file") {
      continue;
    }

    if (!entry.path_lower) {
      continue;
    }

    try {
      const download = await dbx.filesDownload({
        path: entry.path_lower,
      });

      const text =
        await download.result.fileBlob.text();

      const firstLine =
        text.split(/\r?\n/)[0]?.trim() ?? "";

      const isPlantilla =
        firstLine.includes("Name") &&
        firstLine.includes("Age") &&
        firstLine.includes("Nat") &&
        firstLine.includes("St") &&
        firstLine.includes("Tk") &&
        firstLine.includes("Ps") &&
        firstLine.includes("Sh") &&
        firstLine.includes("KAb") &&
        firstLine.includes("Fit");

      if (!isPlantilla) {
        continue;
      }

      /*
       * ALL.txt contiene todos los jugadores,
       * pero no representa un club.
       */
      if (entry.name.toUpperCase() === "ALL.TXT") {
        continue;
      }

      plantillas.push({
        name: entry.name.replace(/\.txt$/i, ""),
        filename: entry.name,
        path: entry.path_lower,
        modified: entry.server_modified,
      });
    } catch (error) {
      console.error(
        `Error leyendo ${entry.name}`,
        error
      );
    }
  }

  return plantillas.sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}