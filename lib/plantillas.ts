import { getDropboxClient } from "@/lib/dropbox";

const PLANTILLAS_PATH =
  "/ESO - Evolution Soccer Online/Plantillas";

export type PlantillaFile = {
  name: string;
  filename: string;
  path: string;
  modified: string;
};

export async function getPlantillasFiles(): Promise<
  PlantillaFile[]
> {
  // Conectamos con Dropbox
  const dbx = getDropboxClient();

  // Obtenemos todos los archivos de la carpeta
  const response = await dbx.filesListFolder({
    path: PLANTILLAS_PATH,
  });

  /*
   * Nos quedamos únicamente con archivos .txt
   */
  const txtFiles = response.result.entries.filter(
    (entry) =>
      entry[".tag"] === "file" &&
      entry.name.toLowerCase().endsWith(".txt")
  );

  const plantillas: PlantillaFile[] = [];

  /*
   * Revisamos los archivos uno por uno.
   *
   * No todos los .txt de la carpeta tienen
   * necesariamente que ser plantillas ESMS.
   */
  for (const entry of txtFiles) {
    if (entry[".tag"] !== "file") {
      continue;
    }

    if (!entry.path_lower) {
      continue;
    }

    /*
     * ALL.txt contiene todos los jugadores,
     * pero no representa a un club individual.
     */
    if (entry.name.toUpperCase() === "ALL.TXT") {
      continue;
    }

    try {
      // Descargamos el archivo
      const download = await dbx.filesDownload({
        path: entry.path_lower,
      });

      /*
       * TypeScript considera fileBlob opcional.
       *
       * Comprobamos explícitamente que exista
       * antes de llamar a .text().
       */
      const fileBlob = download.result.fileBlob;

      if (!fileBlob) {
        console.warn(
          `No se pudo descargar ${entry.name}`
        );

        continue;
      }

      // Convertimos el archivo a texto
      const text = await fileBlob.text();

      /*
       * Comprobamos la cabecera para asegurarnos
       * de que realmente sea una plantilla ESMS.
       */
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
       * Guardamos la plantilla válida.
       */
      plantillas.push({
        name: entry.name.replace(/\.txt$/i, ""),
        filename: entry.name,
        path: entry.path_lower,
        modified: entry.server_modified,
      });
    } catch (error) {
      console.error(
        `Error leyendo ${entry.name}:`,
        error
      );
    }
  }

  /*
   * Ordenamos los equipos alfabéticamente.
   */
  return plantillas.sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}