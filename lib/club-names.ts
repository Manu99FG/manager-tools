export const CLUB_NAMES: Record<string, string> = {
  // España
  RMA: "Real Madrid CF",
  BAR: "FC Barcelona",
  ATM: "Atlético de Madrid",
  BET: "Real Betis",
  CEL: "RC Celta de Vigo",
  SEV: "Sevilla FC",
  VAL: "Valencia CF",
  VIL: "Villarreal CF",
  ATH: "Athletic Club",
  RSO: "Real Sociedad",

  // Inglaterra
  ARS: "Arsenal FC",
  CHE: "Chelsea FC",
  LIV: "Liverpool FC",
  MCI: "Manchester City FC",
  MUN: "Manchester United FC",
  TOT: "Tottenham Hotspur FC",
  NEW: "Newcastle United FC",

  // Alemania
  BMU: "FC Bayern Munich",
  BDO: "Borussia Dortmund",
  BLE: "RB Leipzig",
  LEV: "Bayer 04 Leverkusen",

  // Italia
  INT: "Inter Milan",
  JUV: "Juventus FC",
  MIL: "AC Milan",
  NAP: "SSC Napoli",
  ROM: "AS Roma",
  LAZ: "SS Lazio",

  // Francia
  PSG: "Paris Saint-Germain FC",
  MON: "AS Monaco FC",
  LYO: "Olympique Lyonnais",
  MAR: "Olympique de Marseille",
};

export function getClubName(code: string) {
  return CLUB_NAMES[code.toUpperCase()] ?? code.toUpperCase();
}