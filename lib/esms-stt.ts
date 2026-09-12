export type SttPlayer = {
  name: string;

  participated: number;
  cameOnAsSub: number;
  minutes: number;
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

  kabDelta: number;
  tabDelta: number;
  pabDelta: number;
  sabDelta: number;

  reservedValue: number;
  fit: number;
};

export type SttTeam = {
  teamCode: string;
  goals: number;
  players: SttPlayer[];
};

export type ParsedSttMatch = {
  home: SttTeam;
  away: SttTeam;
};

const PLAYER_FIELD_COUNT = 19;

function isIntegerToken(
  value: string
) {
  return /^-?\d+$/.test(
    value
  );
}

function parseHeader(
  line: string
): {
  teamCode: string;
  goals: number;
} | null {
  const parts =
    line
      .trim()
      .split(/\s+/);

  if (
    parts.length !== 2 ||
    !isIntegerToken(
      parts[1]
    )
  ) {
    return null;
  }

  // Una línea de jugador tiene nombre + 19 números.
  // Una cabecera real tiene únicamente:
  // CODIGO_EQUIPO GOLES
  return {
    teamCode:
      parts[0].toUpperCase(),
    goals:
      Number(
        parts[1]
      ),
  };
}

function parsePlayerLine(
  line: string
): SttPlayer {
  const parts =
    line
      .trim()
      .split(/\s+/);

  if (
    parts.length !==
    PLAYER_FIELD_COUNT +
      1
  ) {
    throw new Error(
      `Línea .stt inválida: se esperaban 19 campos numéricos después del jugador y se encontraron ${Math.max(
        0,
        parts.length - 1
      )}.\n${line}`
    );
  }

  const name =
    parts[0];

  const numericTokens =
    parts.slice(1);

  if (
    !numericTokens.every(
      isIntegerToken
    )
  ) {
    throw new Error(
      `Línea .stt inválida para ${name}: hay campos que no son enteros.\n${line}`
    );
  }

  const values =
    numericTokens.map(
      Number
    );

  return {
    name,

    participated:
      values[0],
    cameOnAsSub:
      values[1],
    minutes:
      values[2],
    mom:
      values[3],

    sav:
      values[4],
    con:
      values[5],
    ktk:
      values[6],
    kps:
      values[7],
    sht:
      values[8],
    gls:
      values[9],
    ass:
      values[10],

    dp:
      values[11],
    inj:
      values[12],

    kabDelta:
      values[13],
    tabDelta:
      values[14],
    pabDelta:
      values[15],
    sabDelta:
      values[16],

    reservedValue:
      values[17],
    fit:
      values[18],
  };
}

export function parseSttMatch(
  text: string
): ParsedSttMatch {
  const lines =
    text
      .replace(/\r/g, "")
      .split("\n")
      .map(
        (
          line
        ) => line.trim()
      )
      .filter(
        Boolean
      );

  if (
    lines.length < 4
  ) {
    throw new Error(
      "El archivo .stt está vacío o incompleto."
    );
  }

  const teams:
    SttTeam[] = [];

  let currentTeam:
    SttTeam | null =
      null;

  for (
    const line of lines
  ) {
    const header =
      parseHeader(
        line
      );

    if (header) {
      currentTeam = {
        ...header,
        players: [],
      };

      teams.push(
        currentTeam
      );

      continue;
    }

    if (
      !currentTeam
    ) {
      throw new Error(
        `Se encontró una línea de jugador antes de la primera cabecera:\n${line}`
      );
    }

    currentTeam.players.push(
      parsePlayerLine(
        line
      )
    );
  }

  if (
    teams.length !== 2
  ) {
    throw new Error(
      `Un .stt de partido debe contener exactamente 2 equipos. Se detectaron ${teams.length}.`
    );
  }

  if (
    teams[0].players.length ===
      0 ||
    teams[1].players.length ===
      0
  ) {
    throw new Error(
      "Uno de los equipos no contiene jugadores."
    );
  }

  return {
    home:
      teams[0],
    away:
      teams[1],
  };
}

export function validateSttTeams(
  parsed:
    ParsedSttMatch,
  expectedHome:
    string,
  expectedAway:
    string
) {
  const home =
    expectedHome.toUpperCase();

  const away =
    expectedAway.toUpperCase();

  if (
    parsed.home.teamCode !==
      home ||
    parsed.away.teamCode !==
      away
  ) {
    throw new Error(
      [
        "Los equipos del .stt no coinciden con el partido seleccionado.",
        `Partido esperado: ${home} - ${away}.`,
        `Archivo .stt: ${parsed.home.teamCode} - ${parsed.away.teamCode}.`,
      ].join(" ")
    );
  }
}
