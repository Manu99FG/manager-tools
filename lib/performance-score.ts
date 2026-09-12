export type EsmsHistoryPosition = "GK" | "DF" | "DM" | "MF" | "AM" | "FW";

export type PositionPerformanceInput = {
  position: EsmsHistoryPosition;
  saves: number;
  conceded: number;
  minutes: number;
  discipline: number;
  tackles: number;
  keyPasses: number;
  assists: number;
  goals: number;
  shots: number;
};

export function getPositionPerformanceScore(
  input: PositionPerformanceInput
): number {
  const {
    position,
    saves,
    conceded,
    minutes,
    discipline,
    tackles,
    keyPasses,
    assists,
    goals,
    shots,
  } = input;

  switch (position) {
    case "GK":
      return 6 * saves - 5 * conceded + 0.2 * minutes - 1 * discipline;

    case "DF":
      return (
        4 * tackles +
        2 * keyPasses +
        2 * assists +
        3 * goals +
        1 * shots -
        1.5 * discipline
      );

    case "DM":
      return (
        4 * tackles +
        3 * keyPasses +
        2 * assists +
        1.5 * shots +
        1 * goals -
        1.5 * discipline
      );

    case "MF":
      return (
        4 * keyPasses +
        3 * assists +
        2 * shots +
        2 * goals -
        1 * discipline
      );

    case "AM":
      return (
        5 * goals +
        4 * assists +
        2 * shots +
        2 * keyPasses -
        1 * discipline
      );

    case "FW":
      return (
        6 * goals +
        3 * shots +
        2 * assists +
        1 * keyPasses -
        1 * discipline
      );
  }
}

export type PositionSeasonScore = {
  playerId: string;
  seasonId: string;
  position: EsmsHistoryPosition;
  rawScore: number;
  normalizedIndex: number;
  zScore: number;
  percentile: number;
};

export function normalizeScoresByPositionAndSeason<
  T extends {
    playerId: string;
    seasonId: string;
    position: EsmsHistoryPosition;
    rawScore: number;
  },
>(rows: T[]): Array<T & PositionSeasonScore> {
  const groups = new Map<string, T[]>();

  for (const row of rows) {
    const key = `${row.seasonId}::${row.position}`;
    const current = groups.get(key) ?? [];
    current.push(row);
    groups.set(key, current);
  }

  const output: Array<T & PositionSeasonScore> = [];

  for (const group of groups.values()) {
    const values = group.map((row) => row.rawScore);
    const mean =
      values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);

    const variance =
      values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
      Math.max(1, values.length);

    const stdDev = Math.sqrt(variance);

    const sorted = [...group].sort(
      (a, b) => a.rawScore - b.rawScore || a.playerId.localeCompare(b.playerId)
    );

    for (const row of group) {
      const zScore = stdDev > 0 ? (row.rawScore - mean) / stdDev : 0;

      const rank =
        sorted.findIndex(
          (candidate) =>
            candidate.playerId === row.playerId &&
            candidate.rawScore === row.rawScore
        ) + 1;

      const percentile =
        sorted.length <= 1
          ? 50
          : ((rank - 1) / (sorted.length - 1)) * 100;

      // Centro alrededor de 50.
      // +1 desviación ≈ 60, +2 ≈ 70, +3 ≈ 80.
      // Para premiar auténticos outliers sin disparar el índice,
      // añadimos un componente pequeño de percentil.
      const normalized =
        50 +
        10 * zScore +
        Math.max(0, percentile - 50) * 0.2;

      output.push({
        ...row,
        zScore: round(zScore, 3),
        percentile: round(percentile, 1),
        normalizedIndex: round(clamp(normalized, 20, 100), 1),
      });
    }
  }

  return output;
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
