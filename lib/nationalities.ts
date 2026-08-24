const NATIONALITY_TO_COUNTRY: Record<string, string> = {
  // EUROPA
  esp: "es",
  fra: "fr",
  ita: "it",
  ger: "de",
  deu: "de",
  ing: "gb",
  eng: "gb",
  por: "pt",
  ned: "nl",
  hol: "nl",
  bel: "be",
  cro: "hr",
  ser: "rs",
  slo: "si",
  svk: "sk",
  cze: "cz",
  pol: "pl",
  aut: "at",
  sui: "ch",
  den: "dk",
  swe: "se",
  nor: "no",
  fin: "fi",
  isl: "is",
  irl: "ie",
  nir: "gb-nir",
  sco: "gb-sct",
  wal: "gb-wls",
  rus: "ru",
  ukr: "ua",
  geo: "ge",
  arm: "am",
  tur: "tr",
  gre: "gr",
  rou: "ro",
  bul: "bg",
  hun: "hu",
  alb: "al",
  bih: "ba",
  bos: "ba",
  mkd: "mk",
  mne: "me",
  kos: "xk",
  lux: "lu",
  lie: "li",
  mlt: "mt",
  cyp: "cy",
  est: "ee",
  lat: "lv",
  ltu: "lt",
  blr: "by",
  mol: "md",
  svn: "si",

  // SUDAMÉRICA
  bra: "br",
  arg: "ar",
  uru: "uy",
  par: "py",
  chi: "cl",
  chl: "cl",
  col: "co",
  ecu: "ec",
  per: "pe",
  ven: "ve",
  bol: "bo",

  // NORTE / CENTROAMÉRICA
  mex: "mx",
  usa: "us",
  can: "ca",
  crc: "cr",
  pan: "pa",
  hon: "hn",
  jam: "jm",
  cub: "cu",
  dom: "do",
  hai: "ht",
  slv: "sv",
  gua: "gt",
  nic: "ni",
  tri: "tt",

  // ÁFRICA
  mar: "ma",
  caf: "cf", // República Centroafricana
  alg: "dz",
  tun: "tn",
  egy: "eg",
  sen: "sn",
  civ: "ci",
  gha: "gh",
  nga: "ng",
  cam: "cm",
  cmr: "cm",
  mal: "ml",
  gui: "gn",
  gab: "ga",
  con: "cg",
  cod: "cd",
  rsa: "za",
  zaf: "za",
  ang: "ao",
  moz: "mz",
  zmb: "zm",
  zim: "zw",
  tog: "tg",
  ben: "bj",
  bfa: "bf",
  bur: "bf",
  gam: "gm",
  ken: "ke",
  tan: "tz",
  uga: "ug",
  eth: "et",
  sud: "sd",
  lib: "ly",
  sle: "sl",

  // ASIA
  jap: "jp",
  jpn: "jp",
  kor: "kr",
  krs: "kr",
  chn: "cn",
  iran: "ir",
  irn: "ir",
  irq: "iq",
  sau: "sa",
  qat: "qa",
  uae: "ae",
  ind: "in",
  tha: "th",
  vie: "vn",
  mas: "my",
  sin: "sg",
  phi: "ph",
  pak: "pk",
  uzb: "uz",
  kaz: "kz",
  syr: "sy",
  jor: "jo",
  liba: "lb",
  isr: "il",

  // OCEANÍA
  aus: "au",
  nzl: "nz",
};

export function getCountryCode(
  nationality: string
): string | null {
  const normalizedNationality =
    nationality.trim().toLowerCase();

  return (
    NATIONALITY_TO_COUNTRY[
      normalizedNationality
    ] ?? null
  );
}

export function getFlagUrl(
  nationality: string
): string | null {
  const countryCode =
    getCountryCode(nationality);

  if (!countryCode) {
    return null;
  }

  return `https://flagcdn.com/24x18/${countryCode}.png`;
}