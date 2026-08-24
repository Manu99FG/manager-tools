const NATIONALITY_TO_COUNTRY: Record<string, string> = {
  esp: "ES",
  fra: "FR",
  ita: "IT",
  ger: "DE",
  ing: "GB",
  por: "PT",
  ned: "NL",
  bel: "BE",
  bra: "BR",
  arg: "AR",
  uru: "UY",
  par: "PY",
  chi: "CL",
  col: "CO",
  ecu: "EC",
  per: "PE",
  ven: "VE",
  mex: "MX",
  usa: "US",
  can: "CA",

  cro: "HR",
  ser: "RS",
  slo: "SI",
  svk: "SK",
  cze: "CZ",
  pol: "PL",
  aut: "AT",
  sui: "CH",
  den: "DK",
  swe: "SE",
  nor: "NO",
  fin: "FI",
  isl: "IS",
  irl: "IE",
  sco: "GB",
  wal: "GB",

  rus: "RU",
  ukr: "UA",
  geo: "GE",
  arm: "AM",
  tur: "TR",
  gre: "GR",
  rou: "RO",
  bul: "BG",
  hun: "HU",

  mar: "MA",
  alg: "DZ",
  tun: "TN",
  egy: "EG",
  sen: "SN",
  civ: "CI",
  gha: "GH",
  nga: "NG",
  cam: "CM",
  mal: "ML",
  gui: "GN",
  gab: "GA",
  con: "CG",
  cod: "CD",

  jap: "JP",
  kor: "KR",
  chn: "CN",
  aus: "AU",
  nzl: "NZ",
  iran: "IR",
  irq: "IQ",
  sau: "SA",
  qat: "QA",
  uae: "AE",

  crc: "CR",
  pan: "PA",
  hon: "HN",
  jam: "JM",
  cub: "CU",
  dom: "DO",
};

export function getCountryCode(
  nationality: string
): string | null {
  return (
    NATIONALITY_TO_COUNTRY[
      nationality.toLowerCase()
    ] ?? null
  );
}

export function countryCodeToFlag(
  countryCode: string
): string {
  return countryCode
    .toUpperCase()
    .replace(
      /./g,
      (char) =>
        String.fromCodePoint(
          127397 + char.charCodeAt(0)
        )
    );
}

export function getNationalityFlag(
  nationality: string
): string {
  const countryCode =
    getCountryCode(nationality);

  if (!countryCode) {
    return "🏳️";
  }

  return countryCodeToFlag(countryCode);
}