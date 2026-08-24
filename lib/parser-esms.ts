export type EsmsPlayer = {
  name: string;
  age: number;
  nat: string;

  st: number;
  tk: number;
  ps: number;
  sh: number;

  ag: number;

  kab: number;
  tab: number;
  pab: number;
  sab: number;

  gam: number;
  sub: number;
  min: number;
  mom: number;

  sav: number;
  con: number;

  ktk: number;
  kps: number;
  sht: number;

  gls: number;
  ass: number;

  dp: number;
  inj: number;
  sus: number;
  fit: number;

  rawLine: string;
};

export function parseEsmsPlantilla(text: string): EsmsPlayer[] {
  const lines = text.split(/\r?\n/);
  const players: EsmsPlayer[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (
      !trimmed ||
      trimmed.startsWith("Name") ||
      trimmed.startsWith("-")
    ) {
      continue;
    }

    const parts = trimmed.split(/\s+/);

    if (parts.length < 27) {
      console.warn("Línea ESMS incompleta:", line);
      continue;
    }

    const extraNameParts = parts.length - 27;

    const nameParts = parts.slice(0, extraNameParts + 1);
    const data = parts.slice(extraNameParts + 1);

    if (data.length !== 26) {
      console.warn("Línea ESMS inválida:", line);
      continue;
    }

    const numericValues = [
      data[0],
      ...data.slice(2),
    ].map(Number);

    if (numericValues.some(Number.isNaN)) {
      console.warn("Valores ESMS inválidos:", line);
      continue;
    }

    players.push({
      name: nameParts.join(" "),

      age: Number(data[0]),
      nat: data[1],

      st: Number(data[2]),
      tk: Number(data[3]),
      ps: Number(data[4]),
      sh: Number(data[5]),

      ag: Number(data[6]),

      kab: Number(data[7]),
      tab: Number(data[8]),
      pab: Number(data[9]),
      sab: Number(data[10]),

      gam: Number(data[11]),
      sub: Number(data[12]),
      min: Number(data[13]),
      mom: Number(data[14]),

      sav: Number(data[15]),
      con: Number(data[16]),

      ktk: Number(data[17]),
      kps: Number(data[18]),
      sht: Number(data[19]),

      gls: Number(data[20]),
      ass: Number(data[21]),

      dp: Number(data[22]),
      inj: Number(data[23]),
      sus: Number(data[24]),
      fit: Number(data[25]),

      rawLine: line,
    });
  }

  return players;
}