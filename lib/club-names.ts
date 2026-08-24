export const CLUB_NAMES: Record<string, string> = {
  AJA: "Ajax",
  ARS: "Arsenal",
  ATM: "Atlético de Madrid",
  BDO: "Borussia Dortmund",
  BLE: "Bayer 04 Leverkusen",
  BMU: "Bayern Munich",
  BOC: "Boca Juniors",
  CEL: "Celta de Vigo",
  CHE: "Chelsea",
  DEP: "Deportivo La Coruña",
  FCB: "FC Barcelona",
  FLA: "Flamengo",
  IND: "Club Atlético Independiente",
  INT: "Inter de Milán",
  JUV: "Juventus de Turín",
  LIV: "Liverpool",
  MAR: "Olympique de Marseille",
  MCI: "Manchester City",
  MIL: "AC Milan",
  MUN: "Manchester United",
  NAP: "SSC Napoli",
  OPO: "FC Porto",
  PAR: "Parma FC",
  PSG: "Paris Saint-Germain",
  PSV: "PSV Eindhoven",
  RIV: "River Plate",
  RMA: "Real Madrid",
};

export function getClubName(code: string): string {
  const normalizedCode = code.toUpperCase();

  return CLUB_NAMES[normalizedCode] ?? normalizedCode;
}