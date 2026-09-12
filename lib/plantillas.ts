import { getDropboxClient, getDropboxPlantillasFolder } from "@/lib/dropbox";

export type PlantillaFile = {
  name: string;
  filename: string;
  path: string;
  modified: string;
};

export async function getPlantillasFiles(): Promise<
  PlantillaFile[]
> {
  const dbx = await getDropboxClient();
  const plantillasPath = await getDropboxPlantillasFolder("live");

  /*
   * Solo listamos la carpeta.
   *
   * No descargamos las 26 plantillas.
   */
  const response = await dbx.filesListFolder({
    path: plantillasPath,
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
     * Aceptamos códigos ESMS de cualquier instalación.
     * Solo descartamos ficheros auxiliares conocidos.
     */
    if (
      !/^[A-Z0-9_-]{2,12}$/.test(code) ||
      ["ALL", "SALARIOS", "POTENCIALES"].includes(code)
    ) {
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